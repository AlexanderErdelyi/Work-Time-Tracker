using System.Security.Claims;
using Timekeeper.Api.Auth;
using Timekeeper.Core.Services;

namespace Timekeeper.Api.Services;

public class HttpWorkspaceContext : IWorkspaceContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpWorkspaceContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int WorkspaceId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(AuthClaimTypes.WorkspaceId);
            return int.TryParse(value, out var workspaceId) && workspaceId > 0 ? workspaceId : 1;
        }
    }

    public int? UserId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(AuthClaimTypes.UserId);
            return int.TryParse(value, out var userId) && userId > 0 ? userId : null;
        }
    }
}
