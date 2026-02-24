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

    public HeaderAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var userEmail = Request.Headers.TryGetValue(UserHeader, out var userHeaderValue)
            ? userHeaderValue.ToString().Trim()
            : "admin@local.timekeeper";

        if (string.IsNullOrWhiteSpace(userEmail))
        {
            userEmail = "admin@local.timekeeper";
        }

        var workspaceId = 1;
        if (Request.Headers.TryGetValue(WorkspaceHeader, out var workspaceHeaderValue)
            && int.TryParse(workspaceHeaderValue.ToString(), out var parsedWorkspaceId)
            && parsedWorkspaceId > 0)
        {
            workspaceId = parsedWorkspaceId;
        }

        string? requestedRole = null;
        if (Request.Headers.TryGetValue(RoleHeader, out var roleHeaderValue)
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
            var shouldAutoProvision = !userEmail.Equals("admin@local.timekeeper", StringComparison.OrdinalIgnoreCase)
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
        }

        var userId = user?.Id ?? (userEmail.Equals("admin@local.timekeeper", StringComparison.OrdinalIgnoreCase) ? 1 : 0);

        var role = user?.Role.ToString()
            ?? requestedRole
            ?? (userEmail.Equals("admin@local.timekeeper", StringComparison.OrdinalIgnoreCase)
                ? UserRole.Admin.ToString()
                : UserRole.Member.ToString());

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
