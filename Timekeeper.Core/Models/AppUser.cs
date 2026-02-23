namespace Timekeeper.Core.Models;

public enum UserRole
{
    Admin,
    Manager,
    Member
}

public class AppUser
{
    public int Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Member;
    public int WorkspaceId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Workspace Workspace { get; set; } = null!;
}
