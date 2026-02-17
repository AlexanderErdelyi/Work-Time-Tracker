using Microsoft.AspNetCore.Mvc;
using Timekeeper.Core.Services;
using Timekeeper.Api.DTOs;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BreaksController : ControllerBase
{
    private readonly IBreakService _breakService;

    public BreaksController(IBreakService breakService)
    {
        _breakService = breakService;
    }

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

        return Ok(new
        {
            isOnBreak,
            activeBreak = activeBreak != null ? MapToDto(activeBreak) : null
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
