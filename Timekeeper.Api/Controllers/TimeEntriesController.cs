using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Timekeeper.Api.Auth;
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
    private readonly IWorkspaceContext _workspaceContext;

    public TimeEntriesController(TimekeeperContext context, ITimeEntryService timeEntryService, IWorkspaceContext workspaceContext)
    {
        _context = context;
        _timeEntryService = timeEntryService;
        _workspaceContext = workspaceContext;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TimeEntryDto>>> GetTimeEntries(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? customerId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int? taskId = null,
        [FromQuery] string? search = null,
        [FromQuery] bool? isRunning = null,
        [FromQuery] string? status = null)
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
            query = query.Where(e => e.Task != null && e.Task.Project.CustomerId == customerId.Value);
        }

        if (projectId.HasValue)
        {
            query = query.Where(e => e.Task != null && e.Task.ProjectId == projectId.Value);
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

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<TimeEntryStatus>(status, true, out var parsedStatus))
            {
                return BadRequest("Invalid status. Use Draft, Submitted, Approved, Rejected, or Locked.");
            }

            query = query.Where(e => e.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(e => 
                (e.Task != null && e.Task.Name.ToLower().Contains(searchLower)) || 
                (e.Task != null && e.Task.Project.Name.ToLower().Contains(searchLower)) ||
                (e.Task != null && e.Task.Project.Customer.Name.ToLower().Contains(searchLower)) ||
                (e.Notes != null && e.Notes.ToLower().Contains(searchLower)));
        }

        var entries = await query
            .OrderByDescending(e => e.StartTime)
            .Select(e => new TimeEntryDto
            {
                Id = e.Id,
                TaskId = e.TaskId,
                TaskName = e.Task != null ? e.Task.Name : null,
                TaskDescription = e.Task != null ? e.Task.Description : null,
                TaskPosition = e.Task != null ? e.Task.Position : null,
                TaskProcurementNumber = e.Task != null ? e.Task.ProcurementNumber : null,
                ProjectName = e.Task != null ? e.Task.Project.Name : null,
                ProjectNo = e.Task != null ? e.Task.Project.No : null,
                CustomerName = e.Task != null ? e.Task.Project.Customer.Name : null,
                CustomerNo = e.Task != null ? e.Task.Project.Customer.No : null,
                StartTime = e.StartTime,
                EndTime = e.EndTime,
                PausedAt = e.PausedAt,
                TotalPausedSeconds = e.TotalPausedSeconds,
                Status = e.Status.ToString(),
                SubmittedAt = e.SubmittedAt,
                SubmittedByUserId = e.SubmittedByUserId,
                ApprovedAt = e.ApprovedAt,
                ApprovedByUserId = e.ApprovedByUserId,
                RejectedAt = e.RejectedAt,
                RejectedByUserId = e.RejectedByUserId,
                RejectionReason = e.RejectionReason,
                LockedAt = e.LockedAt,
                LockedByUserId = e.LockedByUserId,
                IsPaused = e.PausedAt.HasValue && !e.EndTime.HasValue,
                Notes = e.Notes,
                DurationMinutes = e.EndTime.HasValue ? ((e.EndTime.Value - e.StartTime).TotalMinutes - (e.TotalPausedSeconds / 60.0)) : null,
                BilledHours = e.BilledHours,
                IsRunning = e.EndTime == null && !e.PausedAt.HasValue,
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

        return Ok(MapToDto(entry));
    }

    [HttpGet("running")]
    public async Task<ActionResult<TimeEntryDto?>> GetRunningEntry()
    {
        var entry = await _timeEntryService.GetActiveEntryAsync();

        if (entry == null)
        {
            return Ok(null);
        }

        return Ok(MapToDto(entry));
    }

    [HttpPost("start")]
    public async Task<ActionResult<TimeEntryDto>> StartTimer([FromBody] StartTimerDto? dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (dto == null)
        {
            dto = new StartTimerDto();
        }

        try
        {
            var entry = await _timeEntryService.StartTimerAsync(dto.TaskId, dto.Notes);

            return Ok(MapToDto(entry));
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

            return Ok(MapToDto(entry));
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

    [HttpPost("{id}/resume")]
    public async Task<ActionResult<TimeEntryDto>> ResumeTimer(int id)
    {
        try
        {
            var entry = await _timeEntryService.ResumeTimerAsync(id);

            return Ok(MapToDto(entry));
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

    [HttpPost("{id}/pause")]
    public async Task<ActionResult<TimeEntryDto>> PauseTimer(int id)
    {
        try
        {
            var entry = await _timeEntryService.PauseTimerAsync(id);

            return Ok(MapToDto(entry));
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

    [HttpPost("{id}/resume-from-pause")]
    public async Task<ActionResult<TimeEntryDto>> ResumeFromPause(int id)
    {
        try
        {
            var entry = await _timeEntryService.ResumeFromPauseAsync(id);

            return Ok(MapToDto(entry));
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
        // Task is now optional
        if (dto.TaskId.HasValue)
        {
            var task = await _context.Tasks
                .Include(t => t.Project)
                    .ThenInclude(p => p.Customer)
                .FirstOrDefaultAsync(t => t.Id == dto.TaskId.Value);

            if (task == null)
            {
                return BadRequest("Task not found");
            }
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

        return CreatedAtAction(nameof(GetTimeEntry), new { id = entry.Id }, MapToDto(result));
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

        if (entry.Status is TimeEntryStatus.Submitted or TimeEntryStatus.Approved or TimeEntryStatus.Locked)
        {
            return BadRequest($"Entry is {entry.Status} and cannot be edited.");
        }

        // Allow updating TaskId
        if (dto.TaskId.HasValue)
        {
            // Verify task exists and load it with all relationships
            var task = await _context.Tasks
                .Include(t => t.Project)
                    .ThenInclude(p => p.Customer)
                .FirstOrDefaultAsync(t => t.Id == dto.TaskId.Value);
            
            if (task == null)
            {
                return BadRequest("Task not found");
            }
            
            entry.TaskId = dto.TaskId.Value;
            entry.Task = task;
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

        return Ok(MapToDto(entry));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTimeEntry(int id)
    {
        var entry = await _context.TimeEntries.FirstOrDefaultAsync(e => e.Id == id);

        if (entry == null)
        {
            return NotFound();
        }

        if (entry.Status is TimeEntryStatus.Submitted or TimeEntryStatus.Approved or TimeEntryStatus.Locked)
        {
            return BadRequest($"Entry is {entry.Status} and cannot be deleted.");
        }

        _context.TimeEntries.Remove(entry);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkDeleteTimeEntries(BulkDeleteDto dto)
    {
        if (dto.Ids.Count == 0)
        {
            return BadRequest("No IDs provided");
        }

        var entries = await _context.TimeEntries
            .Where(e => dto.Ids.Contains(e.Id))
            .ToListAsync();

        if (entries.Count == 0)
        {
            return NotFound("No matching entries found");
        }

        var deletableStatuses = new[] { TimeEntryStatus.Draft, TimeEntryStatus.Rejected };
        var protectedEntries = entries.Where(e => !deletableStatuses.Contains(e.Status)).ToList();
        if (protectedEntries.Count > 0)
        {
            return BadRequest(new
            {
                message = "Some entries cannot be deleted because they are submitted, approved, or locked.",
                protectedIds = protectedEntries.Select(e => e.Id).ToList()
            });
        }

        _context.TimeEntries.RemoveRange(entries);
        await _context.SaveChangesAsync();

        return Ok(new { deletedCount = entries.Count });
    }

    [HttpPost("{id}/submit")]
    public async Task<ActionResult<TimeEntryDto>> SubmitEntry(int id)
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

        if (entry.Status is not (TimeEntryStatus.Draft or TimeEntryStatus.Rejected))
        {
            return BadRequest($"Only draft or rejected entries can be submitted. Current status: {entry.Status}.");
        }

        if (!entry.EndTime.HasValue)
        {
            return BadRequest("Only stopped entries can be submitted.");
        }

        entry.Status = TimeEntryStatus.Submitted;
        entry.SubmittedAt = DateTime.UtcNow;
        entry.SubmittedByUserId = _workspaceContext.UserId;
        entry.ApprovedAt = null;
        entry.ApprovedByUserId = null;
        entry.RejectedAt = null;
        entry.RejectedByUserId = null;
        entry.RejectionReason = null;
        entry.LockedAt = null;
        entry.LockedByUserId = null;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(entry));
    }

    [HttpPost("{id}/approve")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<ActionResult<TimeEntryDto>> ApproveEntry(int id)
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

        if (entry.Status != TimeEntryStatus.Submitted)
        {
            return BadRequest($"Only submitted entries can be approved. Current status: {entry.Status}.");
        }

        entry.Status = TimeEntryStatus.Approved;
        entry.ApprovedAt = DateTime.UtcNow;
        entry.ApprovedByUserId = _workspaceContext.UserId;
        entry.RejectedAt = null;
        entry.RejectedByUserId = null;
        entry.RejectionReason = null;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(entry));
    }

    [HttpPost("{id}/reject")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<ActionResult<TimeEntryDto>> RejectEntry(int id, [FromBody] RejectTimeEntryDto? dto)
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

        if (entry.Status != TimeEntryStatus.Submitted)
        {
            return BadRequest($"Only submitted entries can be rejected. Current status: {entry.Status}.");
        }

        entry.Status = TimeEntryStatus.Rejected;
        entry.RejectedAt = DateTime.UtcNow;
        entry.RejectedByUserId = _workspaceContext.UserId;
        entry.RejectionReason = string.IsNullOrWhiteSpace(dto?.Reason) ? null : dto!.Reason!.Trim();
        entry.ApprovedAt = null;
        entry.ApprovedByUserId = null;
        entry.LockedAt = null;
        entry.LockedByUserId = null;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(entry));
    }

    [HttpPost("{id}/lock")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<ActionResult<TimeEntryDto>> LockEntry(int id)
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

        if (entry.Status != TimeEntryStatus.Approved)
        {
            return BadRequest($"Only approved entries can be locked. Current status: {entry.Status}.");
        }

        entry.Status = TimeEntryStatus.Locked;
        entry.LockedAt = DateTime.UtcNow;
        entry.LockedByUserId = _workspaceContext.UserId;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(entry));
    }

    [HttpPost("{id}/reopen")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<ActionResult<TimeEntryDto>> ReopenEntry(int id)
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

        if (entry.Status == TimeEntryStatus.Draft)
        {
            return BadRequest("Entry is already in draft status.");
        }

        entry.Status = TimeEntryStatus.Draft;
        entry.SubmittedAt = null;
        entry.SubmittedByUserId = null;
        entry.ApprovedAt = null;
        entry.ApprovedByUserId = null;
        entry.RejectedAt = null;
        entry.RejectedByUserId = null;
        entry.RejectionReason = null;
        entry.LockedAt = null;
        entry.LockedByUserId = null;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(entry));
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
                TotalMinutes = g.Sum(e => (e.EndTime!.Value - e.StartTime).TotalMinutes - (e.TotalPausedSeconds / 60.0)),
                TotalHours = g.Sum(e => (e.EndTime!.Value - e.StartTime).TotalHours - (e.TotalPausedSeconds / 3600.0)),
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
                TotalMinutes = g.Sum(e => (e.EndTime!.Value - e.StartTime).TotalMinutes - (e.TotalPausedSeconds / 60.0)),
                TotalHours = g.Sum(e => (e.EndTime!.Value - e.StartTime).TotalHours - (e.TotalPausedSeconds / 3600.0)),
                EntryCount = g.Count()
            })
            .OrderByDescending(s => s.Date)
            .ToList();

        return Ok(weeklyTotals);
    }

    private static TimeEntryDto MapToDto(TimeEntry entry)
    {
        return new TimeEntryDto
        {
            Id = entry.Id,
            TaskId = entry.TaskId,
            TaskName = entry.Task?.Name,
            TaskDescription = entry.Task?.Description,
            TaskPosition = entry.Task?.Position,
            TaskProcurementNumber = entry.Task?.ProcurementNumber,
            ProjectName = entry.Task?.Project?.Name,
            ProjectNo = entry.Task?.Project?.No,
            CustomerName = entry.Task?.Project?.Customer?.Name,
            CustomerNo = entry.Task?.Project?.Customer?.No,
            StartTime = entry.StartTime,
            EndTime = entry.EndTime,
            PausedAt = entry.PausedAt,
            TotalPausedSeconds = entry.TotalPausedSeconds,
            Status = entry.Status.ToString(),
            SubmittedAt = entry.SubmittedAt,
            SubmittedByUserId = entry.SubmittedByUserId,
            ApprovedAt = entry.ApprovedAt,
            ApprovedByUserId = entry.ApprovedByUserId,
            RejectedAt = entry.RejectedAt,
            RejectedByUserId = entry.RejectedByUserId,
            RejectionReason = entry.RejectionReason,
            LockedAt = entry.LockedAt,
            LockedByUserId = entry.LockedByUserId,
            IsPaused = entry.IsPaused,
            Notes = entry.Notes,
            DurationMinutes = entry.Duration?.TotalMinutes,
            BilledHours = entry.BilledHours,
            IsRunning = entry.IsRunning,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };
    }
}
