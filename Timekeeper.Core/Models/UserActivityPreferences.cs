namespace Timekeeper.Core.Models;

public class UserActivityPreferences : IWorkspaceOwned
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; } = 1;
    public int UserId { get; set; }

    /// <summary>BCP-47 language code for AI-generated notes, e.g. "en", "de", "hu"</summary>
    public string NotesLanguage { get; set; } = "en";

    /// <summary>Business hours start (UTC hour, 0-23)</summary>
    public int BusinessHoursStart { get; set; } = 8;

    /// <summary>Business hours end (UTC hour, 0-23)</summary>
    public int BusinessHoursEnd { get; set; } = 18;

    /// <summary>Auto-create Draft time entries during business hours</summary>
    public bool AutoCreateDrafts { get; set; } = false;

    /// <summary>Ignore activity events shorter than this (minutes)</summary>
    public int MinActivityMinutes { get; set; } = 5;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public AppUser? User { get; set; }
}
