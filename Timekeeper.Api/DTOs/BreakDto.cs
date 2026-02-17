namespace Timekeeper.Api.DTOs;

public class BreakDto
{
    public int Id { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Notes { get; set; }
    public int? WorkDayId { get; set; }
    public int DurationMinutes { get; set; }
    public bool IsActive { get; set; }
}
