using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text.Json;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Services;

public interface IGraphApiClient
{
    Task<List<GraphCalendarEvent>> GetCalendarEventsAsync(int userId, DateTime from, DateTime to, CancellationToken ct = default);
    Task<bool> RefreshTokenIfNeededAsync(int userId, CancellationToken ct = default);
    Task<bool> IsConnectedAsync(int userId, CancellationToken ct = default);
    Task<GraphDebugResult> GetDebugInfoAsync(int userId, int days, CancellationToken ct = default);
}

public record GraphCalendarEvent(
    string Id,
    string Subject,
    string? OrganizerEmail,
    string? OrganizerName,
    DateTime StartUtc,
    DateTime EndUtc,
    bool IsOnlineMeeting,
    string? OnlineMeetingProvider,
    List<string> AttendeeEmails);

public record GraphDebugResult(
    bool IsConnected,
    DateTime? TokenExpiresAt,
    bool TokenRefreshAvailable,
    string? LastError,
    int EventsFound,
    List<GraphCalendarEvent> Events,
    string RawJson,
    int? DiagUserId = null,
    string? DiagFilterNote = null);

public class GraphApiClient : IGraphApiClient
{
    private const string GraphBaseUrl = "https://graph.microsoft.com/v1.0";
    private const string MicrosoftTokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

    private readonly TimekeeperContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOAuthTokenProtector _tokenProtector;
    private readonly IConfiguration _config;
    private readonly ILogger<GraphApiClient> _logger;

    public GraphApiClient(
        TimekeeperContext db,
        IHttpClientFactory httpClientFactory,
        IOAuthTokenProtector tokenProtector,
        IConfiguration config,
        ILogger<GraphApiClient> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _tokenProtector = tokenProtector;
        _config = config;
        _logger = logger;
    }

    public async Task<bool> IsConnectedAsync(int userId, CancellationToken ct = default)
    {
        // IgnoreQueryFilters: background service has no HTTP context, WorkspaceId filter would return 0 results
        return await _db.UserIntegrations
            .IgnoreQueryFilters()
            .AnyAsync(i => i.UserId == userId && i.Provider == IntegrationProvider.MicrosoftGraph && i.IsActive, ct);
    }

    public async Task<bool> RefreshTokenIfNeededAsync(int userId, CancellationToken ct = default)
    {
        var integration = await _db.UserIntegrations
            .IgnoreQueryFilters() // Workspace filter would block background-service scope (no HTTP context)
            .FirstOrDefaultAsync(i => i.UserId == userId && i.Provider == IntegrationProvider.MicrosoftGraph && i.IsActive, ct);

        if (integration is null) return false;
        if (integration.ExpiresAt is null || integration.ExpiresAt > DateTime.UtcNow.AddMinutes(5)) return true;

        var refreshToken = _tokenProtector.TryUnprotect(integration.RefreshToken);
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            _logger.LogWarning("Cannot refresh token for user {UserId}: no refresh token stored.", userId);
            return false;
        }

        // Support both PKCE (PublicClientId, no secret) and confidential client (ClientId + ClientSecret)
        var publicClientId = _config["ActivitySync:MicrosoftGraph:PublicClientId"];
        var clientId = _config["ActivitySync:MicrosoftGraph:ClientId"];
        var clientSecret = _config["ActivitySync:MicrosoftGraph:ClientSecret"];

        // Prefer public client (PKCE), fall back to confidential client
        var effectiveClientId = !string.IsNullOrWhiteSpace(publicClientId) ? publicClientId : clientId;
        if (string.IsNullOrWhiteSpace(effectiveClientId))
        {
            _logger.LogWarning("Microsoft Graph client ID not configured for token refresh.");
            return false;
        }

        try
        {
            var client = _httpClientFactory.CreateClient("graph");
            var formFields = new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["client_id"] = effectiveClientId,
                ["refresh_token"] = refreshToken,
                ["scope"] = "Calendars.Read offline_access User.Read"
            };
            // Only include client_secret for confidential clients
            if (!string.IsNullOrWhiteSpace(clientSecret))
                formFields["client_secret"] = clientSecret;

            var formData = new FormUrlEncodedContent(formFields);
            var response = await client.PostAsync(MicrosoftTokenUrl, formData, ct);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("Token refresh failed for user {UserId}: {Status} — {Body}", userId, response.StatusCode, body);
                return false;
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var root = doc.RootElement;

