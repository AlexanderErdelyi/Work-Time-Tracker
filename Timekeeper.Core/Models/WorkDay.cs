namespace Timekeeper.Core.Models;

public class WorkDay
{
    public int Id { get; set; }
    
    public DateTime Date { get; set; }
    
    public DateTime? CheckInTime { get; set; }
    
    public DateTime? CheckOutTime { get; set; }
    
    public string? Notes { get; set; }
    
    // Navigation properties
    public ICollection<Break> Breaks { get; set; } = new List<Break>();
    public ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
    
    // Calculated properties
    public int TotalWorkedMinutes
    {
        get
        {
            if (!CheckInTime.HasValue) return 0;
            
            var worked = TimeEntries.Sum(e => 
            {
                var end = e.EndTime ?? DateTime.Now;
                return (int)(end - e.StartTime).TotalMinutes;
            });
            
            var breakTime = Breaks
                .Where(b => b.EndTime.HasValue)
                .Sum(b => (int)(b.EndTime!.Value - b.StartTime).TotalMinutes);
            
            return Math.Max(0, worked - breakTime);
        }
    }
    
    public TimeSpan TotalDuration => CheckOutTime.HasValue && CheckInTime.HasValue
        ? CheckOutTime.Value - CheckInTime.Value
        : TimeSpan.Zero;
    
    public bool IsCheckedIn => CheckInTime.HasValue && !CheckOutTime.HasValue;
}
