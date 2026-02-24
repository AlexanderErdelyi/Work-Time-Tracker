using Microsoft.AspNetCore.Mvc;
using Timekeeper.Core.Services;
using Timekeeper.Api.DTOs;
using Timekeeper.Core.Data;
using Microsoft.EntityFrameworkCore;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BreaksController : ControllerBase
{
    private readonly IBreakService _breakService;
    private readonly TimekeeperContext _context;
    private readonly IWorkspaceContext _workspaceContext;

    public BreaksController(IBreakService breakService, TimekeeperContext context, IWorkspaceContext workspaceContext)
    {
        _breakService = breakService;
        _context = context;
        _workspaceContext = workspaceContext;
    }

    private int CurrentUserId => _workspaceContext.UserId ?? 1;

    [HttpGet("active")]
    public async Task<ActionResult<BreakDto>> GetActiveBreak()
    {
        var breakEntity = await _breakService.GetActiveBreakAsync();
        if (breakEntity == null)
            return NotFound();

        return Ok(MapToDto(breakEntity));
    }

    [HttpGet("today")]
    public async Task<ActionResult<List<BreakDto>>> GetTodayBreaks()
    {
        var breaks = await _breakService.GetTodayBreaksAsync();
        return Ok(breaks.Select(MapToDto).ToList());
    }

    [HttpGet("status")]
    public async Task<ActionResult<object>> GetStatus()
    {
        var isOnBreak = await _breakService.IsOnBreakAsync();
        var activeBreak = await _breakService.GetActiveBreakAsync();
        var todayBreaks = await _breakService.GetTodayBreaksAsync();
        
        // Calculate total break minutes today
        var totalBreakMinutesToday = todayBreaks
            .Where(b => b.EndTime.HasValue)
            .Sum(b => (int)b.Duration.TotalMinutes);
        
        // Calculate continuous work minutes (time since check-in or last break end)
        double? continuousWorkMinutes = null;
        double? timeSinceLastBreakMinutes = null;
        
        // Get the work day to find check-in time
        var workDay = await _context.WorkDays
            .Where(w => w.UserId == CurrentUserId && w.CheckInTime.HasValue && w.CheckInTime.Value.Date == DateTime.Today)
            .OrderByDescending(w => w.CheckInTime)
            .FirstOrDefaultAsync();
        
        if (workDay?.CheckInTime != null)
        {
            var lastBreak = todayBreaks.OrderByDescending(b => b.EndTime ?? b.StartTime).FirstOrDefault();
            var referenceTime = lastBreak?.EndTime ?? workDay.CheckInTime.Value;
            
            if (!isOnBreak)
            {
                continuousWorkMinutes = (DateTime.Now - referenceTime).TotalMinutes;
            }
            
            if (lastBreak?.EndTime.HasValue == true)
            {
                timeSinceLastBreakMinutes = (DateTime.Now - lastBreak.EndTime.Value).TotalMinutes;
            }
            else
            {
                // No breaks taken yet, use time since check-in
                timeSinceLastBreakMinutes = (DateTime.Now - workDay.CheckInTime.Value).TotalMinutes;
            }
        }

        return Ok(new
        {
            isOnBreak,
            breakStartTime = activeBreak?.StartTime,
            totalBreakMinutesToday,
            continuousWorkMinutes,
            timeSinceLastBreakMinutes
        });
    }

    [HttpPost("start")]
    public async Task<ActionResult<BreakDto>> StartBreak([FromBody] BreakNotesDto? dto = null)
    {
        try
        {
            var breakEntity = await _breakService.StartBreakAsync(dto?.Notes);
            return Ok(MapToDto(breakEntity));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("end")]
    public async Task<ActionResult<BreakDto>> EndBreak([FromBody] BreakNotesDto? dto = null)
    {
        try
        {
            var breakEntity = await _breakService.EndBreakAsync(dto?.Notes);
            return Ok(MapToDto(breakEntity));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteBreak(int id)
    {
        try
        {
            await _breakService.DeleteBreakAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static BreakDto MapToDto(Core.Models.Break breakEntity)
    {
        return new BreakDto
        {
            Id = breakEntity.Id,
            StartTime = breakEntity.StartTime,
            EndTime = breakEntity.EndTime,
            Notes = breakEntity.Notes,
            WorkDayId = breakEntity.WorkDayId,
            DurationMinutes = (int)breakEntity.Duration.TotalMinutes,
            IsActive = breakEntity.IsActive
        };
    }
}

public class BreakNotesDto
{
    public string? Notes { get; set; }
}
