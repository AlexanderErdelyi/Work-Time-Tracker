using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Timekeeper.Api.Auth;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;
using Timekeeper.Api.DTOs;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuickActionsController : ControllerBase
{
    private readonly TimekeeperContext _context;

    public QuickActionsController(TimekeeperContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<QuickActionDto>>> GetQuickActions()
    {
        var actions = await _context.QuickActions
            .Include(qa => qa.Task)
                .ThenInclude(t => t!.Project)
                    .ThenInclude(p => p.Customer)
            .OrderBy(qa => qa.SortOrder)
            .ToListAsync();

        return Ok(actions.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<QuickActionDto>> GetQuickAction(int id)
    {
        var action = await _context.QuickActions
            .Include(qa => qa.Task)
                .ThenInclude(t => t!.Project)
                    .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(qa => qa.Id == id);

        if (action == null)
            return NotFound();

        return Ok(MapToDto(action));
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<ActionResult<QuickActionDto>> CreateQuickAction(QuickActionDto dto)
    {
        var action = new QuickAction
        {
            Name = dto.Name,
            Icon = dto.Icon,
            ActionType = Enum.Parse<QuickActionType>(dto.ActionType),
            TaskId = dto.TaskId,
            SortOrder = dto.SortOrder
        };

        _context.QuickActions.Add(action);
        await _context.SaveChangesAsync();

        var created = await _context.QuickActions
            .Include(qa => qa.Task)
                .ThenInclude(t => t!.Project)
                    .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(qa => qa.Id == action.Id);

        return CreatedAtAction(nameof(GetQuickAction), new { id = action.Id }, MapToDto(created!));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<IActionResult> UpdateQuickAction(int id, QuickActionDto dto)
    {
        var action = await _context.QuickActions.FirstOrDefaultAsync(qa => qa.Id == id);
        if (action == null)
            return NotFound();

        action.Name = dto.Name;
        action.Icon = dto.Icon;
        action.ActionType = Enum.Parse<QuickActionType>(dto.ActionType);
        action.TaskId = dto.TaskId;
        action.SortOrder = dto.SortOrder;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<IActionResult> DeleteQuickAction(int id)
    {
        var action = await _context.QuickActions.FirstOrDefaultAsync(qa => qa.Id == id);
        if (action == null)
            return NotFound();

        _context.QuickActions.Remove(action);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("reorder")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOrAdmin)]
    public async Task<IActionResult> ReorderQuickActions([FromBody] List<int> ids)
    {
        for (int i = 0; i < ids.Count; i++)
        {
            var action = await _context.QuickActions.FirstOrDefaultAsync(qa => qa.Id == ids[i]);
            if (action != null)
            {
                action.SortOrder = i;
            }
        }
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static QuickActionDto MapToDto(QuickAction action)
    {
        return new QuickActionDto
        {
            Id = action.Id,
            Name = action.Name,
            Icon = action.Icon,
            ActionType = action.ActionType.ToString(),
            TaskId = action.TaskId,
            SortOrder = action.SortOrder,
            Task = action.Task != null ? new TaskDto
            {
                Id = action.Task.Id,
                Name = action.Task.Name,
                Description = action.Task.Description,
                Position = action.Task.Position,
                ProcurementNumber = action.Task.ProcurementNumber,
                ProjectId = action.Task.ProjectId,
                ProjectName = action.Task.Project?.Name ?? string.Empty,
                ProjectNo = action.Task.Project?.No,
                CustomerName = action.Task.Project?.Customer?.Name ?? string.Empty,
                IsActive = action.Task.IsActive,
                CreatedAt = action.Task.CreatedAt,
                UpdatedAt = action.Task.UpdatedAt
            } : null
        };
    }
}
