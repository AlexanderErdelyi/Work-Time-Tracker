namespace Timekeeper.Api.DTOs;

public class RegisterAccountDto
{
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int WorkspaceId { get; set; } = 1;
}

public class LoginWithPasswordDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int WorkspaceId { get; set; } = 1;
}

public class AuthResponseDto
{
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int WorkspaceId { get; set; }
    public string Method { get; set; } = string.Empty;
}

public class WindowsCredentialsAuthDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Domain { get; set; }
    public string? DisplayName { get; set; }
    public int WorkspaceId { get; set; } = 1;
}
