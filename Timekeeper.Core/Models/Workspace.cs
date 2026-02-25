namespace Timekeeper.Core.Models;

public class Workspace
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? GitHubIssueOwner { get; set; }
    public string? GitHubIssueRepo { get; set; }
    public string? GitHubIssueTokenProtected { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
}
