using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Services;

public interface IActivitySuggestionService
{
    /// <summary>
    /// Apply mapping rules (and optionally AI) to compute suggestions for the given activity event.
    /// Modifies the event's suggestion fields in-place; caller is responsible for saving.
    /// </summary>
    Task ApplySuggestionsAsync(ActivityEvent evt, CancellationToken ct = default);

    /// <summary>
    /// Re-evaluate suggestions for all Pending events for a user.
    /// </summary>
    Task RefreshSuggestionsForUserAsync(int userId, CancellationToken ct = default);
}

public class ActivitySuggestionService : IActivitySuggestionService
{
    private readonly TimekeeperContext _db;
    private readonly IAiService _aiService;
    private readonly ILogger<ActivitySuggestionService> _logger;

    public ActivitySuggestionService(
        TimekeeperContext db,
        IAiService aiService,
        ILogger<ActivitySuggestionService> logger)
    {
        _db = db;
        _aiService = aiService;
        _logger = logger;
    }

    public async Task ApplySuggestionsAsync(ActivityEvent evt, CancellationToken ct = default)
    {
        var rules = await _db.ActivityMappingRules
            .Where(r => r.UserId == evt.UserId && r.IsActive)
            .OrderBy(r => r.Priority)
            .Include(r => r.MappedCustomer)
            .Include(r => r.MappedProject)
            .Include(r => r.MappedTask)
            .ToListAsync(ct);

        foreach (var rule in rules)
        {
            var fieldValue = ExtractFieldValue(evt, rule.MatchField);
            if (string.IsNullOrWhiteSpace(fieldValue)) continue;

            if (MatchesRule(fieldValue, rule.MatchOperator, rule.MatchValue))
            {
                evt.SuggestedCustomerId = rule.MappedCustomerId;
                evt.SuggestedProjectId = rule.MappedProjectId;
                evt.SuggestedTaskId = rule.MappedTaskId;
                evt.Confidence = "rule-based";
                _logger.LogDebug("Matched mapping rule {RuleId} for event {EventId}.", rule.Id, evt.Id);
                return;
            }
        }

        // Fallback 1: for commits, inherit suggestion from a linked work item referenced by #ID in title
        if (await TryLinkedWorkItemSuggestionAsync(evt, ct)) return;

        // Fallback 2: match ADO project name tokens directly against DB project names → best discriminator
        if (await TryAdoProjectNameSuggestionAsync(evt, ct)) return;

        // Fallback 3: inherit from another event in the SAME org + SAME project (safe, same context)
        if (await TryRelatedOrgSuggestionAsync(evt, ct)) return;

        // Fallback 4: connector display-name label → customer (broader net when project name doesn't match)
        if (await TryConnectorLabelSuggestionAsync(evt, ct)) return;

        // Fallback 5: AI suggestion if configured
        await TryAiSuggestionAsync(evt, ct);
    }

    public async Task RefreshSuggestionsForUserAsync(int userId, CancellationToken ct = default)
    {
        var pending = await _db.ActivityEvents
            .Where(e => e.UserId == userId && e.SuggestionState == SuggestionState.Pending)
            .ToListAsync(ct);

        foreach (var evt in pending)
        {
            await ApplySuggestionsAsync(evt, ct);
        }

        await _db.SaveChangesAsync(ct);
    }

    private static string? ExtractFieldValue(ActivityEvent evt, MatchField field)
    {
        // Metadata keys for structured fields
        return field switch
        {
            MatchField.Subject => evt.Title,
            MatchField.Organizer => TryGetMeta(evt, "organizerEmail"),
            MatchField.EmailDomain => ExtractDomain(TryGetMeta(evt, "organizerEmail")),
            MatchField.CalendarCategory => TryGetMeta(evt, "category"),
            MatchField.AdoProject => TryGetMeta(evt, "adoProject"),
            MatchField.RepoName => TryGetMeta(evt, "repoName"),
            MatchField.Attendee => TryGetMeta(evt, "attendees"), // comma-separated list
            MatchField.AdoOrganization => TryGetMeta(evt, "adoOrganization"),
            _ => null
        };
    }

