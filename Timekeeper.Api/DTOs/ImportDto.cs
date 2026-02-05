namespace Timekeeper.Api.DTOs;

public class TaskImportDto
{
    public string TaskName { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public string? TaskPosition { get; set; }
    public string? TaskProcurementNumber { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string? ProjectNo { get; set; }
    public string? ProjectDescription { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerNo { get; set; }
    public string? CustomerDescription { get; set; }
}

public class TaskImportResultDto
{
    public int CustomersCreated { get; set; }
    public int CustomersUpdated { get; set; }
    public int ProjectsCreated { get; set; }
    public int ProjectsUpdated { get; set; }
    public int TasksCreated { get; set; }
    public int TasksUpdated { get; set; }
    public List<string> Errors { get; set; } = new();
    public bool Success => Errors.Count == 0;
}
