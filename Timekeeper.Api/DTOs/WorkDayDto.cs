namespace Timekeeper.Api.DTOs;

public class WorkDayDto
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public string? Notes { get; set; }
    public int TotalWorkedMinutes { get; set; }
    public int TotalBreakMinutes { get; set; }
    public bool IsCheckedIn { get; set; }
    public List<BreakSummaryDto> Breaks { get; set; } = new();
}

public class BreakSummaryDto
{
    public int Id { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int? DurationMinutes { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
}
