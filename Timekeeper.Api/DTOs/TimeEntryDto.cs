namespace Timekeeper.Api.DTOs;

public class TimeEntryDto
{
    public int Id { get; set; }
    public int? TaskId { get; set; }
    public string? TaskName { get; set; }
    public string? TaskPosition { get; set; }
    public string? TaskProcurementNumber { get; set; }
    public string? ProjectName { get; set; }
    public string? ProjectNo { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerNo { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Notes { get; set; }
    public double? DurationMinutes { get; set; }
    public bool IsRunning { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateTimeEntryDto
{
    public int? TaskId { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Notes { get; set; }
}

public class UpdateTimeEntryDto
{
    public int? TaskId { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Notes { get; set; }
}

public class StartTimerDto
{
    public int? TaskId { get; set; }
    public string? Notes { get; set; }
}

public class TimeEntrySummary
{
    public DateTime Date { get; set; }
    public double TotalMinutes { get; set; }
    public double TotalHours { get; set; }
    public int EntryCount { get; set; }
}

public class BulkDeleteDto
{
    public List<int> Ids { get; set; } = new();
}
