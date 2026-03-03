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

        // Fallback 2: inherit customer (and project/task when same ADO project) from another event in the same org
        if (await TryRelatedOrgSuggestionAsync(evt, ct)) return;

        // Fallback 3: AI suggestion if configured
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
    /// If no suggestion was found, look for another ADO event from the same organization that already has
    /// a suggested customer. When the ADO project also matches, also copy project + task.
    /// </summary>
    private async Task<bool> TryRelatedOrgSuggestionAsync(ActivityEvent evt, CancellationToken ct)
    {
        var adoOrg = TryGetMeta(evt, "adoOrganization");
        if (string.IsNullOrWhiteSpace(adoOrg)) return false;

        var candidateEvents = await _db.ActivityEvents
            .Where(e => e.UserId == evt.UserId
                && e.Id != evt.Id
                && e.SuggestedCustomerId != null
                && (e.Source == ActivitySource.AzureDevOpsWorkItem || e.Source == ActivitySource.AzureDevOpsCommit))
            .ToListAsync(ct);

        var match = candidateEvents.FirstOrDefault(e =>
            string.Equals(TryGetMeta(e, "adoOrganization"), adoOrg, StringComparison.OrdinalIgnoreCase));

        if (match == null) return false;

        evt.SuggestedCustomerId = match.SuggestedCustomerId;
        evt.Confidence = "rule-based";

        var evtProject   = TryGetMeta(evt, "adoProject");
        var matchProject = TryGetMeta(match, "adoProject");
        if (!string.IsNullOrWhiteSpace(evtProject)
            && string.Equals(evtProject, matchProject, StringComparison.OrdinalIgnoreCase))
        {
            evt.SuggestedProjectId = match.SuggestedProjectId;
            evt.SuggestedTaskId    = match.SuggestedTaskId;
        }

        _logger.LogDebug("Inherited suggestion from org '{Org}' to event {EventId}.", adoOrg, evt.Id);
        return true;
    }

    private async Task TryAiSuggestionAsync(ActivityEvent evt, CancellationToken ct)
    {
        if (!await _aiService.IsEnabledForWorkspaceAsync(evt.WorkspaceId, ct)) return;

        try
        {
            var result = await _aiService.ResolveTaskAsync(evt.Title, evt.WorkspaceId, ct);
            if (result?.Found == true)
            {
                evt.SuggestedTaskId = result.TaskId;
                evt.SuggestedNotes = $"AI suggestion: {result.Reasoning}";
                evt.Confidence = "ai";
                _logger.LogDebug("AI resolved task for event {EventId}: {TaskName}", evt.Id, result.TaskName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI suggestion failed for event {EventId}.", evt.Id);
        }
    }
}
