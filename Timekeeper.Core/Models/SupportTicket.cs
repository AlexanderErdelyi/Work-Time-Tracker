namespace Timekeeper.Core.Models;

public class SupportTicket : IWorkspaceOwned
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; }
    public int? CreatedByUserId { get; set; }
    public string CreatedByEmail { get; set; } = string.Empty;
    public string SupportRepositoryOwner { get; set; } = string.Empty;
    public string SupportRepositoryRepo { get; set; } = string.Empty;
    public int IssueNumber { get; set; }
    public string IssueUrl { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "bug";
    public string Severity { get; set; } = "medium";
    public string GitHubState { get; set; } = "open";
    public DateTime? LastCommentAt { get; set; }
    public DateTime? LastIssueUpdatedAt { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public DateTime? LastViewedAt { get; set; }
    public bool HasUnreadUpdates { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
