using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Api.DTOs;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly TimekeeperContext _context;

    public TasksController(TimekeeperContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasks(
        [FromQuery] int? projectId = null, 
        [FromQuery] bool? isActive = null, 
        [FromQuery] string? search = null)
    {
        var query = _context.Tasks
            .Include(t => t.Project)
                .ThenInclude(p => p.Customer)
            .AsQueryable();

        if (projectId.HasValue)
        {
            query = query.Where(t => t.ProjectId == projectId.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(t => t.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(t => t.Name.Contains(search) || 
                                    (t.Description != null && t.Description.Contains(search)) ||
                                    (t.Position != null && t.Position.Contains(search)) ||
                                    (t.ProcurementNumber != null && t.ProcurementNumber.Contains(search)));
        }

        var tasks = await query
            .OrderBy(t => t.Name)
            .Select(t => new TaskDto
            {
                Id = t.Id,
                Name = t.Name,
                Description = t.Description,
                Position = t.Position,
                ProcurementNumber = t.ProcurementNumber,
                ProjectId = t.ProjectId,
                ProjectName = t.Project.Name,
                CustomerName = t.Project.Customer.Name,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            })
            .ToListAsync();

        return Ok(tasks);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(int id)
    {
        var task = await _context.Tasks
            .Include(t => t.Project)
                .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null)
        {
            return NotFound();
        }

        return Ok(new TaskDto
        {
            Id = task.Id,
            Name = task.Name,
            Description = task.Description,
            Position = task.Position,
            ProcurementNumber = task.ProcurementNumber,
            ProjectId = task.ProjectId,
            ProjectName = task.Project.Name,
            CustomerName = task.Project.Customer.Name,
            IsActive = task.IsActive,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask(CreateTaskDto dto)
    {
        var project = await _context.Projects.Include(p => p.Customer).FirstOrDefaultAsync(p => p.Id == dto.ProjectId);
        if (project == null)
        {
            return BadRequest("Project not found");
        }

        var task = new TaskItem
        {
            Name = dto.Name,
            Description = dto.Description,
            Position = dto.Position,
            ProcurementNumber = dto.ProcurementNumber,
            ProjectId = dto.ProjectId
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        var result = await _context.Tasks
            .Include(t => t.Project)
                .ThenInclude(p => p.Customer)
            .FirstAsync(t => t.Id == task.Id);

        var taskDto = new TaskDto
        {
            Id = result.Id,
            Name = result.Name,
            Description = result.Description,
            Position = result.Position,
            ProcurementNumber = result.ProcurementNumber,
            ProjectId = result.ProjectId,
            ProjectName = result.Project.Name,
            CustomerName = result.Project.Customer.Name,
            IsActive = result.IsActive,
            CreatedAt = result.CreatedAt,
            UpdatedAt = result.UpdatedAt
        };

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, taskDto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, UpdateTaskDto dto)
    {
        var task = await _context.Tasks.FindAsync(id);

        if (task == null)
        {
            return NotFound();
        }

        if (dto.ProjectId.HasValue)
        {
            var project = await _context.Projects.FindAsync(dto.ProjectId.Value);
            if (project == null)
            {
                return BadRequest("Project not found");
            }
            task.ProjectId = dto.ProjectId.Value;
        }

        if (dto.Name != null) task.Name = dto.Name;
        if (dto.Description != null) task.Description = dto.Description;
        if (dto.Position != null) task.Position = dto.Position;
        if (dto.ProcurementNumber != null) task.ProcurementNumber = dto.ProcurementNumber;
        if (dto.IsActive.HasValue) task.IsActive = dto.IsActive.Value;
        task.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _context.Tasks.FindAsync(id);

        if (task == null)
        {
            return NotFound();
        }

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
