namespace Timekeeper.Api.DTOs;

public class TaskDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Position { get; set; }
    public string? ProcurementNumber { get; set; }
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateTaskDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Position { get; set; }
    public string? ProcurementNumber { get; set; }
    public int ProjectId { get; set; }
}

public class UpdateTaskDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Position { get; set; }
    public string? ProcurementNumber { get; set; }
    public int? ProjectId { get; set; }
    public bool? IsActive { get; set; }
}
