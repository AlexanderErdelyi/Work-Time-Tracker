namespace Timekeeper.Core.Models;

public class Break
{
    public int Id { get; set; }
    
    public DateTime StartTime { get; set; }
    
    public DateTime? EndTime { get; set; }
    
    public string? Notes { get; set; }
    
    // Navigation properties
    public int? WorkDayId { get; set; }
    public WorkDay? WorkDay { get; set; }
    
    // Calculated properties
    public TimeSpan Duration => EndTime.HasValue 
        ? EndTime.Value - StartTime 
        : DateTime.Now - StartTime;
    
    public bool IsActive => !EndTime.HasValue;
}
