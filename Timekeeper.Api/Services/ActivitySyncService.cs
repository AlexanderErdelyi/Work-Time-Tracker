using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Services;

public interface IActivitySyncTrigger
{
    Task TriggerSyncForUserAsync(int userId, CancellationToken ct = default);
}

public class ActivitySyncService : BackgroundService, IActivitySyncTrigger
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<ActivitySyncService> _logger;

    // Work item type labels per language (value = display name from AI language setting)
    private static readonly Dictionary<string, Dictionary<string, string>> WorkItemTypeLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["German"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Task"] = "Aufgabe",
            ["Bug"] = "Fehler",
            ["Issue"] = "Problem",
            ["Test Case"] = "Testfall",
            ["Impediment"] = "Hindernis",
            ["Change Request"] = "Änderungsantrag",
        },
        ["French"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Task"] = "Tâche",
            ["Bug"] = "Bogue",
            ["Issue"] = "Problème",
            ["Test Case"] = "Cas de test",
        },
        ["Spanish"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Task"] = "Tarea",
            ["Bug"] = "Error",
            ["Issue"] = "Problema",
        },
        ["Hungarian"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Task"] = "Feladat",
            ["Bug"] = "Hiba",
            ["Issue"] = "Probléma",
            ["Test Case"] = "Teszteset",
        },
        ["Polish"] = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Task"] = "Zadanie",
            ["Bug"] = "Błąd",
            ["Issue"] = "Problem",
        },
    };

    private static string LocalizeWorkItemType(string wiType, string? language)
    {
        if (string.IsNullOrWhiteSpace(language) || language.Equals("English", StringComparison.OrdinalIgnoreCase))
            return wiType;
        if (WorkItemTypeLabels.TryGetValue(language, out var map) && map.TryGetValue(wiType, out var local))
            return local;
        return wiType; // untranslated types stay as-is
    }

    private TimeSpan SyncInterval =>
        TimeSpan.FromMinutes(_config.GetValue<int>("ActivitySync:IntervalMinutes", 15));

    public ActivitySyncService(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<ActivitySyncService> logger)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ActivitySyncService started. Interval: {Interval}", SyncInterval);

        // Wait a bit on startup before first run so the app fully boots
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncAllUsersAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Unhandled exception in ActivitySyncService.");
            }

            await Task.Delay(SyncInterval, stoppingToken);
        }
    }

    private async Task SyncAllUsersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TimekeeperContext>();
        var graphClient = scope.ServiceProvider.GetRequiredService<IGraphApiClient>();
        var adoClient = scope.ServiceProvider.GetRequiredService<IAzureDevOpsApiClient>();
        var suggestionService = scope.ServiceProvider.GetRequiredService<IActivitySuggestionService>();

        // Load all active integrations grouped by user
        // IgnoreQueryFilters: background service has no HTTP context, workspace filter defaults to 1
        var integrations = await db.UserIntegrations
            .IgnoreQueryFilters()
            .Where(i => i.IsActive)
            .ToListAsync(ct);

        var userIds = integrations.Select(i => i.UserId).Distinct().ToList();
        _logger.LogDebug("Syncing activity for {Count} users.", userIds.Count);

        foreach (var userId in userIds)
        {
            if (ct.IsCancellationRequested) break;
            await SyncUserAsync(db, graphClient, adoClient, suggestionService, userId, ct);
        }
    }

    // IActivitySyncTrigger — allows controllers to trigger a sync on demand
    public async Task TriggerSyncForUserAsync(int userId, CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TimekeeperContext>();
        var graphClient = scope.ServiceProvider.GetRequiredService<IGraphApiClient>();
        var adoClient = scope.ServiceProvider.GetRequiredService<IAzureDevOpsApiClient>();
        var suggestionService = scope.ServiceProvider.GetRequiredService<IActivitySuggestionService>();

        _logger.LogInformation("Manual sync triggered for user {UserId}.", userId);
        await SyncUserAsync(db, graphClient, adoClient, suggestionService, userId, ct);
    }

    private static async Task SyncUserAsync(
        TimekeeperContext db,
        IGraphApiClient graphClient,
        IAzureDevOpsApiClient adoClient,
        IActivitySuggestionService suggestionService,
        int userId,
        CancellationToken ct)
    {
        // Determine workspace for this user (needed for WorkspaceId on new events)
        var user = await db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return;

        // last 24h window
        var from = DateTime.UtcNow.AddHours(-24);
        var to = DateTime.UtcNow;

        // --- Microsoft Graph (Calendar) ---
        if (await graphClient.IsConnectedAsync(userId, ct))
        {
            var calEvents = await graphClient.GetCalendarEventsAsync(userId, from, to, ct);
            foreach (var calEvt in calEvents)
            {
                var source = calEvt.IsOnlineMeeting ? ActivitySource.TeamsMeeting : ActivitySource.OutlookCalendar;
        var exists = await db.ActivityEvents
                    .IgnoreQueryFilters()
                    .AnyAsync(e => e.UserId == userId && e.Source == source && e.ExternalId == calEvt.Id, ct);

                if (!exists)
                {
                    var metadata = new Dictionary<string, object?>
                    {
                        ["organizerEmail"] = calEvt.OrganizerEmail,
                        ["organizerName"] = calEvt.OrganizerName,
                        ["attendees"] = string.Join(",", calEvt.AttendeeEmails),
                        ["onlineMeetingProvider"] = calEvt.OnlineMeetingProvider
                    };

                    var minutes = (int)(calEvt.EndUtc - calEvt.StartUtc).TotalMinutes;
                    var evt = new ActivityEvent
                    {
                        WorkspaceId = user.WorkspaceId,
                        UserId = userId,
                        Source = source,
                        EventType = calEvt.IsOnlineMeeting ? "OnlineMeeting" : "Appointment",
                        ExternalId = calEvt.Id,
                        Title = calEvt.Subject,
                        StartTime = calEvt.StartUtc,
                        EndTime = calEvt.EndUtc,
                        EstimatedMinutes = Math.Max(minutes, 0),
                        MetadataJson = JsonSerializer.Serialize(metadata),
                        SuggestionState = SuggestionState.Pending,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    db.ActivityEvents.Add(evt);
                    await db.SaveChangesAsync(ct);
                    await suggestionService.ApplySuggestionsAsync(evt, ct);
                    await db.SaveChangesAsync(ct);
                }
            }

            // Update last sync time
            var graphIntegration = await db.UserIntegrations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(i => i.UserId == userId && i.Provider == IntegrationProvider.MicrosoftGraph, ct);
            if (graphIntegration != null)
            {
                graphIntegration.LastSyncedAt = DateTime.UtcNow;
                graphIntegration.UpdatedAt = DateTime.UtcNow;
            }
        }

        // --- Azure DevOps (Work Items + Commits) ---
        if (await adoClient.IsConnectedAsync(userId, ct))
        {
            var userPrefs = await db.UserActivityPreferences
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.UserId == userId, ct);
            var notesLanguage = userPrefs?.NotesLanguage;

            var workItems = await adoClient.GetRecentWorkItemsAsync(userId, from, ct);
            foreach (var wi in workItems)
            {
                var exists = await db.ActivityEvents
                    .IgnoreQueryFilters()
                    .AnyAsync(e => e.UserId == userId && e.Source == ActivitySource.AzureDevOpsWorkItem && e.ExternalId == wi.Id
                        && e.SuggestionState != SuggestionState.Dismissed, ct);

                if (!exists)
                {
                    var metadata = new Dictionary<string, object?>
                    {
                        ["workItemType"] = wi.WorkItemType,
                        ["adoProject"] = wi.ProjectName,
                        ["adoOrganization"] = wi.Organization,
                        ["url"] = wi.Url
                    };

                    var evt = new ActivityEvent
                    {
                        WorkspaceId = user.WorkspaceId,
                        UserId = userId,
                        Source = ActivitySource.AzureDevOpsWorkItem,
                        EventType = wi.WorkItemType,
                        ExternalId = wi.Id,
                        Title = wi.Title,
                        StartTime = wi.ChangedDate,
                        EndTime = wi.ChangedDate,
                        EstimatedMinutes = 30,
                        SuggestedNotes = $"{LocalizeWorkItemType(wi.WorkItemType, notesLanguage)}: {wi.Title}",
                        MetadataJson = JsonSerializer.Serialize(metadata),
                        SuggestionState = SuggestionState.Pending,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    db.ActivityEvents.Add(evt);
                    await db.SaveChangesAsync(ct);
                    await suggestionService.ApplySuggestionsAsync(evt, ct);
                    await db.SaveChangesAsync(ct);
                }
            }

            var commits = await adoClient.GetRecentCommitsAsync(userId, from, ct);
            foreach (var commit in commits)
            {
                var shortId = commit.CommitId.Length >= 8 ? commit.CommitId[..8] : commit.CommitId;
                var exists = await db.ActivityEvents
                    .IgnoreQueryFilters()
                    .AnyAsync(e => e.UserId == userId && e.Source == ActivitySource.AzureDevOpsCommit && e.ExternalId == commit.CommitId
                        && e.SuggestionState != SuggestionState.Dismissed, ct);

                if (!exists)
                {
                    var metadata = new Dictionary<string, object?>
                    {
                        ["repoName"] = commit.RepositoryName,
                        ["adoProject"] = commit.ProjectName,
                        ["adoOrganization"] = commit.Organization,
                        ["url"] = commit.Url
                    };

                    var commitMinutes = commit.FilesChanged <= 1 ? 15
                        : commit.FilesChanged <= 4 ? 20
                        : commit.FilesChanged <= 10 ? 30
                        : commit.FilesChanged <= 20 ? 45 : 60;
                    var evt = new ActivityEvent
                    {
                        WorkspaceId = user.WorkspaceId,
                        UserId = userId,
                        Source = ActivitySource.AzureDevOpsCommit,
                        EventType = "Commit",
                        ExternalId = commit.CommitId,
                        Title = commit.Comment.Length > 200 ? commit.Comment[..200] : commit.Comment,
                        StartTime = commit.AuthorDate,
                        EndTime = commit.AuthorDate,
                        EstimatedMinutes = commitMinutes,
                        SuggestedNotes = commit.Comment.Length > 500 ? commit.Comment[..500] : commit.Comment,
                        MetadataJson = JsonSerializer.Serialize(metadata),
                        SuggestionState = SuggestionState.Pending,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    db.ActivityEvents.Add(evt);
                    await db.SaveChangesAsync(ct);
                    await suggestionService.ApplySuggestionsAsync(evt, ct);
                    await db.SaveChangesAsync(ct);
                }
            }

            // Update last sync time
            var adoIntegration = await db.UserIntegrations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(i => i.UserId == userId && i.Provider == IntegrationProvider.AzureDevOps, ct);
            if (adoIntegration != null)
            {
                adoIntegration.LastSyncedAt = DateTime.UtcNow;
                adoIntegration.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
