using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Timekeeper.Api.DTOs;

namespace Timekeeper.Api.Services;

public class SupportIssueOptions
{
    public string GitHubApiBaseUrl { get; set; } = "https://api.github.com";
    public string GitHubToken { get; set; } = string.Empty;
}

public record GitHubIssueCreateResult(bool Success, int IssueNumber, string IssueUrl, string? Error);
public record GitHubConnectionTestResult(bool Success, string Message);
public record GitHubIssueCommentResult(string Author, string Body, DateTime CreatedAt, DateTime? UpdatedAt, string Url);
public record GitHubIssueDetailsResult(
    bool Success,
    string? Error,
    string State,
    string Title,
    string Body,
    string HtmlUrl,
    DateTime? CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<GitHubIssueCommentResult> Comments);

public record GitHubIssueAddCommentResult(bool Success, string? Error);

public interface IGitHubIssueService
{
    Task<GitHubIssueCreateResult> CreateIssueAsync(
        string owner,
        string repo,
        string? workspaceTokenProtected,
        CreateSupportIssueRequestDto request,
        string submittedBy,
        string submittedRole,
        int workspaceId,
        string workspaceName,
        CancellationToken cancellationToken = default);

    Task<GitHubConnectionTestResult> TestConnectionAsync(
        string owner,
        string repo,
        string? workspaceTokenProtected,
        string? plainTextTokenOverride,
        CancellationToken cancellationToken = default);

    Task<GitHubIssueDetailsResult> GetIssueDetailsAsync(
        string owner,
        string repo,
        int issueNumber,
        string? workspaceTokenProtected,
        CancellationToken cancellationToken = default);

    Task<GitHubIssueAddCommentResult> AddIssueCommentAsync(
        string owner,
        string repo,
        int issueNumber,
        string body,
        string? workspaceTokenProtected,
        CancellationToken cancellationToken = default);
}

