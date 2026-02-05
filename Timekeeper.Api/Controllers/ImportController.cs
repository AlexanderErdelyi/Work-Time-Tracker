using Microsoft.AspNetCore.Mvc;
using Timekeeper.Api.DTOs;
using Timekeeper.Api.Services;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImportController : ControllerBase
{
    private readonly IImportService _importService;

    public ImportController(IImportService importService)
    {
        _importService = importService;
    }

    [HttpPost("tasks")]
    public async Task<ActionResult<TaskImportResultDto>> ImportTasks(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded");
        }

        if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Only Excel files (.xlsx) are supported");
        }

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        stream.Position = 0;

        var result = await _importService.ImportTasksFromExcelAsync(stream);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpGet("tasks/template")]
    public IActionResult GetTaskImportTemplate()
    {
        var template = _importService.GenerateTaskImportTemplate();
        return File(template, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            "task-import-template.xlsx");
    }
}
