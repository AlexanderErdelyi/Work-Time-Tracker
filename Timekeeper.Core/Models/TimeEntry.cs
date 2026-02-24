namespace Timekeeper.Core.Models;

public enum TimeEntryStatus
{
    Draft,
    Submitted,
    Approved,
    Rejected,
    Locked
}

public class TimeEntry
    : IWorkspaceOwned
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; } = 1;
    public int UserId { get; set; } = 1;
    public int? TaskId { get; set; }
    public int? WorkDayId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public DateTime? PausedAt { get; set; }
    public int TotalPausedSeconds { get; set; }
    public TimeEntryStatus Status { get; set; } = TimeEntryStatus.Draft;
    public DateTime? SubmittedAt { get; set; }
    public int? SubmittedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public int? ApprovedByUserId { get; set; }
    public DateTime? RejectedAt { get; set; }
    public int? RejectedByUserId { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? LockedAt { get; set; }
    public int? LockedByUserId { get; set; }
    public string? Notes { get; set; }
    public decimal? BilledHours { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public TaskItem? Task { get; set; }
    public WorkDay? WorkDay { get; set; }
    public AppUser? User { get; set; }

    public TimeSpan? Duration
    {
        get
        {
            if (!EndTime.HasValue) return null;
            var totalDuration = EndTime.Value - StartTime;
            var pausedDuration = TimeSpan.FromSeconds(TotalPausedSeconds);
            return totalDuration - pausedDuration;
        }
    }

    public bool IsRunning => !EndTime.HasValue && !PausedAt.HasValue;
    public bool IsPaused => !EndTime.HasValue && PausedAt.HasValue;
}
