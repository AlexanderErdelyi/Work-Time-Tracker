namespace Timekeeper.Api.DTOs;

public class ProjectDto
{
    public int Id { get; set; }
    public string? No { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateProjectDto
{
    public string? No { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CustomerId { get; set; }
}

public class UpdateProjectDto
{
    public string? No { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int? CustomerId { get; set; }
    public bool? IsActive { get; set; }
}
