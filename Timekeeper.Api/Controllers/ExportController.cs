using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Api.DTOs;
using Timekeeper.Api.Services;
using Timekeeper.Core.Data;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExportController : ControllerBase
{
    private readonly TimekeeperContext _context;
    private readonly IExportService _exportService;

    public ExportController(TimekeeperContext context, IExportService exportService)
    {
        _context = context;
        _exportService = exportService;
    }

    [HttpGet("csv")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? customerId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int? taskId = null)
    {
        var entries = await GetFilteredEntries(startDate, endDate, customerId, projectId, taskId);
        var csv = _exportService.ExportToCsv(entries);

        return File(csv, "text/csv", $"timekeeper-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
    }

    [HttpGet("xlsx")]
    public async Task<IActionResult> ExportXlsx(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? customerId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int? taskId = null)
    {
        var entries = await GetFilteredEntries(startDate, endDate, customerId, projectId, taskId);
        var xlsx = _exportService.ExportToXlsx(entries);

        return File(xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            $"timekeeper-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx");
    }

    private async Task<List<TimeEntryDto>> GetFilteredEntries(
        DateTime? startDate,
        DateTime? endDate,
        int? customerId,
        int? projectId,
        int? taskId)
    {
        var query = _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
            .Where(e => e.EndTime != null)
            .AsQueryable();

        if (startDate.HasValue)
        {
            query = query.Where(e => e.StartTime >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(e => e.StartTime <= endDate.Value);
        }

        if (customerId.HasValue)
        {
            query = query.Where(e => e.Task.Project.CustomerId == customerId.Value);
        }

        if (projectId.HasValue)
        {
            query = query.Where(e => e.Task.ProjectId == projectId.Value);
        }

        if (taskId.HasValue)
        {
            query = query.Where(e => e.TaskId == taskId.Value);
        }

        return await query
            .OrderByDescending(e => e.StartTime)
            .Select(e => new TimeEntryDto
            {
                Id = e.Id,
                TaskId = e.TaskId,
                TaskName = e.Task.Name,
                TaskPosition = e.Task.Position,
                TaskProcurementNumber = e.Task.ProcurementNumber,
                ProjectName = e.Task.Project.Name,
                ProjectNo = e.Task.Project.No,
                CustomerName = e.Task.Project.Customer.Name,
                CustomerNo = e.Task.Project.Customer.No,
                StartTime = e.StartTime,
                EndTime = e.EndTime,
                Notes = e.Notes,
                DurationMinutes = (e.EndTime!.Value - e.StartTime).TotalMinutes,
                IsRunning = false,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            })
            .ToListAsync();
    }
}
