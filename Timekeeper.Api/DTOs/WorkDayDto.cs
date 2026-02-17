namespace Timekeeper.Api.DTOs;

public class WorkDayDto
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public string? Notes { get; set; }
    public int TotalWorkedMinutes { get; set; }
    public bool IsCheckedIn { get; set; }
}