    private static string? TryGetMeta(ActivityEvent evt, string key)
    {
        if (string.IsNullOrWhiteSpace(evt.MetadataJson)) return null;
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(evt.MetadataJson);
            return doc.RootElement.TryGetProperty(key, out var val) ? val.GetString() : null;
        }
        catch { return null; }
    }

    private static string? ExtractDomain(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;
        var atIdx = email.IndexOf('@');
        return atIdx >= 0 ? email[(atIdx + 1)..] : null;
    }

    /// <summary>Split a string into meaningful words for keyword matching (strips short/common words).</summary>
    private static HashSet<string> TokenizeForMatch(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return [];
        var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "with", "by", "die", "der", "des", "den", "dem", "und", "oder", "von", "für", "mit" };
        return [..Regex.Split(text, @"[\s\-_/\\.:,;\(\)]+")
            .Where(w => w.Length >= 3 && !stopWords.Contains(w))];
    }

    private static bool MatchesRule(string fieldValue, MatchOperator op, string matchValue)
    {
        return op switch
        {
            MatchOperator.Contains => fieldValue.Contains(matchValue, StringComparison.OrdinalIgnoreCase),
            MatchOperator.Equals => string.Equals(fieldValue, matchValue, StringComparison.OrdinalIgnoreCase),
            MatchOperator.StartsWith => fieldValue.StartsWith(matchValue, StringComparison.OrdinalIgnoreCase),
            MatchOperator.EndsWith => fieldValue.EndsWith(matchValue, StringComparison.OrdinalIgnoreCase),
            MatchOperator.Regex => Regex.IsMatch(fieldValue, matchValue, RegexOptions.IgnoreCase),
            _ => false
        };
    }

    /// <summary>
    /// If the commit title contains #NNNN and a work item with that external ID already has a suggestion, copy it.
    /// </summary>
    private async Task<bool> TryLinkedWorkItemSuggestionAsync(ActivityEvent evt, CancellationToken ct)
    {
        if (evt.Source != ActivitySource.AzureDevOpsCommit) return false;

        var matches = Regex.Matches(evt.Title, @"#(\d+)");
        if (matches.Count == 0) return false;

        var ids = matches.Select(m => m.Groups[1].Value).Distinct().ToList();

        var linkedItem = await _db.ActivityEvents
            .Where(e => e.UserId == evt.UserId
                && e.Source == ActivitySource.AzureDevOpsWorkItem
                && ids.Contains(e.ExternalId)
                && e.SuggestedTaskId != null)
            .FirstOrDefaultAsync(ct);

        if (linkedItem == null) return false;

        evt.SuggestedCustomerId = linkedItem.SuggestedCustomerId;
        evt.SuggestedProjectId  = linkedItem.SuggestedProjectId;
        evt.SuggestedTaskId     = linkedItem.SuggestedTaskId;
        evt.Confidence          = linkedItem.Confidence ?? "rule-based";
        _logger.LogDebug("Linked work item {ItemId} suggestion copied to commit event {EventId}.", linkedItem.ExternalId, evt.Id);
        return true;
    }

    /// <summary>
    /// Match the ADO project name tokens against DB project names to identify customer + best task.
    /// E.g. ADO project "STW-5076-MASBC" → DB project "STW / Schäfer Trennwandsysteme - 5076 - MASBC: TM".
    /// This is the strongest discriminator when multiple customers share the same ADO organization.
    /// </summary>
    private async Task<bool> TryAdoProjectNameSuggestionAsync(ActivityEvent evt, CancellationToken ct)
    {
        var adoProject = TryGetMeta(evt, "adoProject");
        if (string.IsNullOrWhiteSpace(adoProject)) return false;

        var adoTokens = TokenizeForMatch(adoProject);
        if (adoTokens.Count == 0) return false;

        var dbProjects = await _db.Projects
            .IgnoreQueryFilters()
            .Where(p => p.IsActive)
            .ToListAsync(ct);

        // Score each DB project by token overlap with the ADO project name
        var scoredProjects = dbProjects
            .Select(p =>
            {
                var projTokens = TokenizeForMatch(p.Name);
                var overlap = projTokens.Intersect(adoTokens, StringComparer.OrdinalIgnoreCase).Count();
                return (Project: p, Score: overlap * 20);
            })
            .Where(x => x.Score >= 20) // at least one meaningful token match
            .OrderByDescending(x => x.Score)
            .ToList();

        if (scoredProjects.Count == 0) return false;

        // Require the winner to clearly lead — avoid guessing when two projects score equally
        var top = scoredProjects[0];
        if (scoredProjects.Count > 1 && top.Score == scoredProjects[1].Score) return false;

        var matchedProject = top.Project;

        // Now pick the best task within that project using event title keywords
        var titleWords = TokenizeForMatch(evt.Title);
        var candidateTasks = await _db.Tasks
            .IgnoreQueryFilters()
            .Where(t => t.IsActive && t.ProjectId == matchedProject.Id)
            .ToListAsync(ct);

        evt.SuggestedCustomerId = matchedProject.CustomerId;
        evt.SuggestedProjectId  = matchedProject.Id;

        if (candidateTasks.Count > 0)
        {
            var bestTask = candidateTasks
                .Select(t =>
                {
                    var taskWords = TokenizeForMatch(t.Name);
                    var overlap = taskWords.Intersect(titleWords, StringComparer.OrdinalIgnoreCase).Count();
                    return (Task: t, Score: overlap * 15);
                })
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Task.Id)
                .First();

            evt.SuggestedTaskId = bestTask.Task.Id;

            // Confidence based on how well we matched
            evt.Confidence = top.Score >= 60 ? "exact"
                           : top.Score >= 40 ? "rule-based"
                           : "likely";
        }
        else
        {
            evt.Confidence = "likely";
        }

        _logger.LogDebug(
            "ADO project '{AdoProject}' matched DB project '{DbProject}' (score: {Score}) for event {EventId}.",
            adoProject, matchedProject.Name, top.Score, evt.Id);
        return true;
    }

    /// <summary>
    /// If no suggestion was found, look for another ADO event from the same organization AND same project
    /// that already has a suggested customer. Cross-project inheritance is intentionally skipped to
    /// avoid inheriting the wrong customer when multiple customers share an ADO organization.
    /// </summary>
    private async Task<bool> TryRelatedOrgSuggestionAsync(ActivityEvent evt, CancellationToken ct)
    {
        var adoOrg = TryGetMeta(evt, "adoOrganization");
        if (string.IsNullOrWhiteSpace(adoOrg)) return false;

        var evtProject = TryGetMeta(evt, "adoProject");

        var candidateEvents = await _db.ActivityEvents
            .Where(e => e.UserId == evt.UserId
                && e.Id != evt.Id
                && e.SuggestedCustomerId != null
                && (e.Source == ActivitySource.AzureDevOpsWorkItem || e.Source == ActivitySource.AzureDevOpsCommit))
            .ToListAsync(ct);

        // Only inherit from an event in the same org AND same project to avoid cross-customer contamination
        var match = candidateEvents.FirstOrDefault(e =>
            string.Equals(TryGetMeta(e, "adoOrganization"), adoOrg, StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(evtProject)
            && string.Equals(TryGetMeta(e, "adoProject"), evtProject, StringComparison.OrdinalIgnoreCase));

        if (match == null) return false;

        evt.SuggestedCustomerId = match.SuggestedCustomerId;
        evt.SuggestedProjectId  = match.SuggestedProjectId;
        evt.SuggestedTaskId     = match.SuggestedTaskId;
        evt.Confidence          = match.Confidence ?? "rule-based";

        _logger.LogDebug("Inherited suggestion from org '{Org}' project '{Project}' to event {EventId}.",
            adoOrg, evtProject, evt.Id);
        return true;
    }

    private async Task TryAiSuggestionAsync(ActivityEvent evt, CancellationToken ct)
    {
        if (!await _aiService.IsEnabledForWorkspaceAsync(evt.WorkspaceId, ct)) return;

        // Get user's preferred notes language for polishing
        var prefs = await _db.UserActivityPreferences
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.UserId == evt.UserId, ct);
        var language = string.IsNullOrWhiteSpace(prefs?.NotesLanguage) ? "en" : prefs.NotesLanguage;

        try
        {
            var result = await _aiService.ResolveTaskAsync(evt.Title, evt.WorkspaceId, ct);
            if (result?.Found == true)
            {
                evt.SuggestedTaskId = result.TaskId;
                evt.Confidence = "ai";

                // Polish the note in the user's language using AI
                var rawNote = !string.IsNullOrWhiteSpace(evt.SuggestedNotes) ? evt.SuggestedNotes : evt.Title;
                var polished = await _aiService.PolishNoteAsync(
                    rawNote, result.TaskName, result.ProjectName, result.CustomerName, language, evt.WorkspaceId, ct);
                if (!string.IsNullOrWhiteSpace(polished))
                    evt.SuggestedNotes = polished;

                _logger.LogDebug("AI resolved task for event {EventId}: {TaskName}", evt.Id, result.TaskName);
            }
            else if (language != "en" && !string.IsNullOrWhiteSpace(evt.SuggestedNotes))
            {
                // No task match, but polish the existing note into the user's language
                var polished = await _aiService.PolishNoteAsync(
                    evt.SuggestedNotes, null, null, null, language, evt.WorkspaceId, ct);
                if (!string.IsNullOrWhiteSpace(polished))
                    evt.SuggestedNotes = polished;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI suggestion failed for event {EventId}.", evt.Id);
        }
    }

    /// <summary>
    /// Match the ADO connector's DisplayName against customers.
    /// E.g. connector labeled "Nobilis" → find customer "NOBILIS GmbH" and suggest tasks under it.
    /// </summary>
    private async Task<bool> TryConnectorLabelSuggestionAsync(ActivityEvent evt, CancellationToken ct)
    {
        var adoOrg = TryGetMeta(evt, "adoOrganization");
        if (string.IsNullOrWhiteSpace(adoOrg)) return false;

        // Find ADO connectors for this user that have a DisplayName and include this org
        var connectors = await _db.UserIntegrations
            .IgnoreQueryFilters()
            .Where(i => i.UserId == evt.UserId
                && i.Provider == IntegrationProvider.AzureDevOps
                && i.IsActive
                && i.DisplayName != null)
            .ToListAsync(ct);

        // Pick the connector whose stored orgs list includes adoOrg
        var connector = connectors.FirstOrDefault(c =>
            !string.IsNullOrWhiteSpace(c.RefreshToken) &&
            c.RefreshToken
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(org => string.Equals(org, adoOrg, StringComparison.OrdinalIgnoreCase)));

        if (connector?.DisplayName == null) return false;

        var label = connector.DisplayName.Trim();

        // Fuzzy-match label against customer names
        var customers = await _db.Customers
            .IgnoreQueryFilters()
            .Where(c => c.IsActive)
            .ToListAsync(ct);

        var matched = customers.FirstOrDefault(c =>
            c.Name.Contains(label, StringComparison.OrdinalIgnoreCase) ||
            label.Contains(c.Name, StringComparison.OrdinalIgnoreCase));

        if (matched == null) return false;

        evt.SuggestedCustomerId = matched.Id;

        // Score tasks under this customer against adoProject name + event title keywords
        var adoProject = TryGetMeta(evt, "adoProject");
        var candidateTasks = await _db.Tasks
            .IgnoreQueryFilters()
            .Include(t => t.Project)
            .Where(t => t.IsActive && t.Project.CustomerId == matched.Id)
            .ToListAsync(ct);

        if (candidateTasks.Count > 0)
        {
            var titleWords = TokenizeForMatch(evt.Title);

            var scored = candidateTasks.Select(t =>
            {
                int score = 0;

                // Project name match against ADO project
                if (!string.IsNullOrWhiteSpace(adoProject))
                {
                    if (string.Equals(t.Project.Name, adoProject, StringComparison.OrdinalIgnoreCase))
                        score += 100; // exact project match
                    else if (t.Project.Name.Contains(adoProject, StringComparison.OrdinalIgnoreCase)
                          || adoProject.Contains(t.Project.Name, StringComparison.OrdinalIgnoreCase))
                        score += 60;  // partial project match
                }

                // Task name keywords matching event title words
                var taskWords = TokenizeForMatch(t.Name);
                var commonWords = titleWords.Intersect(taskWords, StringComparer.OrdinalIgnoreCase).Count();
                score += commonWords * 15;

                // Project name keywords matching event title
                var projWords = TokenizeForMatch(t.Project.Name);
                score += projWords.Intersect(titleWords, StringComparer.OrdinalIgnoreCase).Count() * 8;

                return (Task: t, Score: score);
            })
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Task.Id)
            .ToList();

            var best = scored[0];
            evt.SuggestedProjectId = best.Task.ProjectId;
            evt.SuggestedTaskId = best.Task.Id;

            // Set confidence based on how good the match is
            evt.Confidence = best.Score >= 100 ? "exact"
                           : best.Score >= 60  ? "rule-based"
                           : best.Score >= 15  ? "likely"
                           : "uncertain";
        }
        else
        {
            // Customer matched but no tasks to pick from
            evt.Confidence = "likely";
        }

        _logger.LogDebug("Connector label '{Label}' matched customer '{Customer}' (score: {Score}) for event {EventId}.",
            label, matched.Name, candidateTasks.Count > 0 ? "scored" : "no tasks", evt.Id);
        return true;
    }
}
