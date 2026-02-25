namespace Timekeeper.Api.DTOs;

public class TimeEntryDto
{
    public int Id { get; set; }
    public int? TaskId { get; set; }
    public string? TaskName { get; set; }
    public string? TaskDescription { get; set; }
    public string? TaskPosition { get; set; }
    public string? TaskProcurementNumber { get; set; }
    public string? ProjectName { get; set; }
    public string? ProjectNo { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerNo { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public DateTime? PausedAt { get; set; }
    public int TotalPausedSeconds { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime? SubmittedAt { get; set; }
    public int? SubmittedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public int? ApprovedByUserId { get; set; }
    public DateTime? RejectedAt { get; set; }
    public int? RejectedByUserId { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? LockedAt { get; set; }
    public int? LockedByUserId { get; set; }
    public bool IsPaused { get; set; }
    public string? Notes { get; set; }
    public double? DurationMinutes { get; set; }
    public decimal? BilledHours { get; set; }
    public bool IsRunning { get; set; }
    public DateTime ServerNowUtc { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateTimeEntryDto
{
    public int? TaskId { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public decimal? BilledHours { get; set; }
    public string? Notes { get; set; }
}

public class UpdateTimeEntryDto
{
    public int? TaskId { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public decimal? BilledHours { get; set; }
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
    public decimal TotalBilledHours { get; set; }
    public int EntryCount { get; set; }
}

public class BulkDeleteDto
{
    public List<int> Ids { get; set; } = new();
}

public class RejectTimeEntryDto
{
    public string? Reason { get; set; }
}

