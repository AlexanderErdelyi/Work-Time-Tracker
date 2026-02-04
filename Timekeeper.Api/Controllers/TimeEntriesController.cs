using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Api.DTOs;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;
using Timekeeper.Core.Services;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TimeEntriesController : ControllerBase
{
    private readonly TimekeeperContext _context;
    private readonly ITimeEntryService _timeEntryService;

    public TimeEntriesController(TimekeeperContext context, ITimeEntryService timeEntryService)
    {
        _context = context;
        _timeEntryService = timeEntryService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TimeEntryDto>>> GetTimeEntries(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? customerId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int? taskId = null,
        [FromQuery] string? search = null,
        [FromQuery] bool? isRunning = null)
    {
        var query = _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
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

        if (isRunning.HasValue)
        {
            query = isRunning.Value 
                ? query.Where(e => e.EndTime == null)
                : query.Where(e => e.EndTime != null);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(e => 
                e.Task.Name.Contains(search) || 
                e.Task.Project.Name.Contains(search) ||
                e.Task.Project.Customer.Name.Contains(search) ||
                (e.Notes != null && e.Notes.Contains(search)));
        }

        var entries = await query
            .OrderByDescending(e => e.StartTime)
            .Select(e => new TimeEntryDto
            {
                Id = e.Id,
                TaskId = e.TaskId,
                TaskName = e.Task.Name,
                ProjectName = e.Task.Project.Name,
                CustomerName = e.Task.Project.Customer.Name,
                StartTime = e.StartTime,
                EndTime = e.EndTime,
                Notes = e.Notes,
                DurationMinutes = e.EndTime.HasValue ? (e.EndTime.Value - e.StartTime).TotalMinutes : null,
                IsRunning = e.EndTime == null,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            })
            .ToListAsync();

        return Ok(entries);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TimeEntryDto>> GetTimeEntry(int id)
    {
        var entry = await _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (entry == null)
        {
            return NotFound();
        }

        return Ok(new TimeEntryDto
        {
            Id = entry.Id,
            TaskId = entry.TaskId,
            TaskName = entry.Task.Name,
            ProjectName = entry.Task.Project.Name,
            CustomerName = entry.Task.Project.Customer.Name,
            StartTime = entry.StartTime,
            EndTime = entry.EndTime,
            Notes = entry.Notes,
            DurationMinutes = entry.EndTime.HasValue ? (entry.EndTime.Value - entry.StartTime).TotalMinutes : null,
            IsRunning = entry.EndTime == null,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        });
    }

    [HttpGet("running")]
    public async Task<ActionResult<TimeEntryDto?>> GetRunningEntry()
    {
        var entry = await _timeEntryService.GetRunningEntryAsync();

        if (entry == null)
        {
            return Ok(null);
        }

        return Ok(new TimeEntryDto
        {
            Id = entry.Id,
            TaskId = entry.TaskId,
            TaskName = entry.Task.Name,
            ProjectName = entry.Task.Project.Name,
            CustomerName = entry.Task.Project.Customer.Name,
            StartTime = entry.StartTime,
            EndTime = entry.EndTime,
            Notes = entry.Notes,
            DurationMinutes = null,
            IsRunning = true,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        });
    }

    [HttpPost("start")]
    public async Task<ActionResult<TimeEntryDto>> StartTimer(StartTimerDto dto)
    {
        try
        {
            var entry = await _timeEntryService.StartTimerAsync(dto.TaskId, dto.Notes);

            return Ok(new TimeEntryDto
            {
                Id = entry.Id,
                TaskId = entry.TaskId,
                TaskName = entry.Task.Name,
                ProjectName = entry.Task.Project.Name,
                CustomerName = entry.Task.Project.Customer.Name,
                StartTime = entry.StartTime,
                EndTime = entry.EndTime,
                Notes = entry.Notes,
                DurationMinutes = null,
                IsRunning = true,
                CreatedAt = entry.CreatedAt,
                UpdatedAt = entry.UpdatedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id}/stop")]
    public async Task<ActionResult<TimeEntryDto>> StopTimer(int id)
    {
        try
        {
            var entry = await _timeEntryService.StopTimerAsync(id);

            return Ok(new TimeEntryDto
            {
                Id = entry.Id,
                TaskId = entry.TaskId,
                TaskName = entry.Task.Name,
                ProjectName = entry.Task.Project.Name,
                CustomerName = entry.Task.Project.Customer.Name,
                StartTime = entry.StartTime,
                EndTime = entry.EndTime,
                Notes = entry.Notes,
                DurationMinutes = entry.Duration?.TotalMinutes,
                IsRunning = false,
                CreatedAt = entry.CreatedAt,
                UpdatedAt = entry.UpdatedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPost]
    public async Task<ActionResult<TimeEntryDto>> CreateTimeEntry(CreateTimeEntryDto dto)
    {
        var task = await _context.Tasks
            .Include(t => t.Project)
                .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(t => t.Id == dto.TaskId);

        if (task == null)
        {
            return BadRequest("Task not found");
        }

        if (dto.EndTime.HasValue && dto.EndTime.Value < (dto.StartTime ?? DateTime.UtcNow))
        {
            return BadRequest("End time must be after start time");
        }

        var entry = new TimeEntry
        {
            TaskId = dto.TaskId,
            StartTime = dto.StartTime ?? DateTime.UtcNow,
            EndTime = dto.EndTime,
            Notes = dto.Notes
        };

        _context.TimeEntries.Add(entry);
        await _context.SaveChangesAsync();

        var result = await _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
            .FirstAsync(e => e.Id == entry.Id);

        var entryDto = new TimeEntryDto
        {
            Id = result.Id,
            TaskId = result.TaskId,
            TaskName = result.Task.Name,
            ProjectName = result.Task.Project.Name,
            CustomerName = result.Task.Project.Customer.Name,
            StartTime = result.StartTime,
            EndTime = result.EndTime,
            Notes = result.Notes,
            DurationMinutes = result.Duration?.TotalMinutes,
            IsRunning = result.IsRunning,
            CreatedAt = result.CreatedAt,
            UpdatedAt = result.UpdatedAt
        };

        return CreatedAtAction(nameof(GetTimeEntry), new { id = entry.Id }, entryDto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTimeEntry(int id, UpdateTimeEntryDto dto)
    {
        var entry = await _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (entry == null)
        {
            return NotFound();
        }

        if (dto.StartTime.HasValue) entry.StartTime = dto.StartTime.Value;
        
        // Allow explicitly setting EndTime to null to restart entry
        if (dto.EndTime == null && dto.Notes == "__RESTART__")
        {
            entry.EndTime = null;
        }
        else if (dto.EndTime.HasValue)
        {
            entry.EndTime = dto.EndTime.Value;
        }
        
        if (dto.Notes != null && dto.Notes != "__RESTART__") 
        {
            entry.Notes = dto.Notes;
        }

        if (entry.EndTime.HasValue && entry.EndTime.Value < entry.StartTime)
        {
            return BadRequest("End time must be after start time");
        }

        entry.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Return the updated entry
        var result = new TimeEntryDto
        {
            Id = entry.Id,
            TaskId = entry.TaskId,
            TaskName = entry.Task.Name,
            ProjectName = entry.Task.Project.Name,
            CustomerName = entry.Task.Project.Customer.Name,
            StartTime = entry.StartTime,
            EndTime = entry.EndTime,
            Notes = entry.Notes,
            DurationMinutes = entry.Duration?.TotalMinutes,
            IsRunning = entry.IsRunning,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };

        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTimeEntry(int id)
    {
        var entry = await _context.TimeEntries.FindAsync(id);

        if (entry == null)
        {
            return NotFound();
        }

        _context.TimeEntries.Remove(entry);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("daily-totals")]
    public async Task<ActionResult<IEnumerable<TimeEntrySummary>>> GetDailyTotals(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? customerId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int? taskId = null)
    {
        var query = _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
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

        var entries = await query.ToListAsync();

        var totals = entries
            .GroupBy(e => e.StartTime.Date)
            .Select(g => new TimeEntrySummary
            {
                Date = g.Key,
                TotalMinutes = g.Sum(e => (e.EndTime!.Value - e.StartTime).TotalMinutes),
                TotalHours = g.Sum(e => (e.EndTime!.Value - e.StartTime).TotalHours),
                EntryCount = g.Count()
            })
            .OrderByDescending(s => s.Date)
            .ToList();

        return Ok(totals);
    }

    [HttpGet("weekly-totals")]
    public async Task<ActionResult<IEnumerable<TimeEntrySummary>>> GetWeeklyTotals(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? customerId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int? taskId = null)
    {
        var query = _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
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

        var entries = await query.ToListAsync();

        var weeklyTotals = entries
            .GroupBy(e => {
                var date = e.StartTime.Date;
                var dayOfWeek = (int)date.DayOfWeek;
                var weekStart = date.AddDays(-(dayOfWeek == 0 ? 6 : dayOfWeek - 1));
                return weekStart;
            })
            .Select(g => new TimeEntrySummary
            {
                Date = g.Key,
                TotalMinutes = g.Sum(e => (e.EndTime!.Value - e.StartTime).TotalMinutes),
                TotalHours = g.Sum(e => (e.EndTime!.Value - e.StartTime).TotalHours),
                EntryCount = g.Count()
            })
            .OrderByDescending(s => s.Date)
            .ToList();

        return Ok(weeklyTotals);
    }
}
