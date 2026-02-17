namespace Timekeeper.Api.DTOs;

public class QuickActionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public int? TaskId { get; set; }
    public int SortOrder { get; set; }
    public TaskDto? Task { get; set; }
}
