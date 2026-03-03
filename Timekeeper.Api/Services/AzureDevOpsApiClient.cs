using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Services;

public interface IAzureDevOpsApiClient
{
    Task<List<AdoWorkItem>> GetRecentWorkItemsAsync(int userId, DateTime from, CancellationToken ct = default);
    Task<List<AdoCommit>> GetRecentCommitsAsync(int userId, DateTime from, CancellationToken ct = default);
    Task<bool> IsConnectedAsync(int userId, CancellationToken ct = default);
}

public record AdoWorkItem(
    string Id,
    string Title,
    string WorkItemType,
    string? ProjectName,
    DateTime ChangedDate,
    string? Organization = null,
    string? Url = null);

public record AdoCommit(
    string CommitId,
    string Comment,
    string? RepositoryName,
    string? ProjectName,
    DateTime AuthorDate,
    string? Organization = null,
    string? Url = null,
    int FilesChanged = 0);

public class AzureDevOpsApiClient : IAzureDevOpsApiClient
{
    private const string AdoBaseUrl = "https://dev.azure.com";

    private readonly TimekeeperContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOAuthTokenProtector _tokenProtector;
    private readonly IConfiguration _config;
    private readonly ILogger<AzureDevOpsApiClient> _logger;

    public AzureDevOpsApiClient(
        TimekeeperContext db,
        IHttpClientFactory httpClientFactory,
        IOAuthTokenProtector tokenProtector,
        IConfiguration config,
        ILogger<AzureDevOpsApiClient> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _tokenProtector = tokenProtector;
        _config = config;
        _logger = logger;
    }

    public async Task<bool> IsConnectedAsync(int userId, CancellationToken ct = default)
    {
        // IgnoreQueryFilters: background service has no HTTP context
        return await _db.UserIntegrations
            .IgnoreQueryFilters()
            .AnyAsync(i => i.UserId == userId && i.Provider == IntegrationProvider.AzureDevOps && i.IsActive, ct);
}