            integration.AccessToken = _tokenProtector.Protect(root.GetProperty("access_token").GetString()!);
            if (root.TryGetProperty("refresh_token", out var rt))
                integration.RefreshToken = _tokenProtector.Protect(rt.GetString()!);
            integration.ExpiresAt = DateTime.UtcNow.AddSeconds(root.GetProperty("expires_in").GetInt32());
            integration.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception refreshing MS Graph token for user {UserId}.", userId);
            return false;
        }
    }

    public async Task<List<GraphCalendarEvent>> GetCalendarEventsAsync(int userId, DateTime from, DateTime to, CancellationToken ct = default)
    {
        if (!await RefreshTokenIfNeededAsync(userId, ct))
            return [];

        var integration = await _db.UserIntegrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.UserId == userId && i.Provider == IntegrationProvider.MicrosoftGraph && i.IsActive, ct);

        if (integration is null) return [];

        var accessToken = _tokenProtector.TryUnprotect(integration.AccessToken);
        if (string.IsNullOrWhiteSpace(accessToken)) return [];

        var client = _httpClientFactory.CreateClient("graph");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var fromStr = from.ToString("o");
        var toStr = to.ToString("o");
        var url = $"{GraphBaseUrl}/me/calendarView?startDateTime={fromStr}&endDateTime={toStr}&$select=id,subject,start,end,organizer,attendees,isOnlineMeeting,onlineMeetingProvider&$top=100";

        try
        {
            var response = await client.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Graph calendar API returned {Status} for user {UserId}", response.StatusCode, userId);
                return [];
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            var events = new List<GraphCalendarEvent>();

            foreach (var item in doc.RootElement.GetProperty("value").EnumerateArray())
            {
                var id = item.GetProperty("id").GetString() ?? string.Empty;
                var subject = item.TryGetProperty("subject", out var subj) ? subj.GetString() ?? "(No Subject)" : "(No Subject)";

                var startStr = item.GetProperty("start").GetProperty("dateTime").GetString();
                var endStr = item.GetProperty("end").GetProperty("dateTime").GetString();
                var startUtc = DateTime.Parse(startStr!, null, System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal);
                var endUtc = DateTime.Parse(endStr!, null, System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal);

                string? organizerEmail = null;
                string? organizerName = null;
                if (item.TryGetProperty("organizer", out var org) && org.TryGetProperty("emailAddress", out var orgEmail))
                {
                    organizerEmail = orgEmail.TryGetProperty("address", out var addr) ? addr.GetString() : null;
                    organizerName = orgEmail.TryGetProperty("name", out var name) ? name.GetString() : null;
                }

                var attendees = new List<string>();
                if (item.TryGetProperty("attendees", out var attendeesEl))
                {
                    foreach (var att in attendeesEl.EnumerateArray())
                    {
                        if (att.TryGetProperty("emailAddress", out var attEmail) &&
                            attEmail.TryGetProperty("address", out var attAddr))
                        {
                            var attAddrStr = attAddr.GetString();
                            if (!string.IsNullOrWhiteSpace(attAddrStr))
                                attendees.Add(attAddrStr);
                        }
                    }
                }

                var isOnline = item.TryGetProperty("isOnlineMeeting", out var online) && online.GetBoolean();
                var provider = item.TryGetProperty("onlineMeetingProvider", out var prov) ? prov.GetString() : null;

                events.Add(new GraphCalendarEvent(id, subject, organizerEmail, organizerName, startUtc, endUtc, isOnline, provider, attendees));
            }

            return events;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching calendar events for user {UserId}.", userId);
            return [];
        }
    }

    public async Task<GraphDebugResult> GetDebugInfoAsync(int userId, int days, CancellationToken ct = default)
    {
        // Always IgnoreQueryFilters: workspace filter prevents non-HTTP scopes from finding records
        var integration = await _db.UserIntegrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.UserId == userId && i.Provider == IntegrationProvider.MicrosoftGraph && i.IsActive, ct);

        // Also count how many integrations exist to aid debugging
        var totalForUser = await _db.UserIntegrations
            .IgnoreQueryFilters()
            .CountAsync(i => i.UserId == userId, ct);

        var filteredForUser = await _db.UserIntegrations
            .CountAsync(i => i.UserId == userId, ct);  // with workspace filter

        var filterNote = totalForUser != filteredForUser
            ? $"Workspace filter hiding {totalForUser - filteredForUser} of {totalForUser} integration(s) for user {userId}. Check WorkspaceId on records."
            : null;

        if (integration is null)
        {
            var msg = totalForUser == 0
                ? "No integrations found for this user in the database at all."
                : $"No active Microsoft Graph integration found (user has {totalForUser} integration(s) total).";
            _logger.LogWarning("DebugGraph: {Msg} userId={UserId} total={Total} filtered={Filtered}",
                msg, userId, totalForUser, filteredForUser);
            return new GraphDebugResult(false, null, false, msg, 0, [], "{}", userId, filterNote);
        }

        var tokenOk = await RefreshTokenIfNeededAsync(userId, ct);
        var hasRefreshToken = !string.IsNullOrWhiteSpace(integration.RefreshToken);

        if (!tokenOk)
            return new GraphDebugResult(true, integration.ExpiresAt, hasRefreshToken, "Token refresh failed — check API logs for details.", 0, [], "{}", userId, filterNote);

        var accessToken = _tokenProtector.TryUnprotect(integration.AccessToken);
        if (string.IsNullOrWhiteSpace(accessToken))
            return new GraphDebugResult(true, integration.ExpiresAt, hasRefreshToken, "Could not decrypt access token.", 0, [], "{}", userId, filterNote);

        var client = _httpClientFactory.CreateClient("graph");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var from = DateTime.UtcNow.AddDays(-days);
        var to = DateTime.UtcNow.AddDays(1); // include today's upcoming events too
        var url = $"{GraphBaseUrl}/me/calendarView?startDateTime={from:o}&endDateTime={to:o}&$select=id,subject,start,end,organizer,isOnlineMeeting,onlineMeetingProvider&$top=100";

        try
        {
            var response = await client.GetAsync(url, ct);
            var rawJson = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
                return new GraphDebugResult(true, integration.ExpiresAt, hasRefreshToken, $"Graph API error {(int)response.StatusCode}: {rawJson}", 0, [], rawJson, userId, filterNote);

            var events = await GetCalendarEventsAsync(userId, from, to, ct);
            return new GraphDebugResult(true, integration.ExpiresAt, hasRefreshToken, null, events.Count, events, rawJson, userId, filterNote);
        }
        catch (Exception ex)
        {
            return new GraphDebugResult(true, integration.ExpiresAt, hasRefreshToken, ex.Message, 0, [], "{}", userId, filterNote);
        }
    }
}