public class GitHubIssueService : IGitHubIssueService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SupportIssueOptions _options;
    private readonly ISupportTokenProtector _supportTokenProtector;
    private readonly ILogger<GitHubIssueService> _logger;

    public GitHubIssueService(
        IHttpClientFactory httpClientFactory,
        IOptions<SupportIssueOptions> options,
        ISupportTokenProtector supportTokenProtector,
        ILogger<GitHubIssueService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _supportTokenProtector = supportTokenProtector;
        _logger = logger;
    }

    public async Task<GitHubIssueCreateResult> CreateIssueAsync(
        string owner,
        string repo,
        string? workspaceTokenProtected,
        CreateSupportIssueRequestDto request,
        string submittedBy,
        string submittedRole,
        int workspaceId,
        string workspaceName,
        CancellationToken cancellationToken = default)
    {
        var token = ResolveToken(workspaceTokenProtected);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new GitHubIssueCreateResult(false, 0, string.Empty, "Support issue integration is not configured on this server.");
        }

        var client = _httpClientFactory.CreateClient(nameof(GitHubIssueService));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Timekeeper-Support");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        var labels = BuildLabels(request.Category, request.Severity);
        var payload = new
        {
            title = request.Title.Trim(),
            body = BuildIssueBody(request, submittedBy, submittedRole, workspaceId, workspaceName),
            labels
        };

        var requestUri = $"/repos/{owner}/{repo}/issues";
        var content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        try
        {
            var response = await client.PostAsync(requestUri, content, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "GitHub issue creation failed. StatusCode: {StatusCode}, Owner: {Owner}, Repo: {Repo}",
                    (int)response.StatusCode,
                    owner,
                    repo);

                return new GitHubIssueCreateResult(false, 0, string.Empty, "Could not create support issue at this time.");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            var issueNumber = root.TryGetProperty("number", out var numberElement)
                ? numberElement.GetInt32()
                : 0;

            var issueUrl = root.TryGetProperty("html_url", out var urlElement)
                ? urlElement.GetString() ?? string.Empty
                : string.Empty;

            return new GitHubIssueCreateResult(true, issueNumber, issueUrl, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GitHub issue creation failed due to an unexpected error.");
            return new GitHubIssueCreateResult(false, 0, string.Empty, "Could not create support issue at this time.");
        }
    }

    private static string[] BuildLabels(string category, string severity)
    {
        var normalizedCategory = NormalizeForLabel(category, "bug");
        var normalizedSeverity = NormalizeForLabel(severity, "medium");

        return
        [
            "support",
            $"category:{normalizedCategory}",
            $"severity:{normalizedSeverity}"
        ];
    }

    private static string NormalizeForLabel(string? value, string fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        return value.Trim().ToLowerInvariant().Replace(' ', '-');
    }

    private static string BuildIssueBody(
        CreateSupportIssueRequestDto request,
        string submittedBy,
        string submittedRole,
        int workspaceId,
        string workspaceName)
    {
        var builder = new StringBuilder();

        builder.AppendLine("## Support Ticket");
        builder.AppendLine();
        builder.AppendLine($"- Category: {request.Category}");
        builder.AppendLine($"- Severity: {request.Severity}");
        builder.AppendLine($"- Submitted By: {submittedBy}");
        builder.AppendLine($"- Role: {submittedRole}");
        builder.AppendLine($"- Workspace: {workspaceName} ({workspaceId})");
        builder.AppendLine($"- Contact Email: {request.ContactEmail?.Trim() ?? "Not provided"}");
        builder.AppendLine();

        builder.AppendLine("### Description");
        builder.AppendLine(request.Description.Trim());
        builder.AppendLine();

        if (!string.IsNullOrWhiteSpace(request.StepsToReproduce))
        {
            builder.AppendLine("### Steps To Reproduce");
            builder.AppendLine(request.StepsToReproduce.Trim());
            builder.AppendLine();
        }

        if (!string.IsNullOrWhiteSpace(request.ExpectedBehavior))
        {
            builder.AppendLine("### Expected Behavior");
            builder.AppendLine(request.ExpectedBehavior.Trim());
            builder.AppendLine();
        }

        if (!string.IsNullOrWhiteSpace(request.ActualBehavior))
        {
            builder.AppendLine("### Actual Behavior");
            builder.AppendLine(request.ActualBehavior.Trim());
            builder.AppendLine();
        }

        builder.AppendLine("### Environment");
        builder.AppendLine($"- Browser: {request.Browser?.Trim() ?? "Not provided"}");
        builder.AppendLine($"- Operating System: {request.OperatingSystem?.Trim() ?? "Not provided"}");
        builder.AppendLine($"- App Version: {request.AppVersion?.Trim() ?? "Not provided"}");

        return builder.ToString().Trim();
    }

    private string? ResolveToken(string? workspaceTokenProtected)
    {
        var workspaceToken = _supportTokenProtector.TryUnprotect(workspaceTokenProtected);
        if (!string.IsNullOrWhiteSpace(workspaceToken))
        {
            return workspaceToken;
        }

        return string.IsNullOrWhiteSpace(_options.GitHubToken)
            ? null
            : _options.GitHubToken;
    }

    public async Task<GitHubConnectionTestResult> TestConnectionAsync(
        string owner,
        string repo,
        string? workspaceTokenProtected,
        string? plainTextTokenOverride,
        CancellationToken cancellationToken = default)
    {
        var token = ResolveTokenForTest(workspaceTokenProtected, plainTextTokenOverride);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new GitHubConnectionTestResult(false, "No GitHub token configured.");
        }

        var client = _httpClientFactory.CreateClient(nameof(GitHubIssueService));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Timekeeper-Support");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        try
        {
            var response = await client.GetAsync($"/repos/{owner}/{repo}", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new GitHubConnectionTestResult(true, "Connection successful.");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return new GitHubConnectionTestResult(false, "Repository not found or token has no access.");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized || response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                return new GitHubConnectionTestResult(false, "Token is invalid or does not have required repository access.");
            }

            return new GitHubConnectionTestResult(false, "GitHub connection test failed.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GitHub connection test failed.");
            return new GitHubConnectionTestResult(false, "Could not reach GitHub API.");
        }
    }

    private string? ResolveTokenForTest(string? workspaceTokenProtected, string? plainTextTokenOverride)
    {
        if (!string.IsNullOrWhiteSpace(plainTextTokenOverride))
        {
            return plainTextTokenOverride.Trim();
        }

        return ResolveToken(workspaceTokenProtected);
    }

    public async Task<GitHubIssueDetailsResult> GetIssueDetailsAsync(
        string owner,
        string repo,
        int issueNumber,
        string? workspaceTokenProtected,
        CancellationToken cancellationToken = default)
    {
        var token = ResolveToken(workspaceTokenProtected);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new GitHubIssueDetailsResult(false, "No GitHub token configured.", string.Empty, string.Empty, string.Empty, string.Empty, null, null, []);
        }

        var client = _httpClientFactory.CreateClient(nameof(GitHubIssueService));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Timekeeper-Support");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        try
        {
            var issueResponse = await client.GetAsync($"/repos/{owner}/{repo}/issues/{issueNumber}", cancellationToken);
            if (!issueResponse.IsSuccessStatusCode)
            {
                return new GitHubIssueDetailsResult(false, "Could not load issue details from GitHub.", string.Empty, string.Empty, string.Empty, string.Empty, null, null, []);
            }

            using var issueDoc = JsonDocument.Parse(await issueResponse.Content.ReadAsStringAsync(cancellationToken));
            var issueRoot = issueDoc.RootElement;

            var state = issueRoot.TryGetProperty("state", out var stateElement)
                ? stateElement.GetString() ?? "unknown"
                : "unknown";

            var title = issueRoot.TryGetProperty("title", out var titleElement)
                ? titleElement.GetString() ?? string.Empty
                : string.Empty;

            var htmlUrl = issueRoot.TryGetProperty("html_url", out var htmlUrlElement)
                ? htmlUrlElement.GetString() ?? string.Empty
                : string.Empty;

            var body = issueRoot.TryGetProperty("body", out var bodyElement)
                ? bodyElement.GetString() ?? string.Empty
                : string.Empty;

            DateTime? createdAt = null;
            if (issueRoot.TryGetProperty("created_at", out var createdAtElement)
                && DateTime.TryParse(createdAtElement.GetString(), out var parsedCreatedAt))
            {
                createdAt = DateTime.SpecifyKind(parsedCreatedAt, DateTimeKind.Utc);
            }

            DateTime? updatedAt = null;
            if (issueRoot.TryGetProperty("updated_at", out var updatedAtElement)
                && DateTime.TryParse(updatedAtElement.GetString(), out var parsedUpdatedAt))
            {
                updatedAt = DateTime.SpecifyKind(parsedUpdatedAt, DateTimeKind.Utc);
            }

            var comments = await GetIssueCommentsAsync(client, owner, repo, issueNumber, cancellationToken);

            return new GitHubIssueDetailsResult(true, null, state, title, body, htmlUrl, createdAt, updatedAt, comments);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch issue details for {Owner}/{Repo}#{IssueNumber}", owner, repo, issueNumber);
            return new GitHubIssueDetailsResult(false, "Could not load issue details from GitHub.", string.Empty, string.Empty, string.Empty, string.Empty, null, null, []);
        }
    }

    public async Task<GitHubIssueAddCommentResult> AddIssueCommentAsync(
        string owner,
        string repo,
        int issueNumber,
        string body,
        string? workspaceTokenProtected,
        CancellationToken cancellationToken = default)
    {
        var token = ResolveToken(workspaceTokenProtected);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new GitHubIssueAddCommentResult(false, "No GitHub token configured.");
        }

        var client = _httpClientFactory.CreateClient(nameof(GitHubIssueService));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Timekeeper-Support");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        var payload = new { body = body.Trim() };
        var content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        try
        {
            var response = await client.PostAsync($"/repos/{owner}/{repo}/issues/{issueNumber}/comments", content, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new GitHubIssueAddCommentResult(true, null);
            }

            return new GitHubIssueAddCommentResult(false, "Could not post comment to GitHub.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to add comment for {Owner}/{Repo}#{IssueNumber}", owner, repo, issueNumber);
            return new GitHubIssueAddCommentResult(false, "Could not post comment to GitHub.");
        }
    }

    private static async Task<IReadOnlyList<GitHubIssueCommentResult>> GetIssueCommentsAsync(
        HttpClient client,
        string owner,
        string repo,
        int issueNumber,
        CancellationToken cancellationToken)
    {
        var commentsResponse = await client.GetAsync($"/repos/{owner}/{repo}/issues/{issueNumber}/comments", cancellationToken);
        if (!commentsResponse.IsSuccessStatusCode)
        {
            return [];
        }

        using var commentsDoc = JsonDocument.Parse(await commentsResponse.Content.ReadAsStringAsync(cancellationToken));
        var comments = new List<GitHubIssueCommentResult>();

        foreach (var comment in commentsDoc.RootElement.EnumerateArray())
        {
            var author = comment.TryGetProperty("user", out var user)
                && user.TryGetProperty("login", out var login)
                ? login.GetString() ?? "unknown"
                : "unknown";

            var body = comment.TryGetProperty("body", out var bodyElement)
                ? bodyElement.GetString() ?? string.Empty
                : string.Empty;

            DateTime createdAt = DateTime.UtcNow;
            if (comment.TryGetProperty("created_at", out var createdAtElement)
                && DateTime.TryParse(createdAtElement.GetString(), out var parsedCreatedAt))
            {
                createdAt = DateTime.SpecifyKind(parsedCreatedAt, DateTimeKind.Utc);
            }

            DateTime? updatedAt = null;
            if (comment.TryGetProperty("updated_at", out var updatedAtElement)
                && DateTime.TryParse(updatedAtElement.GetString(), out var parsedUpdatedAt))
            {
                updatedAt = DateTime.SpecifyKind(parsedUpdatedAt, DateTimeKind.Utc);
            }

            var url = comment.TryGetProperty("html_url", out var urlElement)
                ? urlElement.GetString() ?? string.Empty
                : string.Empty;

            comments.Add(new GitHubIssueCommentResult(author, body, createdAt, updatedAt, url));
        }

        return comments
            .OrderBy(c => c.CreatedAt)
            .ToList();
    }
}
