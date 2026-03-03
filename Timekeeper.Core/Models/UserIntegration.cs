namespace Timekeeper.Core.Models;

public enum IntegrationProvider
{
    MicrosoftGraph,
    AzureDevOps,
    GitHub
}

public class UserIntegration : IWorkspaceOwned
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; } = 1;
    public int UserId { get; set; }

    public IntegrationProvider Provider { get; set; }

    /// <summary>Encrypted access token (AES-GCM via DataProtection)</summary>
    public string? AccessToken { get; set; }

    /// <summary>Encrypted refresh token</summary>
    public string? RefreshToken { get; set; }

    public DateTime? ExpiresAt { get; set; }

    /// <summary>JSON array of enabled source names e.g. ["Calendar","Teams","Email"]</summary>
    public string EnabledSourcesJson { get; set; } = "[]";

    public DateTime? LastSyncedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public AppUser? User { get; set; }
}
