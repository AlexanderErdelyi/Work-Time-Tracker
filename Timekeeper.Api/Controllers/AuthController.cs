using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Api.DTOs;
using Timekeeper.Api.Services;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string ExternalCookieScheme = "ExternalCookie";
    private const string GitHubScheme = "GitHub";
    private const string MicrosoftScheme = "Microsoft";
    private const string WindowsScheme = NegotiateDefaults.AuthenticationScheme;

    private readonly TimekeeperContext _context;
    private readonly IPasswordHashService _passwordHashService;
    private readonly IAuthenticationSchemeProvider _schemeProvider;
    private readonly IWindowsDirectoryAuthService _windowsDirectoryAuthService;

    public AuthController(
        TimekeeperContext context,
        IPasswordHashService passwordHashService,
        IAuthenticationSchemeProvider schemeProvider,
        IWindowsDirectoryAuthService windowsDirectoryAuthService)
    {
        _context = context;
        _passwordHashService = passwordHashService;
        _schemeProvider = schemeProvider;
        _windowsDirectoryAuthService = windowsDirectoryAuthService;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterAccountDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DisplayName) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest("DisplayName, Email, and Password are required.");
        }

        if (dto.Password.Length < 8)
        {
            return BadRequest("Password must be at least 8 characters long.");
        }

        var workspaceId = dto.WorkspaceId > 0 ? dto.WorkspaceId : 1;
        var email = dto.Email.Trim().ToLowerInvariant();

        var existingUser = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.WorkspaceId == workspaceId && u.Email == email);

        if (existingUser != null)
        {
            return BadRequest("An account with this email already exists.");
        }

        var user = new AppUser
        {
            DisplayName = dto.DisplayName.Trim(),
            Email = email,
            WorkspaceId = workspaceId,
            Role = UserRole.Member,
            IsActive = true,
            PasswordHash = _passwordHashService.HashPassword(dto.Password),
            CreatedAt = DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new AuthResponseDto
        {
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = user.Role.ToString(),
            WorkspaceId = user.WorkspaceId,
            Method = "email"
        });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginWithPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest("Email and Password are required.");
        }

        var workspaceId = dto.WorkspaceId > 0 ? dto.WorkspaceId : 1;
        var email = dto.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.WorkspaceId == workspaceId && u.Email == email);

        if (user == null)
        {
            return Unauthorized("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            return Unauthorized("This account is deactivated.");
        }

        if (string.IsNullOrWhiteSpace(user.PasswordHash) || !_passwordHashService.VerifyPassword(dto.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid email or password.");
        }

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new AuthResponseDto
        {
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = user.Role.ToString(),
            WorkspaceId = user.WorkspaceId,
            Method = "email"
        });
    }

    [AllowAnonymous]
    [HttpGet("external/providers")]
    public async Task<ActionResult<object>> GetExternalProviders()
    {
        var github = await _schemeProvider.GetSchemeAsync(GitHubScheme) != null;
        var microsoft = await _schemeProvider.GetSchemeAsync(MicrosoftScheme) != null;
        var windows = await _schemeProvider.GetSchemeAsync(WindowsScheme) != null;
        var windowsCredentials = _windowsDirectoryAuthService.IsEnabled;

        return Ok(new
        {
            github,
            microsoft,
            windows,
            windowsCredentials
        });
    }

    [AllowAnonymous]
    [HttpGet("windows/current-user")]
    public async Task<ActionResult<object>> GetCurrentWindowsUser()
    {
        string? identityName = null;

        var windowsAuth = await HttpContext.AuthenticateAsync(WindowsScheme);
        if (windowsAuth.Succeeded && windowsAuth.Principal != null)
        {
            identityName = windowsAuth.Principal.FindFirstValue(ClaimTypes.Upn)
                ?? windowsAuth.Principal.FindFirstValue(ClaimTypes.Name)
                ?? windowsAuth.Principal.Identity?.Name;
        }

        identityName ??= Request.Headers["X-Remote-User"].FirstOrDefault();
        identityName ??= Request.Headers["X-Windows-User"].FirstOrDefault();

        string? username = null;
        string? domain = null;

        if (!string.IsNullOrWhiteSpace(identityName))
        {
            var normalized = identityName.Trim();

            if (normalized.Contains('\\'))
            {
                var parts = normalized.Split('\\', 2, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    domain = parts[0];
                    username = parts[1];
                }
            }
            else if (normalized.Contains('@'))
            {
                var parts = normalized.Split('@', 2, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    username = parts[0];
                    domain = parts[1];
                }
            }
            else
            {
                username = normalized;
            }
        }

        return Ok(new
        {
            username,
            domain
        });
    }

    [AllowAnonymous]
    [HttpPost("windows-credentials/signin")]
    public async Task<ActionResult<AuthResponseDto>> SignInWithWindowsCredentials([FromBody] WindowsCredentialsAuthDto dto)
    {
        return await HandleWindowsCredentialsAuth(dto, createIfMissing: false);
    }

    [AllowAnonymous]
    [HttpPost("windows-credentials/signup")]
    public async Task<ActionResult<AuthResponseDto>> SignUpWithWindowsCredentials([FromBody] WindowsCredentialsAuthDto dto)
    {
        return await HandleWindowsCredentialsAuth(dto, createIfMissing: true);
    }

    [AllowAnonymous]
    [HttpGet("external/{provider}")]
    public async Task<IActionResult> ExternalLogin(
        string provider,
        [FromQuery] string mode = "signin",
        [FromQuery] int workspaceId = 1,
        [FromQuery] string? returnUrl = null,
        [FromQuery] string? email = null,
        [FromQuery] string? displayName = null)
    {
        var scheme = provider.ToLowerInvariant() switch
        {
            "github" => GitHubScheme,
            "microsoft" => MicrosoftScheme,
            _ => string.Empty
        };

        if (string.IsNullOrWhiteSpace(scheme))
        {
            return BadRequest("Unsupported external provider.");
        }

        var registeredScheme = await _schemeProvider.GetSchemeAsync(scheme);
        if (registeredScheme == null)
        {
            return BadRequest($"{provider} login is not configured on this server.");
        }

        if (workspaceId <= 0)
        {
            workspaceId = 1;
        }

        var redirectUri = Url.Action(nameof(ExternalCallback), "Auth")!;
        var properties = new AuthenticationProperties
        {
            RedirectUri = redirectUri
        };
        properties.Items["mode"] = mode.Equals("signup", StringComparison.OrdinalIgnoreCase) ? "signup" : "signin";
        properties.Items["workspaceId"] = workspaceId.ToString();
        properties.Items["returnUrl"] = string.IsNullOrWhiteSpace(returnUrl) ? "http://localhost:5173" : returnUrl;
        properties.Items["provider"] = provider.ToLowerInvariant();

        return Challenge(properties, scheme);
    }

    [AllowAnonymous]
    [HttpGet("windows")]
    public async Task<IActionResult> WindowsLogin(
        [FromQuery] int workspaceId = 1,
        [FromQuery] string mode = "signin",
        [FromQuery] string? returnUrl = null)
    {
        try
        {
            if (workspaceId <= 0)
            {
                workspaceId = 1;
            }

            var normalizedMode = mode.Equals("signup", StringComparison.OrdinalIgnoreCase) ? "signup" : "signin";
            var resolvedReturnUrl = string.IsNullOrWhiteSpace(returnUrl) ? "http://localhost:5173" : returnUrl;

            var authenticateResult = await HttpContext.AuthenticateAsync(WindowsScheme);
            if (!authenticateResult.Succeeded || authenticateResult.Principal == null)
            {
                var redirectUri = Url.Action(
                    nameof(WindowsLogin),
                    "Auth",
                    new { workspaceId, mode = normalizedMode, returnUrl = resolvedReturnUrl })
                    ?? $"/api/auth/windows?workspaceId={workspaceId}&mode={normalizedMode}&returnUrl={Uri.EscapeDataString(resolvedReturnUrl)}";

                return Challenge(new AuthenticationProperties { RedirectUri = redirectUri }, WindowsScheme);
            }

            var principal = authenticateResult.Principal;
            var identityName = principal.FindFirstValue(ClaimTypes.Upn)
                ?? principal.FindFirstValue(ClaimTypes.Name)
                ?? principal.Identity?.Name;

            if (string.IsNullOrWhiteSpace(identityName))
            {
                return Redirect(BuildCallbackUrl(resolvedReturnUrl, success: false, error: "Unable to resolve Windows user identity."));
            }

            var normalizedName = identityName.Trim();
            var localPart = normalizedName.Contains('\\')
                ? normalizedName.Split('\\').Last()
                : normalizedName;
            var safeLocalPart = localPart.ToLowerInvariant().Replace(" ", ".");
            var windowsEmail = principal.FindFirstValue(ClaimTypes.Email)
                ?? principal.FindFirstValue(ClaimTypes.Upn)
                ?? $"{safeLocalPart}@windows.local";
            var externalUserId = principal.FindFirstValue(ClaimTypes.PrimarySid)
                ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? normalizedName;

            var user = await FindOrCreateExternalUserAsync(
                windowsEmail,
                normalizedName,
                workspaceId,
                "windows",
                externalUserId);

            if (user == null)
            {
                return Redirect(BuildCallbackUrl(resolvedReturnUrl, success: false, error: "This account is deactivated."));
            }

            return Redirect(BuildCallbackUrl(
                resolvedReturnUrl,
                success: true,
                email: user.Email,
                displayName: user.DisplayName,
                role: user.Role.ToString(),
                workspaceId: user.WorkspaceId,
                method: "windows",
                mode: normalizedMode));
        }
        catch
        {
            var resolvedReturnUrl = string.IsNullOrWhiteSpace(returnUrl) ? "http://localhost:5173" : returnUrl;
            return Redirect(BuildCallbackUrl(
                resolvedReturnUrl,
                success: false,
                error: "Windows integrated authentication failed for this network/domain context. Use Windows credentials login or email login."));
        }
    }


    private async Task<ActionResult<AuthResponseDto>> HandleWindowsCredentialsAuth(
        WindowsCredentialsAuthDto dto,
        bool createIfMissing)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest("Username and password are required.");
        }

        var workspaceId = dto.WorkspaceId > 0 ? dto.WorkspaceId : 1;
        var validation = await _windowsDirectoryAuthService.ValidateCredentialsAsync(dto.Username, dto.Password, dto.Domain);
        if (!validation.Success)
        {
            if (!string.IsNullOrWhiteSpace(validation.Error)
                && (validation.Error.Contains("unavailable", StringComparison.OrdinalIgnoreCase)
                    || validation.Error.Contains("certificate", StringComparison.OrdinalIgnoreCase)
                    || validation.Error.Contains("tls", StringComparison.OrdinalIgnoreCase)
                    || validation.Error.Contains("ssl", StringComparison.OrdinalIgnoreCase)))
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, validation.Error);
            }

            return Unauthorized(validation.Error ?? "Windows credentials authentication failed.");
        }

        var normalizedEmail = (validation.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return Unauthorized("Windows directory did not return a valid account identity.");
        }

        if (!createIfMissing)
        {
            var existing = await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.WorkspaceId == workspaceId && u.Email == normalizedEmail);

            if (existing == null)
            {
                return Unauthorized("No account exists for this Windows identity in this workspace. Use Create account first.");
            }
        }

        var displayName = !string.IsNullOrWhiteSpace(dto.DisplayName)
            ? dto.DisplayName.Trim()
            : validation.DisplayName;

        var user = await FindOrCreateExternalUserAsync(
            normalizedEmail,
            displayName,
            workspaceId,
            "windows-credentials",
            validation.ExternalUserId ?? normalizedEmail);

        if (user == null)
        {
            return Unauthorized("This account is deactivated.");
        }

        return Ok(new AuthResponseDto
        {
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = user.Role.ToString(),
            WorkspaceId = user.WorkspaceId,
            Method = "windowsCredentials"
        });
    }

    [AllowAnonymous]
    [HttpGet("external-callback")]
    public async Task<IActionResult> ExternalCallback()
    {
        var result = await HttpContext.AuthenticateAsync(ExternalCookieScheme);
        if (!result.Succeeded || result.Principal == null)
        {
            return Redirect(BuildCallbackUrl("http://localhost:5173", success: false, error: "External authentication failed."));
        }

        var properties = result.Properties;
        var mode = GetAuthProperty(properties, "mode", "signin");
        var provider = GetAuthProperty(properties, "provider", "external");
        var returnUrl = GetAuthProperty(properties, "returnUrl", "http://localhost:5173");
        var workspaceId = int.TryParse(GetAuthProperty(properties, "workspaceId", "1"), out var parsedWorkspaceId) && parsedWorkspaceId > 0
            ? parsedWorkspaceId
            : 1;

        var email = result.Principal.FindFirstValue(ClaimTypes.Email)
            ?? result.Principal.FindFirstValue("email")
            ?? string.Empty;
        var displayName = result.Principal.FindFirstValue(ClaimTypes.Name)
            ?? result.Principal.FindFirstValue("name")
            ?? email;
        var externalUserId = result.Principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? result.Principal.FindFirstValue("id")
            ?? string.Empty;

        if (string.IsNullOrWhiteSpace(email))
        {
            await HttpContext.SignOutAsync(ExternalCookieScheme);
            return Redirect(BuildCallbackUrl(returnUrl, success: false, error: "External provider did not return an email."));
        }

        email = email.Trim().ToLowerInvariant();
        var user = await FindOrCreateExternalUserAsync(email, displayName, workspaceId, provider, externalUserId);

        if (user == null)
        {
            await HttpContext.SignOutAsync(ExternalCookieScheme);
            return Redirect(BuildCallbackUrl(returnUrl, success: false, error: "This account is deactivated."));
        }

        await HttpContext.SignOutAsync(ExternalCookieScheme);

        return Redirect(BuildCallbackUrl(
            returnUrl,
            success: true,
            email: user.Email,
            displayName: user.DisplayName,
            role: user.Role.ToString(),
            workspaceId: user.WorkspaceId,
            method: provider,
            mode: mode));
    }

    private async Task<AppUser?> FindOrCreateExternalUserAsync(
        string email,
        string? displayName,
        int workspaceId,
        string provider,
        string externalUserId)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.WorkspaceId == workspaceId && u.Email == normalizedEmail);

        if (user == null)
        {
            user = new AppUser
            {
                DisplayName = string.IsNullOrWhiteSpace(displayName) ? normalizedEmail : displayName!.Trim(),
                Email = normalizedEmail,
                WorkspaceId = workspaceId,
                Role = UserRole.Member,
                IsActive = true,
                ExternalProvider = provider,
                ExternalProviderUserId = externalUserId,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        if (!user.IsActive)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(displayName))
        {
            user.DisplayName = displayName.Trim();
        }

        user.ExternalProvider ??= provider;
        user.ExternalProviderUserId ??= externalUserId;
        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return user;
    }

    private static string GetAuthProperty(AuthenticationProperties? properties, string key, string defaultValue)
    {
        if (properties?.Items.TryGetValue(key, out var value) == true && !string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        return defaultValue;
    }

    private static string BuildCallbackUrl(
        string returnUrl,
        bool success,
        string? email = null,
        string? displayName = null,
        string? role = null,
        int? workspaceId = null,
        string? method = null,
        string? mode = null,
        string? error = null)
    {
        var target = string.IsNullOrWhiteSpace(returnUrl) ? "http://localhost:5173" : returnUrl;
        var query = new Dictionary<string, string?>
        {
            ["auth"] = success ? "success" : "error",
            ["email"] = email,
            ["displayName"] = displayName,
            ["role"] = role,
            ["workspaceId"] = workspaceId?.ToString(),
            ["method"] = method,
            ["mode"] = mode,
            ["error"] = error
        };

        return QueryHelpers.AddQueryString(target, query.Where(kvp => !string.IsNullOrWhiteSpace(kvp.Value))!);
    }
}
