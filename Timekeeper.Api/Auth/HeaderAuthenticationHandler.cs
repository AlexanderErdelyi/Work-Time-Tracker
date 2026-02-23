using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Auth;

public class HeaderAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TimekeeperHeader";
    private const string UserHeader = "X-Timekeeper-User";
    private const string WorkspaceHeader = "X-Timekeeper-Workspace";

    public HeaderAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
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

        var role = userEmail.Equals("admin@local.timekeeper", StringComparison.OrdinalIgnoreCase)
            ? UserRole.Admin.ToString()
            : UserRole.Member.ToString();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "1"),
            new(ClaimTypes.Name, userEmail),
            new(ClaimTypes.Email, userEmail),
            new(ClaimTypes.Role, role),
            new(AuthClaimTypes.UserId, "1"),
            new(AuthClaimTypes.WorkspaceId, workspaceId.ToString())
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
