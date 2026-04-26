namespace Timekeeper.Core.Models;

public enum ActivitySource
{
    OutlookCalendar,
    TeamsMeeting,
    TeamsChat,
    OutlookEmail,
    AzureDevOpsWorkItem,
    AzureDevOpsCommit,
    AzureDevOpsPullRequest,
    GitHubCommit,
    GitHubPullRequest
}

public enum SuggestionState
{
    Pending,
    Accepted,
    Dismissed,
    AutoCreated
}

public class ActivityEvent : IWorkspaceOwned
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; } = 1;
    public int UserId { get; set; }

    public ActivitySource Source { get; set; }

    /// <summary>Event type within the source (e.g. "meeting", "email_batch", "commit")</summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>External identifier to prevent duplicate imports</summary>
    public string ExternalId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    /// <summary>AI-estimated duration in minutes</summary>
    public int EstimatedMinutes { get; set; }

    /// <summary>JSON blob: attendees, URL, commit hashes, ADO item numbers, etc.</summary>
    public string MetadataJson { get; set; } = "{}";

    public SuggestionState SuggestionState { get; set; } = SuggestionState.Pending;

    // AI-matched / rule-matched fields
    public int? SuggestedCustomerId { get; set; }
    public int? SuggestedProjectId { get; set; }
    public int? SuggestedTaskId { get; set; }
    public string? SuggestedNotes { get; set; }

    /// <summary>Confidence label: "rule-matched", "ai-high", "ai-medium", "ai-low"</summary>
    public string? Confidence { get; set; }

    /// <summary>FK to the time entry created/accepted from this suggestion</summary>
    public int? LinkedTimeEntryId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public AppUser? User { get; set; }
    public Customer? SuggestedCustomer { get; set; }
    public Project? SuggestedProject { get; set; }
    public TaskItem? SuggestedTask { get; set; }
    public TimeEntry? LinkedTimeEntry { get; set; }
}
