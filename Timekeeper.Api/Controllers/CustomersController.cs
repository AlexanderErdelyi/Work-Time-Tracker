using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Api.DTOs;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly TimekeeperContext _context;

    public CustomersController(TimekeeperContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers([FromQuery] bool? isActive = null, [FromQuery] string? search = null)
    {
        var query = _context.Customers.AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(c => c.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c => c.Name.Contains(search) || (c.Description != null && c.Description.Contains(search)));
        }

        var customers = await query
            .OrderBy(c => c.Name)
            .Select(c => new CustomerDto
            {
                Id = c.Id,
                No = c.No,
                Name = c.Name,
                Description = c.Description,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();

        return Ok(customers);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CustomerDto>> GetCustomer(int id)
    {
        var customer = await _context.Customers.FindAsync(id);

        if (customer == null)
        {
            return NotFound();
        }

        return Ok(new CustomerDto
        {
            Id = customer.Id,
            No = customer.No,
            Name = customer.Name,
            Description = customer.Description,
            IsActive = customer.IsActive,
            CreatedAt = customer.CreatedAt,
            UpdatedAt = customer.UpdatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> CreateCustomer(CreateCustomerDto dto)
    {
        var customer = new Customer
        {
            No = dto.No,
            Name = dto.Name,
            Description = dto.Description
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        var result = new CustomerDto
        {
            Id = customer.Id,
            No = customer.No,
            Name = customer.Name,
            Description = customer.Description,
            IsActive = customer.IsActive,
            CreatedAt = customer.CreatedAt,
            UpdatedAt = customer.UpdatedAt
        };

        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomer(int id, UpdateCustomerDto dto)
    {
        var customer = await _context.Customers.FindAsync(id);

        if (customer == null)
        {
            return NotFound();
        }

        if (dto.No != null) customer.No = dto.No;
        if (dto.Name != null) customer.Name = dto.Name;
        if (dto.Description != null) customer.Description = dto.Description;
        if (dto.IsActive.HasValue) customer.IsActive = dto.IsActive.Value;
        customer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var customer = await _context.Customers.FindAsync(id);

        if (customer == null)
        {
            return NotFound();
        }

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkDeleteCustomers([FromBody] int[] customerIds)
    {
        if (customerIds == null || customerIds.Length == 0)
        {
            return BadRequest("No customer IDs provided");
        }

        var deletedCount = 0;
        var errors = new List<string>();

        foreach (var customerId in customerIds)
        {
            try
            {
                var customer = await _context.Customers
                    .Include(c => c.Projects)
                        .ThenInclude(p => p.Tasks)
                            .ThenInclude(t => t.TimeEntries)
                    .FirstOrDefaultAsync(c => c.Id == customerId);

                if (customer == null)
                {
                    errors.Add($"Customer with ID {customerId} not found");
                    continue;
                }

                // Delete all time entries for all tasks in all projects
                foreach (var project in customer.Projects)
                {
                    foreach (var task in project.Tasks)
                    {
                        _context.TimeEntries.RemoveRange(task.TimeEntries);
                    }
                    // Delete all tasks in the project
                    _context.Tasks.RemoveRange(project.Tasks);
                }

                // Delete all projects for the customer
                _context.Projects.RemoveRange(customer.Projects);

                // Delete the customer
                _context.Customers.Remove(customer);

                deletedCount++;
            }
            catch (Exception ex)
            {
                errors.Add($"Error deleting customer {customerId}: {ex.Message}");
            }
        }

        await _context.SaveChangesAsync();

        if (errors.Any())
        {
            return Ok(new
            {
                deletedCount,
                errors
            });
        }

        return Ok(new { deletedCount });
    }
}
