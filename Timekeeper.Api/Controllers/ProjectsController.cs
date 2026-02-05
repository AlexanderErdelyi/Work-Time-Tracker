using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Api.DTOs;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly TimekeeperContext _context;

    public ProjectsController(TimekeeperContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectDto>>> GetProjects(
        [FromQuery] int? customerId = null, 
        [FromQuery] bool? isActive = null, 
        [FromQuery] string? search = null)
    {
        var query = _context.Projects.Include(p => p.Customer).AsQueryable();

        if (customerId.HasValue)
        {
            query = query.Where(p => p.CustomerId == customerId.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(p => p.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p => p.Name.Contains(search) || (p.Description != null && p.Description.Contains(search)));
        }

        var projects = await query
            .OrderBy(p => p.Name)
            .Select(p => new ProjectDto
            {
                Id = p.Id,
                No = p.No,
                Name = p.Name,
                Description = p.Description,
                CustomerId = p.CustomerId,
                CustomerName = p.Customer.Name,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .ToListAsync();

        return Ok(projects);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> GetProject(int id)
    {
        var project = await _context.Projects
            .Include(p => p.Customer)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null)
        {
            return NotFound();
        }

        return Ok(new ProjectDto
        {
            Id = project.Id,
            No = project.No,
            Name = project.Name,
            Description = project.Description,
            CustomerId = project.CustomerId,
            CustomerName = project.Customer.Name,
            IsActive = project.IsActive,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> CreateProject(CreateProjectDto dto)
    {
        var customer = await _context.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
        {
            return BadRequest("Customer not found");
        }

        var project = new Project
        {
            No = dto.No,
            Name = dto.Name,
            Description = dto.Description,
            CustomerId = dto.CustomerId
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        var result = await _context.Projects
            .Include(p => p.Customer)
            .FirstAsync(p => p.Id == project.Id);

        var projectDto = new ProjectDto
        {
            Id = result.Id,
            No = result.No,
            Name = result.Name,
            Description = result.Description,
            CustomerId = result.CustomerId,
            CustomerName = result.Customer.Name,
            IsActive = result.IsActive,
            CreatedAt = result.CreatedAt,
            UpdatedAt = result.UpdatedAt
        };

        return CreatedAtAction(nameof(GetProject), new { id = project.Id }, projectDto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, UpdateProjectDto dto)
    {
        var project = await _context.Projects.FindAsync(id);

        if (project == null)
        {
            return NotFound();
        }

        if (dto.CustomerId.HasValue)
        {
            var customer = await _context.Customers.FindAsync(dto.CustomerId.Value);
            if (customer == null)
            {
                return BadRequest("Customer not found");
            }
            project.CustomerId = dto.CustomerId.Value;
        }

        if (dto.No != null) project.No = dto.No;
        if (dto.Name != null) project.Name = dto.Name;
        if (dto.Description != null) project.Description = dto.Description;
        if (dto.IsActive.HasValue) project.IsActive = dto.IsActive.Value;
        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await _context.Projects.FindAsync(id);

        if (project == null)
        {
            return NotFound();
        }

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
