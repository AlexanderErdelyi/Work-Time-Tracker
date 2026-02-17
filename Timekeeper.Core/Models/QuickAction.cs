namespace Timekeeper.Core.Models;

public enum QuickActionType
{
    StartTimer,
    StartTimerWithTask,
    CheckIn,
    StartBreak,
    ExportToday
}

public class QuickAction
{
    public int Id { get; set; }
    
    public string Name { get; set; } = string.Empty;
    
    public string? Icon { get; set; }
    
    public QuickActionType ActionType { get; set; }
    
    public int? TaskId { get; set; }
    
    public int SortOrder { get; set; }
    
    // Navigation properties
    public TaskItem? Task { get; set; }
}
