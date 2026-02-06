namespace Timekeeper.Core.Models;

public class TimeEntry
{
    public int Id { get; set; }
    public int? TaskId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public TaskItem? Task { get; set; }

    public TimeSpan? Duration => EndTime.HasValue ? EndTime.Value - StartTime : null;
    public bool IsRunning => !EndTime.HasValue;
}
