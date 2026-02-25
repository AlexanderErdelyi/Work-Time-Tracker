namespace Timekeeper.Api.DTOs;

public class WorkspaceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? GitHubIssueOwner { get; set; }
    public string? GitHubIssueRepo { get; set; }
    public bool HasGitHubIssueToken { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CurrentWorkspaceContextDto
{
    public WorkspaceDto Workspace { get; set; } = new();
    public WorkspaceUserDto CurrentUser { get; set; } = new();
}

public class WorkspaceUserDto
{
    public int Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string LoginMethod { get; set; } = "email";
    public bool CanResetPassword { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateWorkspaceUserDto
{
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "Member";
}

public class UpdateWorkspaceUserRoleDto
{
    public string Role { get; set; } = string.Empty;
}

public class UpdateWorkspaceUserStatusDto
{
    public bool IsActive { get; set; }
}

public class UpdateWorkspaceUserPasswordDto
{
    public string NewPassword { get; set; } = string.Empty;
}

public class UpdateWorkspaceSupportRepositoryDto
{
    public string? GitHubIssueOwner { get; set; }
    public string? GitHubIssueRepo { get; set; }
    public string? GitHubIssueToken { get; set; }
    public bool ClearGitHubIssueToken { get; set; }
}

public class TestWorkspaceSupportRepositoryDto
{
    public string? GitHubIssueOwner { get; set; }
    public string? GitHubIssueRepo { get; set; }
    public string? GitHubIssueToken { get; set; }
}

public class TestWorkspaceSupportRepositoryResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
