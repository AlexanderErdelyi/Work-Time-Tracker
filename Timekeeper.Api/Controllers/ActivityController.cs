using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using Timekeeper.Api.Auth;
using Timekeeper.Api.DTOs;
using Timekeeper.Api.Services;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ActivityController : ControllerBase
{
    private readonly TimekeeperContext _context;
    private readonly IActivitySuggestionService _suggestionService;
    private readonly IActivitySyncTrigger _syncTrigger;
    private readonly ILogger<ActivityController> _logger;

    public ActivityController(
        TimekeeperContext context,
        IActivitySuggestionService suggestionService,
        IActivitySyncTrigger syncTrigger,
        ILogger<ActivityController> logger)
    {
        _context = context;
        _suggestionService = suggestionService;
        _syncTrigger = syncTrigger;
        _logger = logger;
    }

    // POST /api/activity/sync — manually trigger a sync for the current user
    [HttpPost("sync")]
    public async Task<IActionResult> TriggerSync(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        await _syncTrigger.TriggerSyncForUserAsync(userId.Value, ct);
        return Ok(new { message = "Sync completed." });
    }

    // GET /api/activity?state=Pending&from=...&to=...&source=...
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ActivityEventDto>>> GetEvents(
        [FromQuery] string? state,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? source,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var query = _context.ActivityEvents
            .Include(e => e.SuggestedCustomer)
            .Include(e => e.SuggestedProject)
            .Include(e => e.SuggestedTask)
            .Where(e => e.UserId == userId.Value)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(state) && Enum.TryParse<SuggestionState>(state, out var stateEnum))
            query = query.Where(e => e.SuggestionState == stateEnum);

        if (from.HasValue)
            query = query.Where(e => e.StartTime >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.StartTime <= to.Value);

        if (!string.IsNullOrWhiteSpace(source) && Enum.TryParse<ActivitySource>(source, out var sourceEnum))
            query = query.Where(e => e.Source == sourceEnum);

        var events = await query
            .OrderByDescending(e => e.StartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(events.Select(MapToDto));
    }

    // GET /api/activity/summary
    [HttpGet("summary")]
    public async Task<ActionResult<ActivitySummaryDto>> GetSummary()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var pendingCount = await _context.ActivityEvents
            .CountAsync(e => e.UserId == userId.Value && e.SuggestionState == SuggestionState.Pending);

        var acceptedToday = await _context.ActivityEvents
            .CountAsync(e => e.UserId == userId.Value
                && e.SuggestionState == SuggestionState.Accepted
                && e.UpdatedAt >= today && e.UpdatedAt < tomorrow);

        var dismissedToday = await _context.ActivityEvents
            .CountAsync(e => e.UserId == userId.Value
                && e.SuggestionState == SuggestionState.Dismissed
                && e.UpdatedAt >= today && e.UpdatedAt < tomorrow);

        var recentSuggestions = await _context.ActivityEvents
            .Include(e => e.SuggestedCustomer)
            .Include(e => e.SuggestedProject)
            .Include(e => e.SuggestedTask)
            .Where(e => e.UserId == userId.Value && e.SuggestionState == SuggestionState.Pending)
            .OrderByDescending(e => e.StartTime)
            .Take(5)
            .ToListAsync();

        return Ok(new ActivitySummaryDto
        {
            PendingCount = pendingCount,
            AcceptedToday = acceptedToday,
            DismissedToday = dismissedToday,
            RecentSuggestions = recentSuggestions.Select(MapToDto).ToList()
        });
    }

    // POST /api/activity/{id}/accept
    [HttpPost("{id}/accept")]
    public async Task<ActionResult<ActivityEventDto>> AcceptSuggestion(int id, [FromBody] AcceptSuggestionRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var evt = await _context.ActivityEvents
            .Include(e => e.SuggestedCustomer)
            .Include(e => e.SuggestedProject)
            .Include(e => e.SuggestedTask)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId.Value);

        if (evt is null) return NotFound();
        if (evt.SuggestionState == SuggestionState.Accepted)
            return BadRequest(new { message = "Event is already accepted." });

        // Create time entry from suggestion
        var taskId = dto.TaskId ?? evt.SuggestedTaskId;
        var minutes = dto.OverrideMinutes ?? evt.EstimatedMinutes;
        var notes = dto.Notes ?? evt.SuggestedNotes ?? evt.Title;

        var timeEntry = new TimeEntry
        {
            WorkspaceId = evt.WorkspaceId,
            UserId = evt.UserId,
            TaskId = taskId,
            StartTime = evt.StartTime ?? DateTime.UtcNow,
            EndTime = evt.EndTime ?? (evt.StartTime ?? DateTime.UtcNow).AddMinutes(minutes),
            Notes = notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.TimeEntries.Add(timeEntry);
        await _context.SaveChangesAsync();

        evt.SuggestionState = SuggestionState.Accepted;
        evt.LinkedTimeEntryId = timeEntry.Id;
        evt.SuggestedCustomerId = dto.CustomerId ?? evt.SuggestedCustomerId;
        evt.SuggestedProjectId = dto.ProjectId ?? evt.SuggestedProjectId;
        evt.SuggestedTaskId = taskId;
        evt.SuggestedNotes = notes;
        evt.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapToDto(evt));
    }

    // POST /api/activity/{id}/edit
    [HttpPost("{id}/edit")]
    public async Task<ActionResult<ActivityEventDto>> EditSuggestion(int id, [FromBody] EditSuggestionRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var evt = await _context.ActivityEvents
            .Include(e => e.SuggestedCustomer)
            .Include(e => e.SuggestedProject)
            .Include(e => e.SuggestedTask)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId.Value);

        if (evt is null) return NotFound();

        if (dto.CustomerId.HasValue) evt.SuggestedCustomerId = dto.CustomerId;
        if (dto.ProjectId.HasValue) evt.SuggestedProjectId = dto.ProjectId;
        if (dto.TaskId.HasValue) evt.SuggestedTaskId = dto.TaskId;
        if (dto.Notes != null) evt.SuggestedNotes = dto.Notes;
        if (dto.EstimatedMinutes.HasValue) evt.EstimatedMinutes = dto.EstimatedMinutes.Value;
        evt.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(evt));
    }

    // POST /api/activity/{id}/dismiss
    [HttpPost("{id}/dismiss")]
    public async Task<ActionResult<ActivityEventDto>> DismissSuggestion(int id, [FromBody] DismissSuggestionRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var evt = await _context.ActivityEvents
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId.Value);

        if (evt is null) return NotFound();

        evt.SuggestionState = SuggestionState.Dismissed;
        evt.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapToDto(evt));
    }

    // POST /api/activity/accept-all
    [HttpPost("accept-all")]
    public async Task<ActionResult<object>> AcceptAll()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var pending = await _context.ActivityEvents
            .Where(e => e.UserId == userId.Value && e.SuggestionState == SuggestionState.Pending
                && e.SuggestedTaskId != null)
            .ToListAsync();

        var created = 0;
        foreach (var evt in pending)
        {
            var timeEntry = new TimeEntry
            {
                WorkspaceId = evt.WorkspaceId,
                UserId = evt.UserId,
                TaskId = evt.SuggestedTaskId,
                StartTime = evt.StartTime ?? DateTime.UtcNow,
                EndTime = evt.EndTime ?? (evt.StartTime ?? DateTime.UtcNow).AddMinutes(evt.EstimatedMinutes),
                Notes = evt.SuggestedNotes ?? evt.Title,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.TimeEntries.Add(timeEntry);
            await _context.SaveChangesAsync();

            evt.SuggestionState = SuggestionState.Accepted;
            evt.LinkedTimeEntryId = timeEntry.Id;
            evt.UpdatedAt = DateTime.UtcNow;
            created++;
        }

        await _context.SaveChangesAsync();
        return Ok(new { created });
    }

    // DELETE /api/activity/cleanup-ado
    // Hard-deletes all Pending ADO activity events so a fresh sync starts clean.
    [HttpDelete("cleanup-ado")]
    public async Task<ActionResult<object>> CleanupAdo()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var adoSources = new[]
        {
            ActivitySource.AzureDevOpsWorkItem,
            ActivitySource.AzureDevOpsCommit,
            ActivitySource.AzureDevOpsPullRequest,
        };

        var events = await _context.ActivityEvents
            .Where(e => e.UserId == userId.Value
                && adoSources.Contains(e.Source)
                && (e.SuggestionState == SuggestionState.Pending || e.SuggestionState == SuggestionState.Dismissed))
            .ToListAsync();

        _context.ActivityEvents.RemoveRange(events);
        await _context.SaveChangesAsync();

        return Ok(new { deleted = events.Count });
    }

    // GET /api/activity/preferences
    [HttpGet("preferences")]
    public async Task<ActionResult<UserActivityPreferencesDto>> GetPreferences()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var prefs = await _context.UserActivityPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId.Value);

        if (prefs is null)
        {
            return Ok(new UserActivityPreferencesDto());
        }

        return Ok(new UserActivityPreferencesDto
        {
            NotesLanguage = prefs.NotesLanguage,
            BusinessHoursStart = prefs.BusinessHoursStart,
            BusinessHoursEnd = prefs.BusinessHoursEnd,
            AutoCreateDrafts = prefs.AutoCreateDrafts,
            MinActivityMinutes = prefs.MinActivityMinutes
        });
    }

    // PUT /api/activity/preferences
    [HttpPut("preferences")]
    public async Task<ActionResult<UserActivityPreferencesDto>> UpdatePreferences([FromBody] UpdateActivityPreferencesRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var prefs = await _context.UserActivityPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId.Value);

        var workspaceId = GetCurrentWorkspaceId();

        if (prefs is null)
        {
            prefs = new UserActivityPreferences
            {
                WorkspaceId = workspaceId ?? 1,
                UserId = userId.Value,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.UserActivityPreferences.Add(prefs);
        }

        if (dto.NotesLanguage != null) prefs.NotesLanguage = dto.NotesLanguage;
        if (dto.BusinessHoursStart.HasValue) prefs.BusinessHoursStart = dto.BusinessHoursStart.Value;
        if (dto.BusinessHoursEnd.HasValue) prefs.BusinessHoursEnd = dto.BusinessHoursEnd.Value;
        if (dto.AutoCreateDrafts.HasValue) prefs.AutoCreateDrafts = dto.AutoCreateDrafts.Value;
        if (dto.MinActivityMinutes.HasValue) prefs.MinActivityMinutes = dto.MinActivityMinutes.Value;
        prefs.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new UserActivityPreferencesDto
        {
            NotesLanguage = prefs.NotesLanguage,
            BusinessHoursStart = prefs.BusinessHoursStart,
            BusinessHoursEnd = prefs.BusinessHoursEnd,
            AutoCreateDrafts = prefs.AutoCreateDrafts,
            MinActivityMinutes = prefs.MinActivityMinutes
        });
    }

    // GET /api/activity/available-sources
    [HttpGet("available-sources")]
    public ActionResult<IEnumerable<object>> GetAvailableSources()
    {
        var sources = Enum.GetValues<ActivitySource>().Select(s => new
        {
            value = s.ToString(),
            label = FormatSourceLabel(s),
            provider = GetSourceProvider(s)
        });
        return Ok(sources);
    }

    private static string FormatSourceLabel(ActivitySource source) => source switch
    {
        ActivitySource.OutlookCalendar => "Outlook Calendar",
        ActivitySource.TeamsMeeting => "Teams Meeting",
        ActivitySource.TeamsChat => "Teams Chat",
        ActivitySource.OutlookEmail => "Outlook Email",
        ActivitySource.AzureDevOpsWorkItem => "Azure DevOps Work Item",
        ActivitySource.AzureDevOpsCommit => "Azure DevOps Commit",
        ActivitySource.AzureDevOpsPullRequest => "Azure DevOps Pull Request",
        ActivitySource.GitHubCommit => "GitHub Commit",
        ActivitySource.GitHubPullRequest => "GitHub Pull Request",
        _ => source.ToString()
    };

    private static string GetSourceProvider(ActivitySource source) => source switch
    {
        ActivitySource.OutlookCalendar or ActivitySource.TeamsMeeting or
        ActivitySource.TeamsChat or ActivitySource.OutlookEmail => "MicrosoftGraph",
        ActivitySource.AzureDevOpsWorkItem or ActivitySource.AzureDevOpsCommit or
        ActivitySource.AzureDevOpsPullRequest => "AzureDevOps",
        ActivitySource.GitHubCommit or ActivitySource.GitHubPullRequest => "GitHub",
        _ => "Unknown"
    };

    private int? GetCurrentUserId()
    {
        var value = User.FindFirstValue(AuthClaimTypes.UserId);
        return int.TryParse(value, out var id) ? id : null;
    }

    private int? GetCurrentWorkspaceId()
    {
        var value = User.FindFirstValue(AuthClaimTypes.WorkspaceId);
        return int.TryParse(value, out var id) ? id : null;
    }

    private static ActivityEventDto MapToDto(ActivityEvent e)
    {
        Dictionary<string, object?> metadata = [];
        if (!string.IsNullOrWhiteSpace(e.MetadataJson))
        {
            try
            {
                metadata = JsonSerializer.Deserialize<Dictionary<string, object?>>(e.MetadataJson) ?? [];
            }
            catch { /* ignore parse errors */ }
        }

        return new ActivityEventDto
        {
            Id = e.Id,
            Source = e.Source.ToString(),
            EventType = e.EventType,
            ExternalId = e.ExternalId,
            Title = e.Title,
            StartTime = e.StartTime,
            EndTime = e.EndTime,
            EstimatedMinutes = e.EstimatedMinutes,
            SuggestionState = e.SuggestionState.ToString(),
            SuggestedCustomerId = e.SuggestedCustomerId,
            SuggestedCustomerName = e.SuggestedCustomer?.Name,
            SuggestedProjectId = e.SuggestedProjectId,
            SuggestedProjectName = e.SuggestedProject?.Name,
            SuggestedTaskId = e.SuggestedTaskId,
            SuggestedTaskName = e.SuggestedTask?.Name,
            SuggestedNotes = e.SuggestedNotes,
            ExternalUrl = metadata.TryGetValue("url", out var urlVal) ? urlVal?.ToString() : null,
            Confidence = e.Confidence,
            LinkedTimeEntryId = e.LinkedTimeEntryId,
            Metadata = metadata,
            CreatedAt = e.CreatedAt
        };
    }
}
