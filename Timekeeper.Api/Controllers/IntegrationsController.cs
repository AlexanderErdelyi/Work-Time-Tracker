using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using Timekeeper.Api.Auth;
using Timekeeper.Api.DTOs;
using Timekeeper.Api.Services;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IntegrationsController : ControllerBase
{
    private readonly TimekeeperContext _context;
    private readonly IOAuthTokenProtector _tokenProtector;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IGraphApiClient _graphClient;
    private readonly ILogger<IntegrationsController> _logger;

    public IntegrationsController(
        TimekeeperContext context,
        IOAuthTokenProtector tokenProtector,
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        IGraphApiClient graphClient,
        ILogger<IntegrationsController> logger)
    {
        _context = context;
        _tokenProtector = tokenProtector;
        _config = config;
        _httpClientFactory = httpClientFactory;
        _graphClient = graphClient;
        _logger = logger;
    }

    // GET /api/integrations
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserIntegrationDto>>> GetIntegrations()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var integrations = await _context.UserIntegrations
            .Where(i => i.UserId == userId.Value)
            .ToListAsync();

        // Ensure all providers are represented in the response
        var providers = Enum.GetValues<IntegrationProvider>();
        var result = providers.Select(p =>
        {
            var existing = integrations.FirstOrDefault(i => i.Provider == p);
            if (existing is null)
            {
                return new UserIntegrationDto
                {
                    Provider = p.ToString(),
                    IsConnected = false,
                    EnabledSources = [],
                };
            }

            return new UserIntegrationDto
            {
                Id = existing.Id,
                Provider = existing.Provider.ToString(),
                IsConnected = existing.IsActive,
                EnabledSources = ParseEnabledSources(existing.EnabledSourcesJson),
                LastSyncedAt = existing.LastSyncedAt,
                ExpiresAt = existing.ExpiresAt,
            };
        });

        return Ok(result);
    }

    // GET /api/integrations/oauth-url/microsoft-graph
    [HttpGet("oauth-url/microsoft-graph")]
    public ActionResult<object> GetMicrosoftGraphOAuthUrl([FromQuery] string redirectUri)
    {
        var clientId = _config["ActivitySync:MicrosoftGraph:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            return BadRequest(new { message = "Microsoft Graph OAuth not configured. Set ActivitySync:MicrosoftGraph:ClientId in settings." });

        var scopes = "Calendars.Read offline_access";
        var url = $"https://login.microsoftonline.com/common/oauth2/v2.0/authorize" +
                  $"?client_id={Uri.EscapeDataString(clientId)}" +
                  $"&response_type=code" +
                  $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                  $"&scope={Uri.EscapeDataString(scopes)}" +
                  $"&response_mode=query";

        return Ok(new { url });
    }

    // GET /api/integrations/pkce-url/microsoft-graph
    [HttpGet("pkce-url/microsoft-graph")]
    public ActionResult<object> GetMicrosoftGraphPkceUrl([FromQuery] string redirectUri, [FromQuery] string codeChallenge)
    {
        var clientId = _config["ActivitySync:MicrosoftGraph:PublicClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            return BadRequest(new { message = "Microsoft Graph PKCE not configured. Set ActivitySync:MicrosoftGraph:PublicClientId in settings." });

        var scopes = "Calendars.Read offline_access User.Read";
        var url = $"https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
                  + $"?client_id={Uri.EscapeDataString(clientId)}"
                  + $"&response_type=code"
                  + $"&redirect_uri={Uri.EscapeDataString(redirectUri)}"
                  + $"&scope={Uri.EscapeDataString(scopes)}"
                  + $"&response_mode=query"
                  + $"&code_challenge={Uri.EscapeDataString(codeChallenge)}"
                  + $"&code_challenge_method=S256"
                  + $"&state=pkce-graph";

        return Ok(new { url });
    }

    // POST /api/integrations/connect/microsoft-graph-pkce
    [HttpPost("connect/microsoft-graph-pkce")]
    public async Task<ActionResult<UserIntegrationDto>> ConnectMicrosoftGraphPkce([FromBody] ConnectWithPkceRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var clientId = _config["ActivitySync:MicrosoftGraph:PublicClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            return BadRequest(new { message = "Microsoft Graph PKCE not configured." });

        try
        {
            var client = _httpClientFactory.CreateClient("graph");
            var formData = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["client_id"] = clientId,
                ["code"] = dto.Code,
                ["redirect_uri"] = dto.RedirectUri,
                ["code_verifier"] = dto.CodeVerifier,
            });

            var response = await client.PostAsync("https://login.microsoftonline.com/common/oauth2/v2.0/token", formData);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("PKCE token exchange failed: {Content}", errorContent);
                // Extract a human-readable error from Microsoft's response
                string errorMsg;
                try
                {
                    using var errDoc = JsonDocument.Parse(errorContent);
                    var errRoot = errDoc.RootElement;
                    var errCode = errRoot.TryGetProperty("error", out var ec) ? ec.GetString() : null;
                    var errDesc = errRoot.TryGetProperty("error_description", out var ed) ? ed.GetString() : null;
                    errorMsg = errDesc ?? errCode ?? errorContent;
                    // Trim the verbose AADSTS trace ID lines
                    var nl = errorMsg.IndexOf('\n');
                    if (nl > 0) errorMsg = errorMsg[..nl].Trim();
                }
                catch { errorMsg = errorContent.Length > 300 ? errorContent[..300] : errorContent; }
                return BadRequest(new { message = $"Microsoft login failed: {errorMsg}" });
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = doc.RootElement;

            var accessToken = root.GetProperty("access_token").GetString()!;
            var refreshToken = root.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null;
            var expiresIn = root.GetProperty("expires_in").GetInt32();

            var workspaceId = GetCurrentWorkspaceId();
            var existing = await _context.UserIntegrations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(i => i.UserId == userId.Value && i.Provider == IntegrationProvider.MicrosoftGraph);

            if (existing != null)
            {
                existing.AccessToken = _tokenProtector.Protect(accessToken);
                existing.RefreshToken = refreshToken != null ? _tokenProtector.Protect(refreshToken) : existing.RefreshToken;
                existing.ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
                existing.IsActive = true;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                existing = new UserIntegration
                {
                    WorkspaceId = workspaceId ?? 1,
                    UserId = userId.Value,
                    Provider = IntegrationProvider.MicrosoftGraph,
                    AccessToken = _tokenProtector.Protect(accessToken),
                    RefreshToken = refreshToken != null ? _tokenProtector.Protect(refreshToken) : null,
                    ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                    EnabledSourcesJson = JsonSerializer.Serialize(new[] { "OutlookCalendar", "TeamsMeeting" }),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserIntegrations.Add(existing);
            }

            await _context.SaveChangesAsync();

            return Ok(new UserIntegrationDto
            {
                Id = existing.Id,
                Provider = "MicrosoftGraph",
                IsConnected = true,
                EnabledSources = ParseEnabledSources(existing.EnabledSourcesJson),
                ExpiresAt = existing.ExpiresAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting Microsoft Graph via PKCE for user {UserId}.", userId);
            return StatusCode(500, new { message = "Internal error connecting integration." });
        }
    }

    // POST /api/integrations/connect/microsoft-graph
    [HttpPost("connect/microsoft-graph")]
    public async Task<ActionResult<UserIntegrationDto>> ConnectMicrosoftGraph([FromBody] ConnectIntegrationRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var clientId = _config["ActivitySync:MicrosoftGraph:ClientId"];
        var clientSecret = _config["ActivitySync:MicrosoftGraph:ClientSecret"];
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            return BadRequest(new { message = "Microsoft Graph OAuth not configured." });

        try
        {
            var client = _httpClientFactory.CreateClient("graph");
            var formData = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["code"] = dto.Code,
                ["redirect_uri"] = dto.RedirectUri,
                ["scope"] = "Calendars.Read offline_access"
            });

            var response = await client.PostAsync("https://login.microsoftonline.com/common/oauth2/v2.0/token", formData);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to exchange code for Microsoft Graph tokens: {Content}", errorContent);
                return BadRequest(new { message = "Failed to exchange authorization code." });
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = doc.RootElement;

            var accessToken = root.GetProperty("access_token").GetString()!;
            var refreshToken = root.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null;
            var expiresIn = root.GetProperty("expires_in").GetInt32();

            var existing = await _context.UserIntegrations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(i => i.UserId == userId.Value && i.Provider == IntegrationProvider.MicrosoftGraph);

            var workspaceId = GetCurrentWorkspaceId();

            if (existing != null)
            {
                existing.AccessToken = _tokenProtector.Protect(accessToken);
                existing.RefreshToken = refreshToken != null ? _tokenProtector.Protect(refreshToken) : existing.RefreshToken;
                existing.ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
                existing.IsActive = true;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                existing = new UserIntegration
                {
                    WorkspaceId = workspaceId ?? 1,
                    UserId = userId.Value,
                    Provider = IntegrationProvider.MicrosoftGraph,
                    AccessToken = _tokenProtector.Protect(accessToken),
                    RefreshToken = refreshToken != null ? _tokenProtector.Protect(refreshToken) : null,
                    ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                    EnabledSourcesJson = JsonSerializer.Serialize(new[] { "OutlookCalendar", "TeamsMeeting" }),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserIntegrations.Add(existing);
            }

            await _context.SaveChangesAsync();

            return Ok(new UserIntegrationDto
            {
                Id = existing.Id,
                Provider = "MicrosoftGraph",
                IsConnected = true,
                EnabledSources = ParseEnabledSources(existing.EnabledSourcesJson),
                ExpiresAt = existing.ExpiresAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting Microsoft Graph for user {UserId}.", userId);
            return StatusCode(500, new { message = "Internal error connecting integration." });
        }
    }

    // POST /api/integrations/connect/azure-devops
    [HttpPost("connect/azure-devops")]
    public async Task<ActionResult<UserIntegrationDto>> ConnectAzureDevOps([FromBody] ConnectIntegrationRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        // ADO uses PAT (Personal Access Token) passed as the "code" field
        var pat = dto.Code;
        if (string.IsNullOrWhiteSpace(pat))
            return BadRequest(new { message = "Personal Access Token is required." });

        var existing = await _context.UserIntegrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.UserId == userId.Value && i.Provider == IntegrationProvider.AzureDevOps);

        var workspaceId = GetCurrentWorkspaceId();

        // Auto-discover all ADO organizations this PAT has access to
        // If caller supplied org names directly, use those instead (avoids needing vso.profile scope)
        string storedOrg;
        if (!string.IsNullOrWhiteSpace(dto.Organizations))
        {
            storedOrg = string.Join(",",
                dto.Organizations.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
            _logger.LogInformation("ADO connect for user {UserId}: using provided org(s): {Orgs}", userId, storedOrg);
        }
        else
        {
            var discoveredOrgs = await DiscoverAdoOrganizationsAsync(pat);
            storedOrg = discoveredOrgs.Count > 0
                ? string.Join(",", discoveredOrgs)
                : (_config["ActivitySync:AzureDevOps:Organization"] ?? string.Empty);
            _logger.LogInformation("ADO connect for user {UserId}: discovered {Count} org(s): {Orgs}", userId, discoveredOrgs.Count, storedOrg);
        }

        if (existing != null)
        {
            existing.AccessToken = _tokenProtector.Protect(pat);
            existing.RefreshToken = storedOrg;
            existing.IsActive = true;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            existing = new UserIntegration
            {
                WorkspaceId = workspaceId ?? 1,
                UserId = userId.Value,
                Provider = IntegrationProvider.AzureDevOps,
                AccessToken = _tokenProtector.Protect(pat),
                RefreshToken = storedOrg,
                EnabledSourcesJson = JsonSerializer.Serialize(new[] { "AzureDevOpsWorkItem", "AzureDevOpsCommit" }),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.UserIntegrations.Add(existing);
        }

        await _context.SaveChangesAsync();

        return Ok(new UserIntegrationDto
        {
            Id = existing.Id,
            Provider = "AzureDevOps",
            IsConnected = true,
            EnabledSources = ParseEnabledSources(existing.EnabledSourcesJson)
        });
    }

    // DELETE /api/integrations/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DisconnectIntegration(int id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var integration = await _context.UserIntegrations
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId.Value);

        if (integration is null) return NotFound();

        integration.IsActive = false;
        integration.AccessToken = string.Empty;
        integration.RefreshToken = null;
        integration.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // PUT /api/integrations/{id}/organizations
    [HttpPut("{id}/organizations")]
    public async Task<IActionResult> UpdateAdoOrganizations(int id, [FromBody] UpdateAdoOrganizationsDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var integration = await _context.UserIntegrations
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId.Value);
        if (integration is null) return NotFound();

        integration.RefreshToken = string.Join(",",
            (dto.Organizations ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        integration.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { organizations = integration.RefreshToken });
    }

    // PUT /api/integrations/{id}/sources
    [HttpPut("{id}/sources")]
    public async Task<ActionResult<UserIntegrationDto>> UpdateEnabledSources(int id, [FromBody] UpdateEnabledSourcesDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var integration = await _context.UserIntegrations
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId.Value);

        if (integration is null) return NotFound();

        integration.EnabledSourcesJson = JsonSerializer.Serialize(dto.EnabledSources);
        integration.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new UserIntegrationDto
        {
            Id = integration.Id,
            Provider = integration.Provider.ToString(),
            IsConnected = integration.IsActive,
            EnabledSources = dto.EnabledSources,
            LastSyncedAt = integration.LastSyncedAt
        });
    }

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

    // POST /api/integrations/debug/discover-ado-orgs
    [HttpPost("debug/discover-ado-orgs")]
    public async Task<IActionResult> DebugDiscoverAdoOrgs()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var integration = await _context.UserIntegrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.UserId == userId.Value && i.Provider == IntegrationProvider.AzureDevOps && i.IsActive);

        if (integration is null)
            return Ok(new { success = false, steps = new[] { "No active ADO integration found for this user." }, organizations = Array.Empty<string>() });

        var pat = _tokenProtector.TryUnprotect(integration.AccessToken);
        if (string.IsNullOrWhiteSpace(pat))
            return Ok(new { success = false, steps = new[] { "PAT could not be decrypted." }, organizations = Array.Empty<string>() });

        var steps = new List<string>();
        var orgs = new List<string>();
        string? memberId = null;

        var client = _httpClientFactory.CreateClient("ado");
        var encoded = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($":{pat}"));
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", encoded);

        // Step 1: profile/me
        steps.Add("→ GET https://app.vssps.visualstudio.com/_apis/profile/me");
        var profileResp = await client.GetAsync("https://app.vssps.visualstudio.com/_apis/profile/me?api-version=7.1");
        steps.Add($"  Status: {(int)profileResp.StatusCode} {profileResp.ReasonPhrase}");
        if (profileResp.IsSuccessStatusCode)
        {
            using var doc = JsonDocument.Parse(await profileResp.Content.ReadAsStringAsync());
            if (doc.RootElement.TryGetProperty("id", out var idProp))
            {
                memberId = idProp.GetString();
                steps.Add($"  Member ID: {memberId}");
            }
            else steps.Add("  ⚠ 'id' not found in response");
        }
        else
        {
            steps.Add("  ⚠ Failed — PAT likely missing 'User Profile (Read)' scope");
        }

        // Step 2: connectionData fallback
        if (string.IsNullOrWhiteSpace(memberId))
        {
            steps.Add("→ GET https://app.vssps.visualstudio.com/_apis/connectionData (fallback)");
            var connResp = await client.GetAsync("https://app.vssps.visualstudio.com/_apis/connectionData");
            steps.Add($"  Status: {(int)connResp.StatusCode} {connResp.ReasonPhrase}");
            if (connResp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(await connResp.Content.ReadAsStringAsync());
                if (doc.RootElement.TryGetProperty("authenticatedUser", out var auth) &&
                    auth.TryGetProperty("id", out var idProp))
                {
                    memberId = idProp.GetString();
                    steps.Add($"  Member ID: {memberId}");
                }
                else steps.Add("  ⚠ 'authenticatedUser.id' not found in response");
            }
            else steps.Add("  ⚠ connectionData also failed — PAT may be invalid or expired");
        }

        // Step 3: accounts
        if (!string.IsNullOrWhiteSpace(memberId))
        {
            steps.Add($"→ GET https://app.vssps.visualstudio.com/_apis/accounts?memberId={memberId}");
            var accountsResp = await client.GetAsync($"https://app.vssps.visualstudio.com/_apis/accounts?memberId={memberId}&api-version=7.1");
            steps.Add($"  Status: {(int)accountsResp.StatusCode} {accountsResp.ReasonPhrase}");
            if (accountsResp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(await accountsResp.Content.ReadAsStringAsync());
                foreach (var a in doc.RootElement.GetProperty("value").EnumerateArray())
                {
                    if (a.TryGetProperty("accountName", out var n) && !string.IsNullOrWhiteSpace(n.GetString()))
                        orgs.Add(n.GetString()!);
                }
                steps.Add($"  Found {orgs.Count} org(s): {string.Join(", ", orgs.DefaultIfEmpty("(none)"))}");

                // Persist if found
                if (orgs.Count > 0)
                {
                    integration.RefreshToken = string.Join(",", orgs);
                    integration.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    steps.Add("  ✓ Saved to database");
                }
            }
            else
            {
                var body = await accountsResp.Content.ReadAsStringAsync();
                steps.Add($"  ⚠ Failed: {body[..Math.Min(200, body.Length)]}");
            }
        }
        else
        {
            steps.Add("→ Skipping accounts lookup — no member ID obtained.");
            steps.Add("  ℹ Use the org name field below to set your organizations directly.");
        }

        return Ok(new { success = orgs.Count > 0, steps, organizations = orgs });
    }

    // GET /api/integrations/debug/graph?days=7
    [HttpGet("debug/graph")]
    public async Task<IActionResult> DebugGraph([FromQuery] int days = 7)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var workspaceId = GetCurrentWorkspaceId();
        _logger.LogInformation("DebugGraph called: userId={UserId} workspaceId={WorkspaceId} days={Days}",
            userId, workspaceId, days);

        var result = await _graphClient.GetDebugInfoAsync(userId.Value, days);

        // Also check ADO status directly
        var adoIntegration = await _context.UserIntegrations
            .IgnoreQueryFilters()
            .Where(i => i.UserId == userId.Value && i.Provider == IntegrationProvider.AzureDevOps && i.IsActive)
            .Select(i => new { i.Id, i.LastSyncedAt, i.EnabledSourcesJson, Organization = i.RefreshToken })
            .FirstOrDefaultAsync();

        var adoOrgConfigured = !string.IsNullOrWhiteSpace(adoIntegration?.Organization)
            || !string.IsNullOrWhiteSpace(_config["ActivitySync:AzureDevOps:Organization"]);
        var adoOrg = adoIntegration?.Organization ?? _config["ActivitySync:AzureDevOps:Organization"] ?? "";

        return Ok(new
        {
            // Diagnostics
            diagUserId = userId.Value,
            diagWorkspaceId = workspaceId,
            diagFilterNote = result.DiagFilterNote,

            // Graph status
            result.IsConnected,
            result.TokenExpiresAt,
            result.TokenRefreshAvailable,
            result.LastError,
            result.EventsFound,
            events = result.Events.Select(e => new
            {
                e.Id,
                e.Subject,
                e.StartUtc,
                e.EndUtc,
                DurationMinutes = (int)(e.EndUtc - e.StartUtc).TotalMinutes,
                e.IsOnlineMeeting,
                e.OrganizerEmail,
                attendeeCount = e.AttendeeEmails.Count
            }),
            rawJson = result.RawJson,

            // ADO status
            adoIntegrationId = adoIntegration?.Id,
            adoConnected = adoIntegration is not null,
            adoOrganization = adoOrg,
            adoOrgConfigured,
            adoLastSyncedAt = adoIntegration?.LastSyncedAt,
            adoEnabledSources = adoIntegration is not null
                ? (System.Text.Json.JsonSerializer.Deserialize<List<string>>(adoIntegration.EnabledSourcesJson ?? "[]") ?? [])
                : new List<string>()
        });
    }

    private static List<string> ParseEnabledSources(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch { return []; }
    }

    private async Task<List<string>> DiscoverAdoOrganizationsAsync(string pat)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("ado");
            var encoded = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($":{pat}"));
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", encoded);

            // Step 1: get the user's member ID — try profile/me, fall back to connectionData
            string? memberIdStr = null;

            var profileResponse = await client.GetAsync("https://app.vssps.visualstudio.com/_apis/profile/me?api-version=7.1");
            if (profileResponse.IsSuccessStatusCode)
            {
                using var profileDoc = JsonDocument.Parse(await profileResponse.Content.ReadAsStringAsync());
                if (profileDoc.RootElement.TryGetProperty("id", out var idProp))
                    memberIdStr = idProp.GetString();
            }

            if (string.IsNullOrWhiteSpace(memberIdStr))
            {
                _logger.LogInformation("ADO org discovery: profile/me failed ({Status}), trying connectionData.", profileResponse.StatusCode);
                var connResponse = await client.GetAsync("https://app.vssps.visualstudio.com/_apis/connectionData");
                if (connResponse.IsSuccessStatusCode)
                {
                    using var connDoc = JsonDocument.Parse(await connResponse.Content.ReadAsStringAsync());
                    if (connDoc.RootElement.TryGetProperty("authenticatedUser", out var authUser) &&
                        authUser.TryGetProperty("id", out var idProp))
                        memberIdStr = idProp.GetString();
                }
            }

            if (string.IsNullOrWhiteSpace(memberIdStr))
            {
                _logger.LogWarning("ADO org discovery: could not determine member ID from PAT.");
                return [];
            }

            // Step 2: list all organizations for that member
            var accountsResponse = await client.GetAsync($"https://app.vssps.visualstudio.com/_apis/accounts?memberId={memberIdStr}&api-version=7.1");
            if (!accountsResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("ADO accounts lookup failed: {Status}", accountsResponse.StatusCode);
                return [];
            }

            using var accountsDoc = JsonDocument.Parse(await accountsResponse.Content.ReadAsStringAsync());
            var orgs = accountsDoc.RootElement
                .GetProperty("value")
                .EnumerateArray()
                .Select(a => a.TryGetProperty("accountName", out var n) ? n.GetString() : null)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Select(n => n!)
                .ToList();

            return orgs;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to auto-discover ADO organizations.");
            return [];
        }
    }
}
