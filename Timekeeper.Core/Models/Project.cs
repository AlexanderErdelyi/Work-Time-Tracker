namespace Timekeeper.Core.Models;

public class Project
{
    public int Id { get; set; }
    public string? No { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CustomerId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Customer Customer { get; set; } = null!;
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
