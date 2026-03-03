using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json.Serialization;
using Timekeeper.Api.Auth;
using Timekeeper.Api.Services;
using Timekeeper.Core.Data;
using Timekeeper.Core.Services;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly IAiService _aiService;
    private readonly IWorkspaceContext _workspaceContext;
    private readonly TimekeeperContext _context;
    private readonly ISupportTokenProtector _tokenProtector;

    public AiController(
        IAiService aiService,
        IWorkspaceContext workspaceContext,
        TimekeeperContext context,
        ISupportTokenProtector tokenProtector)
    {
        _aiService = aiService;
        _workspaceContext = workspaceContext;
        _context = context;
        _tokenProtector = tokenProtector;
    }

    /// <summary>Returns whether the AI feature is enabled for this workspace.</summary>
    [HttpGet("status")]
    public async Task<ActionResult<AiStatusDto>> GetStatus(CancellationToken ct)
    {
        var enabled = await _aiService.IsEnabledForWorkspaceAsync(_workspaceContext.WorkspaceId, ct);
        return Ok(new AiStatusDto(enabled));
    }

    /// <summary>Test the configured GitHub token by sending a lightweight ping to the GitHub Models API.</summary>
    [HttpPost("test")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<AiTestResultDto>> TestConnection(CancellationToken ct)
    {
        var enabled = await _aiService.IsEnabledForWorkspaceAsync(_workspaceContext.WorkspaceId, ct);
        if (!enabled)
            return Ok(new AiTestResultDto(false, "AI Assistant is disabled or GitHub token is not configured."));

        var ok = await _aiService.TestConnectionAsync(_workspaceContext.WorkspaceId, ct);
        return Ok(new AiTestResultDto(ok, ok
            ? "Connection successful. GitHub token is valid."
            : "Connection failed. The GitHub token may be invalid or expired."));
    }

    /// <summary>Get the current AI config for this workspace (admin only).</summary>
    [HttpGet("config")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<AiConfigDto>> GetConfig(CancellationToken ct)
    {
        var ws = await _context.Workspaces.FirstOrDefaultAsync(ct);
        if (ws == null) return NotFound();

        return Ok(new AiConfigDto(
            ws.CopilotEnabled,
            !string.IsNullOrWhiteSpace(ws.CopilotGitHubTokenProtected),
            _aiService.IsConfiguredGlobally
        ));
    }

    /// <summary>Save AI config for this workspace (admin only).</summary>
    [HttpPost("config")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<AiConfigDto>> SaveConfig([FromBody] SaveAiConfigRequest request, CancellationToken ct)
    {
        var ws = await _context.Workspaces.FirstOrDefaultAsync(ct);
        if (ws == null) return NotFound();

        ws.CopilotEnabled = request.Enabled;

        if (!string.IsNullOrWhiteSpace(request.GitHubToken))
            ws.CopilotGitHubTokenProtected = _tokenProtector.Protect(request.GitHubToken);
        else if (request.ClearToken)
            ws.CopilotGitHubTokenProtected = null;

        ws.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return Ok(new AiConfigDto(
            ws.CopilotEnabled,
            !string.IsNullOrWhiteSpace(ws.CopilotGitHubTokenProtected),
            _aiService.IsConfiguredGlobally
        ));
    }

    /// <summary>
    /// Stream a chat response as Server-Sent Events.
    /// Each SSE event carries one text chunk. A final "data: [DONE]" signals end of stream.
    /// </summary>
    [HttpPost("chat")]
    public async Task StreamChat([FromBody] ChatRequest request, CancellationToken ct)
    {
        var workspaceId = _workspaceContext.WorkspaceId;
        var enabled = await _aiService.IsEnabledForWorkspaceAsync(workspaceId, ct);

        if (!enabled)
        {
            Response.StatusCode = 503;
            await Response.WriteAsync("AI Assistant is not configured. An admin must enable it and provide a GitHub token in Settings.");
            return;
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("Message is required.");
            return;
        }

        var userId = _workspaceContext.UserId ?? 1;
        var sessionKey = $"{userId}:{workspaceId}";

        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        try
        {
            await foreach (var chunk in _aiService.StreamChatAsync(sessionKey, request.Message, userId, workspaceId, ct))
            {
                var escaped = chunk.Replace("\n", "\\n").Replace("\r", "");
                await Response.WriteAsync($"data: {escaped}\n\n", Encoding.UTF8, ct);
                await Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected — normal
        }

        await Response.WriteAsync("data: [DONE]\n\n", Encoding.UTF8, ct);
        await Response.Body.FlushAsync(ct);
    }

    /// <summary>Clear conversation history for the current user's session.</summary>
    [HttpDelete("session")]
    public ActionResult ClearSession()
    {
        var userId = _workspaceContext.UserId ?? 1;
        _aiService.ClearSession($"{userId}:{_workspaceContext.WorkspaceId}");
        return NoContent();
    }

    /// <summary>Resolve a natural-language description to the best matching task.</summary>
    [HttpPost("resolve-task")]
    public async Task<ActionResult<ResolveTaskResponse>> ResolveTask([FromBody] ResolveTaskRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
            return BadRequest("Description is required.");

        var result = await _aiService.ResolveTaskAsync(request.Description, _workspaceContext.WorkspaceId, ct);
        if (result == null)
            return Ok(new ResolveTaskResponse(false, null, null, null, null, "AI is not configured."));

        return Ok(new ResolveTaskResponse(result.Found, result.TaskId, result.TaskName, result.ProjectName, result.CustomerName, result.Reasoning));
    }

    /// <summary>Rewrite a raw note into a professional, customer-ready invoice note.</summary>
    [HttpPost("polish-note")]
    public async Task<ActionResult<PolishNoteResponse>> PolishNote([FromBody] PolishNoteRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RawNote))
            return BadRequest("rawNote is required.");

        var polished = await _aiService.PolishNoteAsync(
            request.RawNote, request.TaskName, request.ProjectName, request.CustomerName,
            _workspaceContext.WorkspaceId, ct);

        if (polished == null)
            return Ok(new PolishNoteResponse(request.RawNote)); // fallback: return original

        return Ok(new PolishNoteResponse(polished.Trim()));
    }
}

public record ChatRequest([property: JsonPropertyName("message")] string Message);
public record AiStatusDto([property: JsonPropertyName("enabled")] bool Enabled);
public record AiTestResultDto(
    [property: JsonPropertyName("success")] bool Success,
    [property: JsonPropertyName("message")] string Message);
public record AiConfigDto(
    [property: JsonPropertyName("enabled")] bool Enabled,
    [property: JsonPropertyName("tokenConfigured")] bool TokenConfigured,
    [property: JsonPropertyName("globallyConfigured")] bool GloballyConfigured);
public record SaveAiConfigRequest(
    [property: JsonPropertyName("enabled")] bool Enabled,
    [property: JsonPropertyName("gitHubToken")] string? GitHubToken,
    [property: JsonPropertyName("clearToken")] bool ClearToken = false);
public record ResolveTaskRequest(
    [property: JsonPropertyName("description")] string Description);
public record ResolveTaskResponse(
    [property: JsonPropertyName("found")] bool Found,
    [property: JsonPropertyName("taskId")] int? TaskId,
    [property: JsonPropertyName("taskName")] string? TaskName,
    [property: JsonPropertyName("projectName")] string? ProjectName,
    [property: JsonPropertyName("customerName")] string? CustomerName,
    [property: JsonPropertyName("reasoning")] string? Reasoning);
public record PolishNoteRequest(
    [property: JsonPropertyName("rawNote")] string RawNote,
    [property: JsonPropertyName("taskName")] string? TaskName = null,
    [property: JsonPropertyName("projectName")] string? ProjectName = null,
    [property: JsonPropertyName("customerName")] string? CustomerName = null);
public record PolishNoteResponse(
    [property: JsonPropertyName("note")] string Note);

