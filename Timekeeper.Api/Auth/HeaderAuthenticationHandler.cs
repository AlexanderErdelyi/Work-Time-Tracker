using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Auth;

public class HeaderAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TimekeeperHeader";
    private const string UserHeader = "X-Timekeeper-User";
    private const string WorkspaceHeader = "X-Timekeeper-Workspace";
    private const string RoleHeader = "X-Timekeeper-Role";
    private readonly IWebHostEnvironment _environment;

    public HeaderAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IWebHostEnvironment environment)
        : base(options, logger, encoder)
    {
        _environment = environment;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var hasUserHeader = Request.Headers.TryGetValue(UserHeader, out var userHeaderValue);
        var userEmail = hasUserHeader
            ? userHeaderValue.ToString().Trim()
            : string.Empty;

        if (string.IsNullOrWhiteSpace(userEmail))
        {
            if (_environment.IsDevelopment())
            {
                userEmail = "admin@local.timekeeper";
            }
            else
            {
                return AuthenticateResult.Fail("Missing X-Timekeeper-User header.");
            }
        }

        var workspaceId = 1;
        if (Request.Headers.TryGetValue(WorkspaceHeader, out var workspaceHeaderValue)
            && int.TryParse(workspaceHeaderValue.ToString(), out var parsedWorkspaceId)
            && parsedWorkspaceId > 0)
        {
            workspaceId = parsedWorkspaceId;
        }

        string? requestedRole = null;
        if (_environment.IsDevelopment()
            && Request.Headers.TryGetValue(RoleHeader, out var roleHeaderValue)
            && !string.IsNullOrWhiteSpace(roleHeaderValue))
        {
            var normalized = roleHeaderValue.ToString().Trim();
            if (Enum.TryParse<UserRole>(normalized, true, out var parsedRole))
            {
                requestedRole = parsedRole.ToString();
            }
        }

        var context = Context.RequestServices.GetRequiredService<TimekeeperContext>();
        var user = await context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.WorkspaceId == workspaceId && u.Email == userEmail && u.IsActive);

        if (user == null)
        {
            var shouldAutoProvision = _environment.IsDevelopment()
                && !userEmail.Equals("admin@local.timekeeper", StringComparison.OrdinalIgnoreCase)
                && userEmail.Contains('@');

            if (shouldAutoProvision)
            {
                var initialRole = Enum.TryParse<UserRole>(requestedRole, true, out var parsedRequestedRole)
                    ? parsedRequestedRole
                    : UserRole.Member;

                var displayName = userEmail.Split('@')[0];
                user = new AppUser
                {
                    DisplayName = string.IsNullOrWhiteSpace(displayName) ? userEmail : displayName,
                    Email = userEmail,
                    Role = initialRole,
                    WorkspaceId = workspaceId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                context.Users.Add(user);
                await context.SaveChangesAsync();
            }
            else if (!_environment.IsDevelopment())
            {
                return AuthenticateResult.Fail("Unknown or inactive user.");
            }
        }

        var userId = user?.Id ?? 0;
        var role = user?.Role.ToString() ?? requestedRole ?? UserRole.Member.ToString();

        if (!_environment.IsDevelopment() && user == null)
        {
            return AuthenticateResult.Fail("Unknown user.");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Name, userEmail),
            new(ClaimTypes.Email, userEmail),
            new(ClaimTypes.Role, role),
            new(AuthClaimTypes.UserId, userId.ToString()),
            new(AuthClaimTypes.WorkspaceId, workspaceId.ToString())
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return AuthenticateResult.Success(ticket);
    }
}
