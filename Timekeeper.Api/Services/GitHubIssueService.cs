using System.Net.Http.Headers;
using System.Net;
using System.Text.RegularExpressions;
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
public record GitHubIssueLabelResult(string Name, string Color);
public record GitHubIssueDetailsResult(
    bool Success,
    string? Error,
    bool IssueNotFound,
    string State,
    string Title,
    string Body,
    string HtmlUrl,
    DateTime? CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<GitHubIssueLabelResult> Labels,
    IReadOnlyList<GitHubIssueCommentResult> Comments);

public record GitHubIssueAddCommentResult(bool Success, string? Error);
public record GitHubIssueStateUpdateResult(bool Success, bool IssueNotFound, string? Error);

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

    Task<GitHubIssueStateUpdateResult> CloseIssueAsync(
        string owner,
        string repo,
        int issueNumber,
        string? workspaceTokenProtected,
        CancellationToken cancellationToken = default);
}

public class GitHubIssueService : IGitHubIssueService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
    private static readonly Regex CommentAuthorMarkerRegex = new("<!--\\s*tk-user:(.*?)\\s*-->", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SupportTicketMetadataSectionRegex = new(@"^##\s+Support Ticket[\s\S]*?(?=^###|\z)", RegexOptions.IgnoreCase | RegexOptions.Multiline | RegexOptions.Compiled);
    private static readonly Regex EnvironmentSectionRegex = new(@"^###\s+Environment[\s\S]*", RegexOptions.IgnoreCase | RegexOptions.Multiline | RegexOptions.Compiled);

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

        var labels = BuildLabels(request.Category);
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

    private static string[] BuildLabels(string category)
    {
        var normalizedCategory = MapCategoryToGitHubLabel(category);

        return
        [
            normalizedCategory
        ];
    }

    private static string MapCategoryToGitHubLabel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "bug";
        }

        return value.Trim().ToLowerInvariant() switch
        {
            "feature" => "enhancement",
            "enhancement" => "enhancement",
            "question" => "question",
            _ => "bug"
        };
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
            return new GitHubIssueDetailsResult(false, "No GitHub token configured.", false, string.Empty, string.Empty, string.Empty, string.Empty, null, null, [], []);
        }

        var client = _httpClientFactory.CreateClient(nameof(GitHubIssueService));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Timekeeper-Support");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github.full+json"));

        try
        {
            var issueResponse = await client.GetAsync($"/repos/{owner}/{repo}/issues/{issueNumber}", cancellationToken);
            var issueBodyText = await issueResponse.Content.ReadAsStringAsync(cancellationToken);

            if (IsIssueMissingStatusCode(issueResponse.StatusCode)
                || ResponseIndicatesIssueMissingInBody(issueBodyText))
            {
                return new GitHubIssueDetailsResult(false, "Issue was not found on GitHub.", true, string.Empty, string.Empty, string.Empty, string.Empty, null, null, [], []);
            }

            if (!issueResponse.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "GitHub API returned {StatusCode} fetching issue {Owner}/{Repo}#{IssueNumber}. Response: {GitHubResponse}",
                    (int)issueResponse.StatusCode, owner, repo, issueNumber,
                    issueBodyText.Length > 500 ? issueBodyText[..500] : issueBodyText);
                return new GitHubIssueDetailsResult(false, "Could not load issue details from GitHub.", false, string.Empty, string.Empty, string.Empty, string.Empty, null, null, [], []);
            }

            using var issueDoc = JsonDocument.Parse(issueBodyText);
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

            var bodyHtml = issueRoot.TryGetProperty("body_html", out var bodyHtmlElement)
                ? bodyHtmlElement.GetString() ?? string.Empty
                : string.Empty;

            var bodyMarkdown = issueRoot.TryGetProperty("body", out var bodyElement)
                ? bodyElement.GetString() ?? string.Empty
                : string.Empty;

            var body = !string.IsNullOrWhiteSpace(bodyHtml)
                ? CleanIssueHtmlForApp(bodyHtml)
                : ConvertMarkdownToSafeHtml(StripSupportMetadataFromMarkdown(bodyMarkdown));

            var labels = ParseIssueLabels(issueRoot);

            DateTime? createdAt = issueRoot.TryGetProperty("created_at", out var createdAtElement)
                ? ParseGitHubDateTime(createdAtElement.GetString())
                : null;

            DateTime? updatedAt = issueRoot.TryGetProperty("updated_at", out var updatedAtElement)
                ? ParseGitHubDateTime(updatedAtElement.GetString())
                : null;

            var comments = await GetIssueCommentsAsync(client, owner, repo, issueNumber, cancellationToken);

            return new GitHubIssueDetailsResult(true, null, false, state, title, body, htmlUrl, createdAt, updatedAt, labels, comments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error fetching issue details for {Owner}/{Repo}#{IssueNumber}", owner, repo, issueNumber);
            return new GitHubIssueDetailsResult(false, "Could not load issue details from GitHub.", false, string.Empty, string.Empty, string.Empty, string.Empty, null, null, [], []);
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

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError(
                "GitHub API returned {StatusCode} posting comment for {Owner}/{Repo}#{IssueNumber}. Response: {GitHubResponse}",
                (int)response.StatusCode, owner, repo, issueNumber,
                responseBody.Length > 500 ? responseBody[..500] : responseBody);
            return new GitHubIssueAddCommentResult(false, "Could not post comment to GitHub.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error posting comment for {Owner}/{Repo}#{IssueNumber}", owner, repo, issueNumber);
            return new GitHubIssueAddCommentResult(false, "Could not post comment to GitHub.");
        }
    }

    public async Task<GitHubIssueStateUpdateResult> CloseIssueAsync(
        string owner,
        string repo,
        int issueNumber,
        string? workspaceTokenProtected,
        CancellationToken cancellationToken = default)
    {
        var token = ResolveToken(workspaceTokenProtected);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new GitHubIssueStateUpdateResult(false, false, "No GitHub token configured.");
        }

        var client = _httpClientFactory.CreateClient(nameof(GitHubIssueService));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Timekeeper-Support");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        var payload = new { state = "closed" };
        var content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        try
        {
            var response = await client.PatchAsync($"/repos/{owner}/{repo}/issues/{issueNumber}", content, cancellationToken);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return new GitHubIssueStateUpdateResult(false, true, "Issue was not found on GitHub.");
            }

            if (response.IsSuccessStatusCode)
            {
                return new GitHubIssueStateUpdateResult(true, false, null);
            }

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError(
                "GitHub API returned {StatusCode} closing issue {Owner}/{Repo}#{IssueNumber}. Response: {GitHubResponse}",
                (int)response.StatusCode, owner, repo, issueNumber,
                responseBody.Length > 500 ? responseBody[..500] : responseBody);
            return new GitHubIssueStateUpdateResult(false, false, "Could not close issue on GitHub.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error closing issue {Owner}/{Repo}#{IssueNumber}", owner, repo, issueNumber);
            return new GitHubIssueStateUpdateResult(false, false, "Could not close issue on GitHub.");
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
            var githubAuthor = comment.TryGetProperty("user", out var user)
                && user.TryGetProperty("login", out var login)
                ? login.GetString() ?? "unknown"
                : "unknown";

            var rawBody = comment.TryGetProperty("body", out var bodyElement)
                ? bodyElement.GetString() ?? string.Empty
                : string.Empty;

            var bodyHtml = comment.TryGetProperty("body_html", out var bodyHtmlElement)
                ? bodyHtmlElement.GetString() ?? string.Empty
                : string.Empty;

            DateTime createdAt = comment.TryGetProperty("created_at", out var createdAtElement)
                ? ParseGitHubDateTime(createdAtElement.GetString()) ?? DateTime.UtcNow
                : DateTime.UtcNow;

            DateTime? updatedAt = comment.TryGetProperty("updated_at", out var updatedAtElement)
                ? ParseGitHubDateTime(updatedAtElement.GetString())
                : null;

            var url = comment.TryGetProperty("html_url", out var urlElement)
                ? urlElement.GetString() ?? string.Empty
                : string.Empty;

            var (author, cleanedBody) = ExtractAuthorAndBody(rawBody, githubAuthor);
            var body = string.IsNullOrWhiteSpace(bodyHtml)
                ? ConvertMarkdownToSafeHtml(cleanedBody)
                : bodyHtml;

            comments.Add(new GitHubIssueCommentResult(author, body, createdAt, updatedAt, url));
        }

        return comments
            .OrderBy(c => c.CreatedAt)
            .ToList();
    }

    private static IReadOnlyList<GitHubIssueLabelResult> ParseIssueLabels(JsonElement issueRoot)
    {
        if (!issueRoot.TryGetProperty("labels", out var labelsElement)
            || labelsElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var labels = new List<GitHubIssueLabelResult>();
        foreach (var label in labelsElement.EnumerateArray())
        {
            var name = label.TryGetProperty("name", out var nameElement)
                ? nameElement.GetString() ?? string.Empty
                : string.Empty;

            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            var color = label.TryGetProperty("color", out var colorElement)
                ? colorElement.GetString() ?? string.Empty
                : string.Empty;

            labels.Add(new GitHubIssueLabelResult(name.Trim(), color.Trim()));
        }

        return labels;
    }

    private static string StripSupportMetadataFromMarkdown(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return markdown;
        }

        // Remove "## Support Ticket" header and its bullet list (up to the first ### heading)
        var result = SupportTicketMetadataSectionRegex.Replace(markdown, string.Empty);

        // Remove "### Environment" header and its bullet list (to end of string)
        result = EnvironmentSectionRegex.Replace(result, string.Empty);

        return result.Trim();
    }

    /// <summary>
    /// Cleans the GitHub issue body HTML by removing metadata sections that should not be shown to users.
    /// This is specifically designed for the initial issue body structure created by BuildIssueBody():
    /// - ## Support Ticket (with metadata like Category, Severity, etc.)
    /// - ### Description
    /// - ### Steps To Reproduce
    /// - ### Expected Behavior
    /// - ### Actual Behavior
    /// - ### Environment (with browser, OS, etc.)
    /// </summary>
    private static string CleanIssueHtmlForApp(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        // Remove "Support Ticket" section: from <h2>Support Ticket</h2> until the next heading (h2 or h3)
        // The lookahead (?=<h[23][^>]*>) stops before the next h2/h3 (which is "### Description")
        // This preserves all user-visible sections (Description, Steps, Expected, Actual)
        var cleaned = Regex.Replace(
            html,
            "<h2[^>]*>\\s*Support Ticket\\s*</h2>.*?(?=<h[23][^>]*>|$)",
            string.Empty,
            RegexOptions.IgnoreCase | RegexOptions.Singleline);

        // Remove "Environment" section: from <h3>Environment</h3> to the end
        // Environment is always the last section in BuildIssueBody(), so we can safely remove to end
        cleaned = Regex.Replace(
            cleaned,
            "<h3[^>]*>\\s*Environment\\s*</h3>.*",
            string.Empty,
            RegexOptions.IgnoreCase | RegexOptions.Singleline);

        return cleaned.Trim();
    }

    private static string ConvertMarkdownToSafeHtml(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return string.Empty;
        }

        return WebUtility.HtmlEncode(markdown).Replace("\n", "<br/>");
    }

    private static DateTime? ParseGitHubDateTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (DateTimeOffset.TryParse(
            value,
            null,
            System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal,
            out var parsed))
        {
            return parsed.UtcDateTime;
        }

        return null;
    }

    private static bool IsIssueMissingStatusCode(HttpStatusCode statusCode)
    {
        return statusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone;
    }

    private static bool ResponseIndicatesIssueMissingInBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("message", out var messageElement))
            {
                return false;
            }

            var message = messageElement.GetString();
            if (string.IsNullOrWhiteSpace(message))
            {
                return false;
            }

            var normalized = message.ToLowerInvariant();
            return normalized.Contains("not found")
                || normalized.Contains("no issue")
                || normalized.Contains("issue does not exist")
                || normalized.Contains("was deleted");
        }
        catch
        {
            return false;
        }
    }

    private static (string Author, string Body) ExtractAuthorAndBody(string rawBody, string fallbackAuthor)
    {
        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return (fallbackAuthor, string.Empty);
        }

        var match = CommentAuthorMarkerRegex.Match(rawBody);
        if (!match.Success)
        {
            return (fallbackAuthor, rawBody);
        }

        var logicalAuthor = match.Groups[1].Value.Trim();
        var cleanedBody = CommentAuthorMarkerRegex.Replace(rawBody, string.Empty, 1).Trim();

        return (
            string.IsNullOrWhiteSpace(logicalAuthor) ? fallbackAuthor : logicalAuthor,
            cleanedBody);
    }
}
