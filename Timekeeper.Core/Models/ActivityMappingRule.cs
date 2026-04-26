namespace Timekeeper.Core.Models;

public enum MatchField
{
    Subject,
    Organizer,
    EmailDomain,
    CalendarCategory,
    AdoProject,
    RepoName,
    Attendee,
    AdoOrganization
}

public enum MatchOperator
{
    Contains,
    Equals,
    StartsWith,
    EndsWith,
    Regex
}

public class ActivityMappingRule : IWorkspaceOwned
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; } = 1;
    public int UserId { get; set; }

    public MatchField MatchField { get; set; }
    public MatchOperator MatchOperator { get; set; }
    public string MatchValue { get; set; } = string.Empty;

    public int? MappedCustomerId { get; set; }
    public int? MappedProjectId { get; set; }
    public int? MappedTaskId { get; set; }

    /// <summary>Lower value = higher priority (checked first)</summary>
    public int Priority { get; set; } = 100;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public AppUser? User { get; set; }
    public Customer? MappedCustomer { get; set; }
    public Project? MappedProject { get; set; }
    public TaskItem? MappedTask { get; set; }
}