    public async Task<List<AdoWorkItem>> GetRecentWorkItemsAsync(int userId, DateTime from, CancellationToken ct = default)
    {
        var (client, organizations) = await BuildClientAsync(userId, ct);
        if (client is null || organizations.Count == 0)
        {
            _logger.LogWarning("ADO: No organizations configured for user {UserId}. Reconnect to auto-discover.", userId);
            return [];
        }

        var allItems = new List<AdoWorkItem>();
        foreach (var organization in organizations)
        {

        var fromStr = from.ToString("o");
            var wiqlUrl = $"{AdoBaseUrl}/{organization}/_apis/wit/wiql?api-version=7.1";
            var wiqlBody = JsonSerializer.Serialize(new
            {
                query = $"SELECT [System.Id],[System.Title],[System.WorkItemType],[System.TeamProject],[System.ChangedDate] FROM WorkItems WHERE [System.ChangedDate] >= '{from:yyyy-MM-dd}' AND [System.ChangedBy] = @Me ORDER BY [System.ChangedDate] DESC"
            });

            try
            {
                var wiqlResponse = await client.PostAsync(wiqlUrl, new StringContent(wiqlBody, Encoding.UTF8, "application/json"), ct);
                if (!wiqlResponse.IsSuccessStatusCode) continue;

                using var wiqlDoc = JsonDocument.Parse(await wiqlResponse.Content.ReadAsStringAsync(ct));
                var ids = wiqlDoc.RootElement
                    .GetProperty("workItems")
                    .EnumerateArray()
                    .Take(50)
                    .Select(wi => wi.GetProperty("id").GetInt32().ToString())
                    .ToList();

                if (ids.Count == 0) continue;

                var idsParam = string.Join(",", ids);
                var batchUrl = $"{AdoBaseUrl}/{organization}/_apis/wit/workitems?ids={idsParam}&fields=System.Id,System.Title,System.WorkItemType,System.TeamProject,System.ChangedDate&api-version=7.1";
                var batchResponse = await client.GetAsync(batchUrl, ct);
                if (!batchResponse.IsSuccessStatusCode) continue;

                using var batchDoc = JsonDocument.Parse(await batchResponse.Content.ReadAsStringAsync(ct));
                foreach (var item in batchDoc.RootElement.GetProperty("value").EnumerateArray())
                {
                    var fields = item.GetProperty("fields");
                    var id = item.GetProperty("id").GetInt32().ToString();
                    var title = fields.TryGetProperty("System.Title", out var t) ? t.GetString() ?? "" : "";
                    var wiType = fields.TryGetProperty("System.WorkItemType", out var wit) ? wit.GetString() ?? "" : "";
                    var project = fields.TryGetProperty("System.TeamProject", out var p) ? p.GetString() : null;
                    var changed = fields.TryGetProperty("System.ChangedDate", out var cd)
                        ? cd.GetDateTime()
                        : DateTime.UtcNow;

                    var wiUrl = project != null ? $"{AdoBaseUrl}/{organization}/{Uri.EscapeDataString(project)}/_workitems/edit/{id}" : null;
                    allItems.Add(new AdoWorkItem(id, title, wiType, project, changed, organization, wiUrl));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching ADO work items for user {UserId} org {Org}.", userId, organization);
            }
        }

        return allItems;
    }

    public async Task<List<AdoCommit>> GetRecentCommitsAsync(int userId, DateTime from, CancellationToken ct = default)
    {
        var (client, organizations) = await BuildClientAsync(userId, ct);
        if (client is null || organizations.Count == 0) return [];

        var allCommits = new List<AdoCommit>();
        var authorDisplayName = await GetAuthorDisplayNameAsync(client, ct);
        foreach (var organization in organizations)
        {
            var projectsUrl = $"{AdoBaseUrl}/{organization}/_apis/projects?api-version=7.1";
            try
            {
                var projectsResponse = await client.GetAsync(projectsUrl, ct);
                if (!projectsResponse.IsSuccessStatusCode) continue;

                using var projectsDoc = JsonDocument.Parse(await projectsResponse.Content.ReadAsStringAsync(ct));

                foreach (var proj in projectsDoc.RootElement.GetProperty("value").EnumerateArray().Take(10))
                {
                    var projectName = proj.GetProperty("name").GetString() ?? "";
                    var reposUrl = $"{AdoBaseUrl}/{organization}/{projectName}/_apis/git/repositories?api-version=7.1";
                    var reposResponse = await client.GetAsync(reposUrl, ct);
                    if (!reposResponse.IsSuccessStatusCode) continue;

                    using var reposDoc = JsonDocument.Parse(await reposResponse.Content.ReadAsStringAsync(ct));
                    foreach (var repo in reposDoc.RootElement.GetProperty("value").EnumerateArray().Take(5))
                    {
                        var repoId = repo.GetProperty("id").GetString() ?? "";
                        var repoName = repo.TryGetProperty("name", out var rn) ? rn.GetString() : null;
                        var fromStr = from.ToString("o");
                        var authorParam = string.IsNullOrWhiteSpace(authorDisplayName) ? "" : $"&searchCriteria.author={Uri.EscapeDataString(authorDisplayName)}";
                        var commitsUrl = $"{AdoBaseUrl}/{organization}/{projectName}/_apis/git/repositories/{repoId}/commits?searchCriteria.fromDate={fromStr}{authorParam}&searchCriteria.$top=20&api-version=7.1";
                        var commitsResponse = await client.GetAsync(commitsUrl, ct);
                        if (!commitsResponse.IsSuccessStatusCode) continue;

                        using var commitsDoc = JsonDocument.Parse(await commitsResponse.Content.ReadAsStringAsync(ct));
                        foreach (var c in commitsDoc.RootElement.GetProperty("value").EnumerateArray())
                        {
                            var commitId = c.GetProperty("commitId").GetString() ?? "";
                            var comment = c.TryGetProperty("comment", out var cm) ? cm.GetString() ?? "" : "";
                            var authorDate = c.TryGetProperty("author", out var auth) && auth.TryGetProperty("date", out var dt)
                                ? dt.GetDateTime()
                                : DateTime.UtcNow;
                            var filesChanged = 0;
                            if (c.TryGetProperty("changeCounts", out var cc))
                                filesChanged = (cc.TryGetProperty("Edit", out var ed) ? ed.GetInt32() : 0)
                                             + (cc.TryGetProperty("Add", out var ad) ? ad.GetInt32() : 0)
                                             + (cc.TryGetProperty("Delete", out var dl) ? dl.GetInt32() : 0);
                            var commitUrl = $"{AdoBaseUrl}/{organization}/{projectName}/_git/{repoName ?? ""}/commit/{commitId}";
                            allCommits.Add(new AdoCommit(commitId, comment, repoName, projectName, authorDate, organization, commitUrl, filesChanged));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching ADO commits for user {UserId} org {Org}.", userId, organization);
            }
        }

        return allCommits;
    }

    private async Task<(HttpClient? client, List<string> organizations)> BuildClientAsync(int userId, CancellationToken ct)
    {
        var integration = await _db.UserIntegrations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.UserId == userId && i.Provider == IntegrationProvider.AzureDevOps && i.IsActive, ct);

        if (integration is null) return (null, []);

        var pat = _tokenProtector.TryUnprotect(integration.AccessToken);
        if (string.IsNullOrWhiteSpace(pat)) return (null, []);

        // Orgs stored as comma-separated in RefreshToken; fall back to appsettings
        var storedOrgs = !string.IsNullOrWhiteSpace(integration.RefreshToken)
            ? integration.RefreshToken.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            : new List<string>();
        if (storedOrgs.Count == 0)
        {
            var cfgOrg = _config["ActivitySync:AzureDevOps:Organization"];
            if (!string.IsNullOrWhiteSpace(cfgOrg)) storedOrgs.Add(cfgOrg);
        }

        var client = _httpClientFactory.CreateClient("ado");
        var encoded = Convert.ToBase64String(Encoding.ASCII.GetBytes($":{pat}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", encoded);

        // If still no orgs, auto-discover from VSS API and persist so future syncs don't repeat this
        if (storedOrgs.Count == 0)
        {
            _logger.LogInformation("ADO: No orgs stored for user {UserId}, attempting live discovery via VSS API.", userId);
            storedOrgs = await DiscoverOrgsAsync(client, userId, ct);
            if (storedOrgs.Count > 0)
            {
                integration.RefreshToken = string.Join(",", storedOrgs);
                integration.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                _logger.LogInformation("ADO: Persisted {Count} discovered org(s) for user {UserId}: {Orgs}",
                    storedOrgs.Count, userId, integration.RefreshToken);
            }
        }

        return (client, storedOrgs);
    }

    private static async Task<string?> GetAuthorDisplayNameAsync(HttpClient client, CancellationToken ct)
    {
        try
        {
            // profile/me has emailAddress when PAT has vso.profile scope
            var profileResp = await client.GetAsync("https://app.vssps.visualstudio.com/_apis/profile/me?api-version=7.1", ct);
            if (profileResp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(await profileResp.Content.ReadAsStringAsync(ct));
                if (doc.RootElement.TryGetProperty("emailAddress", out var email) && !string.IsNullOrWhiteSpace(email.GetString()))
                    return email.GetString();
                if (doc.RootElement.TryGetProperty("displayName", out var dn) && !string.IsNullOrWhiteSpace(dn.GetString()))
                    return dn.GetString();
            }

            // Fallback: connectionData always works with a valid PAT
            var connResp = await client.GetAsync("https://app.vssps.visualstudio.com/_apis/connectionData", ct);
            if (connResp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(await connResp.Content.ReadAsStringAsync(ct));
                if (doc.RootElement.TryGetProperty("authenticatedUser", out var authUser) &&
                    authUser.TryGetProperty("providerDisplayName", out var dn) && !string.IsNullOrWhiteSpace(dn.GetString()))
                    return dn.GetString();
            }
        }
        catch { /* best-effort */ }
        return null;
    }

    private async Task<List<string>> DiscoverOrgsAsync(HttpClient client, int userId, CancellationToken ct)
    {
        try
        {
            string? memberId = null;

            // Primary: profile/me (requires vso.profile scope)
            var profileResp = await client.GetAsync("https://app.vssps.visualstudio.com/_apis/profile/me?api-version=7.1", ct);
            if (profileResp.IsSuccessStatusCode)
            {
                using var profileDoc = JsonDocument.Parse(await profileResp.Content.ReadAsStringAsync(ct));
                if (profileDoc.RootElement.TryGetProperty("id", out var idProp))
                    memberId = idProp.GetString();
            }

            // Fallback: connectionData works with any valid PAT, no extra scope needed
            if (string.IsNullOrWhiteSpace(memberId))
            {
                _logger.LogInformation("ADO discovery: profile/me failed ({Status}), trying connectionData for user {UserId}.", profileResp.StatusCode, userId);
                var connResp = await client.GetAsync("https://app.vssps.visualstudio.com/_apis/connectionData", ct);
                if (connResp.IsSuccessStatusCode)
                {
                    using var connDoc = JsonDocument.Parse(await connResp.Content.ReadAsStringAsync(ct));
                    if (connDoc.RootElement.TryGetProperty("authenticatedUser", out var authUser) &&
                        authUser.TryGetProperty("id", out var idProp))
                        memberId = idProp.GetString();
                }
            }

            if (string.IsNullOrWhiteSpace(memberId))
            {
                _logger.LogWarning("ADO discovery: could not determine member ID for user {UserId}.", userId);
                return [];
            }

            var accountsResp = await client.GetAsync(
                $"https://app.vssps.visualstudio.com/_apis/accounts?memberId={memberId}&api-version=7.1", ct);
            if (!accountsResp.IsSuccessStatusCode)
            {
                _logger.LogWarning("ADO discovery: accounts lookup failed ({Status}) for user {UserId}.", accountsResp.StatusCode, userId);
                return [];
            }
            using var accountsDoc = JsonDocument.Parse(await accountsResp.Content.ReadAsStringAsync(ct));
            return accountsDoc.RootElement
                .GetProperty("value")
                .EnumerateArray()
                .Select(a => a.TryGetProperty("accountName", out var n) ? n.GetString() : null)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Select(n => n!)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ADO discovery: exception for user {UserId}.", userId);
            return [];
        }
    }
}
