using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Api.Auth;
using Timekeeper.Api.DTOs;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;
using Timekeeper.Core.Services;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkspacesController : ControllerBase
{
    private readonly TimekeeperContext _context;
    private readonly IWorkspaceContext _workspaceContext;

    public WorkspacesController(TimekeeperContext context, IWorkspaceContext workspaceContext)
    {
        _context = context;
        _workspaceContext = workspaceContext;
    }

    [HttpGet("current")]
    public async Task<ActionResult<CurrentWorkspaceContextDto>> GetCurrentWorkspaceContext()
    {
        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == _workspaceContext.WorkspaceId);

        if (workspace == null)
        {
            return NotFound("Workspace not found.");
        }

        var email = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        var role = User.FindFirstValue(ClaimTypes.Role) ?? UserRole.Member.ToString();
        var userIdValue = User.FindFirstValue(AuthClaimTypes.UserId);

        WorkspaceUserDto currentUser;
        if (int.TryParse(userIdValue, out var userId) && userId > 0)
        {
            var appUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userId);

            currentUser = appUser != null
                ? MapUser(appUser)
                : new WorkspaceUserDto
                {
                    Id = userId,
                    Email = email,
                    DisplayName = email,
                    Role = role,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
        }
        else
        {
            currentUser = new WorkspaceUserDto
            {
                Id = 0,
                Email = email,
                DisplayName = email,
                Role = role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
        }

        return Ok(new CurrentWorkspaceContextDto
        {
            Workspace = new WorkspaceDto
            {
                Id = workspace.Id,
                Name = workspace.Name,
                IsActive = workspace.IsActive,
                CreatedAt = workspace.CreatedAt
            },
            CurrentUser = currentUser
        });
    }

    [HttpGet("current/users")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<IEnumerable<WorkspaceUserDto>>> GetCurrentWorkspaceUsers()
    {
        var users = await _context.Users
            .OrderBy(u => u.DisplayName)
            .ToListAsync();

        return Ok(users.Select(MapUser));
    }

    [HttpPost("current/users")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<WorkspaceUserDto>> CreateWorkspaceUser([FromBody] CreateWorkspaceUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DisplayName) || string.IsNullOrWhiteSpace(dto.Email))
        {
            return BadRequest("DisplayName and Email are required.");
        }

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var parsedRole))
        {
            return BadRequest("Invalid role. Use Admin, Manager, or Member.");
        }

        var email = dto.Email.Trim().ToLowerInvariant();
        var exists = await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == email && u.WorkspaceId == _workspaceContext.WorkspaceId);
        if (exists)
        {
            return BadRequest("A user with this email already exists in this workspace.");
        }

        var user = new AppUser
        {
            DisplayName = dto.DisplayName.Trim(),
            Email = email,
            Role = parsedRole,
            WorkspaceId = _workspaceContext.WorkspaceId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCurrentWorkspaceUsers), new { id = user.Id }, MapUser(user));
    }

    [HttpPut("current/users/{id:int}/role")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<WorkspaceUserDto>> UpdateWorkspaceUserRole(int id, [FromBody] UpdateWorkspaceUserRoleDto dto)
    {
        if (!Enum.TryParse<UserRole>(dto.Role, true, out var parsedRole))
        {
            return BadRequest("Invalid role. Use Admin, Manager, or Member.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound();
        }

        user.Role = parsedRole;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapUser(user));
    }

    [HttpPut("current/users/{id:int}/status")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<WorkspaceUserDto>> UpdateWorkspaceUserStatus(int id, [FromBody] UpdateWorkspaceUserStatusDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound();
        }

        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapUser(user));
    }

    private static WorkspaceUserDto MapUser(AppUser user)
    {
        return new WorkspaceUserDto
        {
            Id = user.Id,
            DisplayName = user.DisplayName,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }
}
