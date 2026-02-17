using Microsoft.AspNetCore.Mvc;
using Timekeeper.Core.Services;
using Timekeeper.Api.DTOs;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkDaysController : ControllerBase
{
    private readonly IWorkDayService _workDayService;

    public WorkDaysController(IWorkDayService workDayService)
    {
        _workDayService = workDayService;
    }

    [HttpGet("today")]
    public async Task<ActionResult<WorkDayDto>> GetTodayWorkDay()
    {
        var workDay = await _workDayService.GetTodayWorkDayAsync();
        if (workDay == null)
            return NotFound();

        return Ok(MapToDto(workDay));
    }

    [HttpGet]
    public async Task<ActionResult<List<WorkDayDto>>> GetWorkDays(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var workDays = await _workDayService.GetWorkDaysAsync(startDate, endDate);
        return Ok(workDays.Select(MapToDto).ToList());
    }

    [HttpGet("status")]
    public async Task<ActionResult<object>> GetStatus()
    {
        var isCheckedIn = await _workDayService.IsCheckedInAsync();
        var workDay = await _workDayService.GetTodayWorkDayAsync();

        return Ok(new
        {
            isCheckedIn,
            checkInTime = workDay?.CheckInTime,
            totalMinutesToday = workDay?.TotalWorkedMinutes ?? 0,
            workDay = workDay != null ? MapToDto(workDay) : null
        });
    }

    [HttpPost("checkin")]
    public async Task<ActionResult<WorkDayDto>> CheckIn([FromBody] CheckInOutDto? dto = null)
    {
        var workDay = await _workDayService.CheckInAsync(dto?.Time, dto?.Notes);
        return Ok(MapToDto(workDay));
    }

    [HttpPost("checkout")]
    public async Task<ActionResult<WorkDayDto>> CheckOut([FromBody] CheckInOutDto? dto = null)
    {
        try
        {
            var workDay = await _workDayService.CheckOutAsync(dto?.Time, dto?.Notes);
            return Ok(MapToDto(workDay));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<WorkDayDto>> UpdateWorkDay(int id, [FromBody] UpdateWorkDayDto dto)
    {
        try
        {
            var workDay = await _workDayService.UpdateWorkDayAsync(id, dto.CheckInTime, dto.CheckOutTime, dto.Notes);
            if (workDay == null)
                return NotFound();
            
            return Ok(MapToDto(workDay));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteWorkDay(int id)
    {
        try
        {
            await _workDayService.DeleteWorkDayAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static WorkDayDto MapToDto(Core.Models.WorkDay workDay)
    {
        return new WorkDayDto
        {
            Id = workDay.Id,
            Date = workDay.Date,
            CheckInTime = workDay.CheckInTime,
            CheckOutTime = workDay.CheckOutTime,
            Notes = workDay.Notes,
            TotalWorkedMinutes = workDay.TotalWorkedMinutes,
            IsCheckedIn = workDay.IsCheckedIn
        };
    }
}

public class CheckInOutDto
{
    public DateTime? Time { get; set; }
    public string? Notes { get; set; }
}

public class UpdateWorkDayDto
{
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public string? Notes { get; set; }
}
