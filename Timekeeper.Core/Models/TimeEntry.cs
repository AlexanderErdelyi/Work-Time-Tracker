namespace Timekeeper.Core.Models;

public class TimeEntry
    : IWorkspaceOwned
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; } = 1;
    public int? TaskId { get; set; }
    public int? WorkDayId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public DateTime? PausedAt { get; set; }
    public int TotalPausedSeconds { get; set; }
    public string? Notes { get; set; }
    public decimal? BilledHours { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public TaskItem? Task { get; set; }
    public WorkDay? WorkDay { get; set; }

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
