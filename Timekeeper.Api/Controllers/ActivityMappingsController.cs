using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Timekeeper.Api.Auth;
using Timekeeper.Api.DTOs;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ActivityMappingsController : ControllerBase
{
    private readonly TimekeeperContext _context;

    public ActivityMappingsController(TimekeeperContext context)
    {
        _context = context;
    }

    // GET /api/activitymappings
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ActivityMappingRuleDto>>> GetRules()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var rules = await _context.ActivityMappingRules
            .Where(r => r.UserId == userId.Value)
            .Include(r => r.MappedCustomer)
            .Include(r => r.MappedProject)
            .Include(r => r.MappedTask)
            .OrderBy(r => r.Priority)
            .ToListAsync();

        return Ok(rules.Select(MapToDto));
    }

    // GET /api/activitymappings/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<ActivityMappingRuleDto>> GetRule(int id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var rule = await _context.ActivityMappingRules
            .Include(r => r.MappedCustomer)
            .Include(r => r.MappedProject)
            .Include(r => r.MappedTask)
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId.Value);

        if (rule is null) return NotFound();

        return Ok(MapToDto(rule));
    }

    // POST /api/activitymappings
    [HttpPost]
    public async Task<ActionResult<ActivityMappingRuleDto>> CreateRule([FromBody] CreateMappingRuleRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        if (!Enum.TryParse<MatchField>(dto.MatchField, out var matchField))
            return BadRequest(new { message = $"Invalid MatchField: {dto.MatchField}" });

        if (!Enum.TryParse<MatchOperator>(dto.MatchOperator, out var matchOperator))
            return BadRequest(new { message = $"Invalid MatchOperator: {dto.MatchOperator}" });

        var workspaceId = GetCurrentWorkspaceId();

        var rule = new ActivityMappingRule
        {
            WorkspaceId = workspaceId ?? 1,
            UserId = userId.Value,
            MatchField = matchField,
            MatchOperator = matchOperator,
            MatchValue = dto.MatchValue,
            MappedCustomerId = dto.MappedCustomerId,
            MappedProjectId = dto.MappedProjectId,
            MappedTaskId = dto.MappedTaskId,
            Priority = dto.Priority,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ActivityMappingRules.Add(rule);
        await _context.SaveChangesAsync();

        // Reload with navigation properties
        var created = await _context.ActivityMappingRules
            .Include(r => r.MappedCustomer)
            .Include(r => r.MappedProject)
            .Include(r => r.MappedTask)
            .FirstOrDefaultAsync(r => r.Id == rule.Id);

        return CreatedAtAction(nameof(GetRule), new { id = rule.Id }, MapToDto(created!));
    }

    // PUT /api/activitymappings/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<ActivityMappingRuleDto>> UpdateRule(int id, [FromBody] UpdateMappingRuleRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var rule = await _context.ActivityMappingRules
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId.Value);

        if (rule is null) return NotFound();

        if (dto.MatchField != null)
        {
            if (!Enum.TryParse<MatchField>(dto.MatchField, out var matchField))
                return BadRequest(new { message = $"Invalid MatchField: {dto.MatchField}" });
            rule.MatchField = matchField;
        }

        if (dto.MatchOperator != null)
        {
            if (!Enum.TryParse<MatchOperator>(dto.MatchOperator, out var matchOperator))
                return BadRequest(new { message = $"Invalid MatchOperator: {dto.MatchOperator}" });
            rule.MatchOperator = matchOperator;
        }

        if (dto.MatchValue != null) rule.MatchValue = dto.MatchValue;
        if (dto.MappedCustomerId.HasValue) rule.MappedCustomerId = dto.MappedCustomerId;
        if (dto.MappedProjectId.HasValue) rule.MappedProjectId = dto.MappedProjectId;
        if (dto.MappedTaskId.HasValue) rule.MappedTaskId = dto.MappedTaskId;
        if (dto.Priority.HasValue) rule.Priority = dto.Priority.Value;
        if (dto.IsActive.HasValue) rule.IsActive = dto.IsActive.Value;
        rule.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updated = await _context.ActivityMappingRules
            .Include(r => r.MappedCustomer)
            .Include(r => r.MappedProject)
            .Include(r => r.MappedTask)
            .FirstOrDefaultAsync(r => r.Id == id);

        return Ok(MapToDto(updated!));
    }

    // DELETE /api/activitymappings/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRule(int id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var rule = await _context.ActivityMappingRules
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId.Value);

        if (rule is null) return NotFound();

        _context.ActivityMappingRules.Remove(rule);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/activitymappings/reorder
    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderRules([FromBody] ReorderMappingRulesRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var ids = dto.Order.Select(o => o.Id).ToList();
        var rules = await _context.ActivityMappingRules
            .Where(r => ids.Contains(r.Id) && r.UserId == userId.Value)
            .ToListAsync();

        foreach (var orderItem in dto.Order)
        {
            var rule = rules.FirstOrDefault(r => r.Id == orderItem.Id);
            if (rule != null)
            {
                rule.Priority = orderItem.Priority;
                rule.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/activitymappings/match-fields
    [HttpGet("match-fields")]
    public ActionResult<IEnumerable<object>> GetMatchFields()
    {
        var fields = Enum.GetValues<MatchField>().Select(f => new { value = f.ToString(), label = FormatFieldLabel(f) });
        var operators = Enum.GetValues<MatchOperator>().Select(o => new { value = o.ToString(), label = o.ToString() });
        return Ok(new { fields, operators });
    }

    private static string FormatFieldLabel(MatchField field) => field switch
    {
        MatchField.Subject => "Subject / Title",
        MatchField.Organizer => "Organizer Email",
        MatchField.EmailDomain => "Email Domain",
        MatchField.CalendarCategory => "Calendar Category",
        MatchField.AdoProject => "ADO Project",
        MatchField.RepoName => "Repository Name",
        MatchField.Attendee => "Attendee Email",
        _ => field.ToString()
    };

    private int? GetCurrentUserId()
    {
        var value = User.FindFirstValue(AuthClaimTypes.UserId);
        return int.TryParse(value, out var id) ? id : null;
    }

    private int? GetCurrentWorkspaceId()
    {
        var value = User.FindFirstValue(AuthClaimTypes.WorkspaceId);
        return int.TryParse(value, out var id) ? id : null;
    }

    private static ActivityMappingRuleDto MapToDto(ActivityMappingRule r) => new()
    {
        Id = r.Id,
        MatchField = r.MatchField.ToString(),
        MatchOperator = r.MatchOperator.ToString(),
        MatchValue = r.MatchValue,
        MappedCustomerId = r.MappedCustomerId,
        MappedCustomerName = r.MappedCustomer?.Name,
        MappedProjectId = r.MappedProjectId,
        MappedProjectName = r.MappedProject?.Name,
        MappedTaskId = r.MappedTaskId,
        MappedTaskName = r.MappedTask?.Name,
        Priority = r.Priority,
        IsActive = r.IsActive,
        CreatedAt = r.CreatedAt
    };
}
