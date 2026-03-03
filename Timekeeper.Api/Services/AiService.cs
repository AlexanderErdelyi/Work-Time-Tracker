using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Api.Services;

public interface IAiService
{
    /// <summary>True if the feature is globally enabled via appsettings / env vars (config-based).</summary>
    bool IsConfiguredGlobally { get; }

    /// <summary>Check if AI is enabled for a given workspace (DB config takes precedence over global config).</summary>
    Task<bool> IsEnabledForWorkspaceAsync(int workspaceId, CancellationToken ct = default);

    /// <summary>Test the effective GitHub token for a workspace.</summary>
    Task<bool> TestConnectionAsync(int workspaceId, CancellationToken ct = default);

    IAsyncEnumerable<string> StreamChatAsync(string sessionKey, string userMessage, int userId, int workspaceId, CancellationToken ct = default);

    void ClearSession(string sessionKey);

    /// <summary>Resolve a natural-language work description to the best matching task.</summary>
    Task<ResolveTaskResult?> ResolveTaskAsync(string description, int workspaceId, CancellationToken ct = default);

    /// <summary>Rewrite a raw note into a professional, customer-ready invoice note.</summary>
    Task<string?> PolishNoteAsync(string rawNote, string? taskName, string? projectName, string? customerName, string? language, int workspaceId, CancellationToken ct = default);
}

public class ResolveTaskResult
{
    public bool Found { get; set; }
    public int? TaskId { get; set; }
    public string TaskName { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string Reasoning { get; set; } = string.Empty;
}

public class AiService : IAiService
{
    private const string ModelsEndpoint = "https://models.inference.ai.azure.com/chat/completions";

    private readonly IConfiguration _config;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AiService> _logger;
    private readonly IWebHostEnvironment _webHostEnv;

    // sessionKey = "{userId}:{workspaceId}"
    private readonly ConcurrentDictionary<string, List<JsonObject>> _sessions = new();

    private string? GlobalToken => _config["Copilot:GitHubToken"];
    private string ModelName => _config["Copilot:ModelName"] ?? "gpt-4o-mini";

    public bool IsConfiguredGlobally =>
        _config.GetValue<bool>("Copilot:Enabled") &&
        !string.IsNullOrWhiteSpace(GlobalToken);

    public AiService(
        IConfiguration config,
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        ILogger<AiService> logger,
        IWebHostEnvironment webHostEnv)
    {
        _config = config;
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _webHostEnv = webHostEnv;
    }

    private async Task<(bool enabled, string? token)> GetWorkspaceConfigAsync(int workspaceId, CancellationToken ct = default)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<TimekeeperContext>();
            var protector = scope.ServiceProvider.GetRequiredService<ISupportTokenProtector>();

            var ws = await db.Workspaces.IgnoreQueryFilters()
                .FirstOrDefaultAsync(w => w.Id == workspaceId, ct);
            if (ws == null) return (IsConfiguredGlobally, GlobalToken);

            // DB setting takes precedence
            if (ws.CopilotEnabled && !string.IsNullOrWhiteSpace(ws.CopilotGitHubTokenProtected))
            {
                var token = protector.TryUnprotect(ws.CopilotGitHubTokenProtected);
                return (true, token);
            }

            // Fall back to global config
            return (IsConfiguredGlobally, GlobalToken);
        }
        catch
        {
            return (IsConfiguredGlobally, GlobalToken);
        }
    }

    public async Task<bool> IsEnabledForWorkspaceAsync(int workspaceId, CancellationToken ct = default)
    {
        var (enabled, token) = await GetWorkspaceConfigAsync(workspaceId, ct);
        return enabled && !string.IsNullOrWhiteSpace(token);
    }

    public async Task<bool> TestConnectionAsync(int workspaceId, CancellationToken ct = default)
    {
        var (_, token) = await GetWorkspaceConfigAsync(workspaceId, ct);
        if (string.IsNullOrWhiteSpace(token)) return false;
        try
        {
            var client = _httpClientFactory.CreateClient("copilot");
            var req = new HttpRequestMessage(HttpMethod.Post, ModelsEndpoint);
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            req.Content = new StringContent(JsonSerializer.Serialize(new
            {
                model = ModelName,
                messages = new[] { new { role = "user", content = "hi" } },
                max_tokens = 5
            }), Encoding.UTF8, "application/json");
            var resp = await client.SendAsync(req, ct);
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI connection test failed");
            return false;
        }
    }

    public void ClearSession(string sessionKey) => _sessions.TryRemove(sessionKey, out _);

    public async IAsyncEnumerable<string> StreamChatAsync(
        string sessionKey,
        string userMessage,
        int userId,
        int workspaceId,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var (enabled, token) = await GetWorkspaceConfigAsync(workspaceId, ct);
        if (!enabled || string.IsNullOrWhiteSpace(token))
        {
            yield return "[ERROR: AI Assistant is not configured. An admin must enable it and provide a GitHub token in Settings.]";
            yield break;
        }

        var history = _sessions.GetOrAdd(sessionKey, _ => []);

        // System message (re-built every turn so workspace name stays fresh)
        string workspaceName = await GetWorkspaceNameAsync(workspaceId);
        var system = new JsonObject
        {
            ["role"] = "system",
            ["content"] = $"""
                You are a time tracking assistant for Timekeeper.
                The user is in workspace "{workspaceName}". Today is {DateTime.UtcNow:yyyy-MM-dd}.

                TASK SEARCH — follow these steps exactly every time:
                1. When the user mentions any task, project, or customer (even partially or with typos), call get_tasks with NO arguments to get all tasks.
                2. Fuzzy-match the user's words against task name, project name, and customer name in the results.
                3. If exactly one task is a plausible match, confirm it by name and proceed.
                4. If multiple tasks match, list them briefly and ask which one.
                5. NEVER call get_customers or get_projects as an intermediate step — go straight to get_tasks.
                6. NEVER say a task was not found without first calling get_tasks with no filter.

                IMPORTING ERP / TIMESHEET DATA:
                When the user pastes tabular data (tab-separated or similar) from an external system (e.g. Business Central, SAP, Jira), parse each row and extract:
                - Customer name: look for fields like "Projekt Beschreibung" — the part before " - " and the project number is usually the customer name (e.g. "NOBILIS - 5276 - DMS: SLA" → customer = "NOBILIS").
                - Project name: the rest of the project description after the customer and number (e.g. "DMS: SLA - TM (A)"). Use the project number ("Projektnr.") as the No field.
                - Task name: use "Projektzeile Beschreibung" or "Beschreibung" (whichever is more descriptive). Use "Position" as the position field.
                - Time: use "Menge" as hours, "Buchungsdatum" as the date.
                - Notes: use "Erste Kommentarzeile" or "Beschreibung 2" if present.
                Workflow for ERP data — STRICTLY follow this order:
                1. Parse all rows first. Do NOT call any tool yet.
                2. Call get_tasks (no filter) once to check what already exists.
                3. Present a full preview to the user in a clear table or list — for EVERY row show:
                   - 📁 Customer: "<name>" [NEW] or [EXISTS]
                   - 📂 Project: "<name>" (No: <no>) [NEW] or [EXISTS]
                   - ✅ Task: "<name>" (Position: <pos>) [NEW] or [EXISTS]
                   - 🕐 Time entry: <date>, <hours>h, notes: "<notes>"
                4. End the preview with: "Shall I create everything listed above? (yes / edit first)"
                5. WAIT for the user to reply. Do NOT call create_customer, create_project, create_task, or create_time_entry until the user explicitly confirms.
                6. On confirmation: call create_customer (if new) → create_project (if new) → create_task (if new) → create_time_entry, in that order, for each row.
                7. Group rows by customer/project to avoid redundant create calls.
                8. After all rows are processed, report a summary: what was created vs what already existed.

                DOCUMENTATION:
                - If the user asks how something works, how to use a feature, or a general app question, call get_documentation to look it up.
                - First call get_documentation with no slug to see the list of available topics, then call it again with the matching slug to read the content.

                GENERAL:
                - Always confirm with the user before creating or modifying entries.
                - Keep answers short and direct. Do not narrate tool calls.
                """
        };

        // Append user message
        history.Add(new JsonObject { ["role"] = "user", ["content"] = userMessage });

        // Tool-call loop (max 5 rounds to avoid infinite loops)
        for (int round = 0; round < 5; round++)
        {
            // Build messages array: [system] + history
            // Re-parse system each round — JsonNode instances can't have multiple parents
            var messages = new JsonArray();
            messages.Add(JsonNode.Parse(system.ToJsonString()));
            foreach (var m in history)
                messages.Add(JsonNode.Parse(m.ToJsonString()));

            var requestBody = new JsonObject
            {
                ["model"] = ModelName,
                ["messages"] = messages,
                ["tools"] = GetToolDefinitions(),
                ["tool_choice"] = "auto",
                ["stream"] = true
            };

            string? assistantText = null;
            List<ToolCallAccumulator>? toolCalls = null;
            string? finishReason = null;

            var client = _httpClientFactory.CreateClient("copilot");
            var req = new HttpRequestMessage(HttpMethod.Post, ModelsEndpoint);
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            req.Content = new StringContent(requestBody.ToJsonString(), Encoding.UTF8, "application/json");

            HttpResponseMessage resp;
            string? earlyError = null;
            try
            {
                resp = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI API request failed");
                earlyError = "[ERROR: Failed to connect to AI service. Check the GitHub token in Settings.]";
                resp = null!;
            }

            if (earlyError != null) { yield return earlyError; yield break; }

            if (!resp.IsSuccessStatusCode)
            {
                var errBody = await resp.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("AI API error {Status}: {Body}", resp.StatusCode, errBody);
                yield return $"[ERROR: AI service returned {(int)resp.StatusCode}. Check the GitHub token in Settings.]";
                yield break;
            }

            // Parse SSE stream
            using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var reader = new StreamReader(stream);

            while (!reader.EndOfStream && !ct.IsCancellationRequested)
            {
                var line = await reader.ReadLineAsync(ct);
                if (line == null) break;
                if (!line.StartsWith("data: ")) continue;

                var data = line["data: ".Length..];
                if (data == "[DONE]") break;

                JsonNode? chunk;
                try { chunk = JsonNode.Parse(data); }
                catch { continue; }

                var choicesArray = chunk?["choices"]?.AsArray();
                if (choicesArray == null || choicesArray.Count == 0) continue;
                var choice = choicesArray[0];

                finishReason = choice["finish_reason"]?.GetValue<string>();
                var delta = choice["delta"];
                if (delta == null) continue;

                // Accumulate text content
                var deltaContent = delta["content"]?.GetValue<string>();
                if (!string.IsNullOrEmpty(deltaContent))
                {
                    assistantText = (assistantText ?? "") + deltaContent;
                    yield return deltaContent;
                }

                // Accumulate tool calls
                var deltaTools = delta["tool_calls"]?.AsArray();
                if (deltaTools != null)
                {
                    toolCalls ??= [];
                    foreach (var tcDelta in deltaTools)
                    {
                        var idx = tcDelta?["index"]?.GetValue<int>() ?? 0;
                        while (toolCalls.Count <= idx) toolCalls.Add(new ToolCallAccumulator());

                        var acc = toolCalls[idx];
                        if (tcDelta?["id"]?.GetValue<string>() is string id) acc.Id = id;
                        if (tcDelta?["function"]?["name"]?.GetValue<string>() is string name) acc.Name = name;
                        if (tcDelta?["function"]?["arguments"]?.GetValue<string>() is string args) acc.Arguments += args;
                    }
                }
            }

            // If there were tool calls, execute and loop
            if (finishReason == "tool_calls" && toolCalls?.Count > 0)
            {
                // Add assistant tool-call message to history
                var toolCallsJson = new JsonArray();
                foreach (var tc in toolCalls)
                {
                    toolCallsJson.Add(new JsonObject
                    {
                        ["id"] = tc.Id,
                        ["type"] = "function",
                        ["function"] = new JsonObject
                        {
                            ["name"] = tc.Name,
                            ["arguments"] = tc.Arguments
                        }
                    });
                }
                history.Add(new JsonObject
                {
                    ["role"] = "assistant",
                    ["content"] = (JsonNode?)null,
                    ["tool_calls"] = toolCallsJson
                });

                // Execute tools and add results
                foreach (var tc in toolCalls)
                {
                    JsonElement argsElement;
                    try
                    {
                        argsElement = JsonDocument.Parse(tc.Arguments ?? "{}").RootElement;
                    }
                    catch
                    {
                        argsElement = JsonDocument.Parse("{}").RootElement;
                    }

                    string toolResult;
                    try
                    {
                        toolResult = await ExecuteToolAsync(tc.Name ?? "", argsElement, userId, workspaceId, ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Tool {Tool} failed", tc.Name);
                        toolResult = $"{{\"error\": \"{ex.Message}\"}}";
                    }

                    history.Add(new JsonObject
                    {
                        ["role"] = "tool",
                        ["tool_call_id"] = tc.Id,
                        ["content"] = toolResult
                    });
                }

                // Continue to next round (model will see tool results)
                continue;
            }

            // No more tool calls — store assistant reply and we're done
            if (!string.IsNullOrEmpty(assistantText))
            {
                history.Add(new JsonObject
                {
                    ["role"] = "assistant",
                    ["content"] = assistantText
                });
            }
            break;
        }
    }

    // ────────────────────────────────────────────────────────────
    // Tool execution
    // ────────────────────────────────────────────────────────────

    private async Task<string> ExecuteToolAsync(string name, JsonElement args, int userId, int workspaceId, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TimekeeperContext>();

        switch (name)
        {
            case "get_today_summary":
                return await GetTodaySummaryAsync(db, userId, ct);

            case "get_recent_entries":
            {
                var days = args.TryGetProperty("days", out var d) ? d.GetInt32() : 7;
                return await GetRecentEntriesAsync(db, userId, days, ct);
            }

            case "get_customers":
                return await GetCustomersAsync(db, ct);

            case "get_projects":
            {
                int? customerId = args.TryGetProperty("customer_id", out var c) && c.ValueKind == JsonValueKind.Number
                    ? c.GetInt32() : null;
                return await GetProjectsAsync(db, customerId, ct);
            }

            case "get_tasks":
            {
                int? projectId = args.TryGetProperty("project_id", out var p) && p.ValueKind == JsonValueKind.Number
                    ? p.GetInt32() : null;
                return await GetTasksAsync(db, projectId, ct);
            }

            case "create_time_entry":
                return await CreateTimeEntryAsync(db, args, userId, workspaceId, ct);

            case "start_timer":
            {
                int? taskId = args.TryGetProperty("task_id", out var t) && t.ValueKind == JsonValueKind.Number
                    ? t.GetInt32() : null;
                return await StartTimerAsync(db, userId, workspaceId, taskId, ct);
            }

            case "get_running_timer":
                return await GetRunningTimerAsync(db, userId, ct);

            case "get_documentation":
            {
                var slug = args.TryGetProperty("slug", out var s) ? s.GetString() : null;
                return await GetDocumentationAsync(slug);
            }

            case "create_customer":
                return await CreateCustomerAsync(db, args, workspaceId, ct);

            case "create_project":
                return await CreateProjectAsync(db, args, workspaceId, ct);

            case "create_task":
                return await CreateTaskAsync(db, args, workspaceId, ct);

            default:
                return $"{{\"error\": \"Unknown tool: {name}\"}}";
        }
    }

    private static async Task<string> GetTodaySummaryAsync(TimekeeperContext db, int userId, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var entries = await db.TimeEntries
            .Include(e => e.Task).ThenInclude(t => t!.Project).ThenInclude(p => p.Customer)
            .Where(e => e.UserId == userId && e.StartTime >= today && e.StartTime < tomorrow)
            .OrderBy(e => e.StartTime)
            .ToListAsync(ct);

        var workday = await db.WorkDays
            .Where(w => w.UserId == userId && w.Date.Date == today)
            .FirstOrDefaultAsync(ct);

        var result = new
        {
            date = today.ToString("yyyy-MM-dd"),
            work_day_started = workday?.CheckInTime?.ToString("HH:mm"),
            work_day_ended = workday?.CheckOutTime?.ToString("HH:mm"),
            entry_count = entries.Count,
            total_minutes = entries.Sum(e => e.Duration?.TotalMinutes ?? 0),
            running_entry = entries.FirstOrDefault(e => e.IsRunning) is { } r ? new
            {
                id = r.Id,
                task = r.Task?.Name,
                project = r.Task?.Project?.Name,
                customer = r.Task?.Project?.Customer?.Name,
                started = r.StartTime.ToString("HH:mm")
            } : null,
            entries = entries.Where(e => !e.IsRunning).Select(e => new
            {
                id = e.Id,
                task = e.Task?.Name,
                project = e.Task?.Project?.Name,
                customer = e.Task?.Project?.Customer?.Name,
                start = e.StartTime.ToString("HH:mm"),
                end = e.EndTime?.ToString("HH:mm"),
                duration_minutes = (int)(e.Duration?.TotalMinutes ?? 0),
                notes = e.Notes,
                status = e.Status.ToString()
            })
        };
        return JsonSerializer.Serialize(result);
    }

    private static async Task<string> GetRecentEntriesAsync(TimekeeperContext db, int userId, int days, CancellationToken ct)
    {
        var since = DateTime.UtcNow.Date.AddDays(-days);

        var entries = await db.TimeEntries
            .Include(e => e.Task).ThenInclude(t => t!.Project).ThenInclude(p => p.Customer)
            .Where(e => e.UserId == userId && e.StartTime >= since && e.EndTime.HasValue)
            .OrderByDescending(e => e.StartTime)
            .Take(50)
            .ToListAsync(ct);

        var grouped = entries.GroupBy(e => e.StartTime.Date).Select(g => new
        {
            date = g.Key.ToString("yyyy-MM-dd"),
            total_minutes = (int)g.Sum(e => e.Duration?.TotalMinutes ?? 0),
            entries = g.Select(e => new
            {
                id = e.Id,
                task = e.Task?.Name,
                project = e.Task?.Project?.Name,
                customer = e.Task?.Project?.Customer?.Name,
                duration_minutes = (int)(e.Duration?.TotalMinutes ?? 0),
                notes = e.Notes
            })
        });
        return JsonSerializer.Serialize(grouped);
    }

    private static async Task<string> GetCustomersAsync(TimekeeperContext db, CancellationToken ct)
    {
        var customers = await db.Customers
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(ct);
        return JsonSerializer.Serialize(customers);
    }

    private static async Task<string> GetProjectsAsync(TimekeeperContext db, int? customerId, CancellationToken ct)
    {
        var q = db.Projects
            .Include(p => p.Customer)
            .Where(p => p.IsActive);
        if (customerId.HasValue) q = q.Where(p => p.CustomerId == customerId.Value);
        var projects = await q
            .OrderBy(p => p.Customer.Name).ThenBy(p => p.Name)
            .Select(p => new { p.Id, p.Name, customer = p.Customer.Name, customer_id = p.CustomerId })
            .ToListAsync(ct);
        return JsonSerializer.Serialize(projects);
    }

    private static async Task<string> GetTasksAsync(TimekeeperContext db, int? projectId, CancellationToken ct)
    {
        var q = db.Tasks
            .Include(t => t.Project).ThenInclude(p => p.Customer)
            .Where(t => t.IsActive);
        if (projectId.HasValue) q = q.Where(t => t.ProjectId == projectId.Value);
        var tasks = await q
            .OrderBy(t => t.Project.Name).ThenBy(t => t.Name)
            .Select(t => new
            {
                t.Id,
                t.Name,
                project = t.Project.Name,
                project_id = t.ProjectId,
                customer = t.Project.Customer.Name
            })
            .ToListAsync(ct);
        return JsonSerializer.Serialize(tasks);
    }

    private static async Task<string> CreateTimeEntryAsync(TimekeeperContext db, JsonElement args, int userId, int workspaceId, CancellationToken ct)
    {
        if (!args.TryGetProperty("task_id", out var taskIdEl))
            return "{\"error\": \"task_id is required\"}";

        var taskId = taskIdEl.GetInt32();
        var task = await db.Tasks.Include(t => t.Project).ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(t => t.Id == taskId, ct);
        if (task == null)
            return $"{{\"error\": \"Task {taskId} not found\"}}";

        DateTime startTime;
        if (args.TryGetProperty("start_time", out var startEl) &&
            DateTime.TryParse(startEl.GetString(), out var parsedStart))
            startTime = parsedStart.ToUniversalTime();
        else
            startTime = DateTime.UtcNow;

        DateTime? endTime = null;
        if (args.TryGetProperty("end_time", out var endEl) &&
            DateTime.TryParse(endEl.GetString(), out var parsedEnd))
            endTime = parsedEnd.ToUniversalTime();

        string? notes = args.TryGetProperty("notes", out var notesEl) ? notesEl.GetString() : null;

        var entry = new TimeEntry
        {
            WorkspaceId = workspaceId,
            UserId = userId,
            TaskId = taskId,
            StartTime = startTime,
            EndTime = endTime,
            Notes = notes,
            Status = TimeEntryStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };
        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync(ct);

        return JsonSerializer.Serialize(new
        {
            success = true,
            entry_id = entry.Id,
            task = task.Name,
            project = task.Project?.Name,
            customer = task.Project?.Customer?.Name,
            start = startTime.ToString("HH:mm"),
            end = endTime?.ToString("HH:mm"),
            status = "Draft",
            message = "Time entry created as Draft"
        });
    }

    private static async Task<string> StartTimerAsync(TimekeeperContext db, int userId, int workspaceId, int? taskId, CancellationToken ct)
    {
        // Stop any running timer first
        var running = await db.TimeEntries
            .Where(e => e.UserId == userId && e.EndTime == null && e.PausedAt == null)
            .FirstOrDefaultAsync(ct);
        if (running != null)
        {
            running.EndTime = DateTime.UtcNow;
            running.UpdatedAt = DateTime.UtcNow;
        }

        var entry = new TimeEntry
        {
            WorkspaceId = workspaceId,
            UserId = userId,
            TaskId = taskId,
            StartTime = DateTime.UtcNow,
            Status = TimeEntryStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };
        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync(ct);

        string? taskName = null;
        if (taskId.HasValue)
        {
            var task = await db.Tasks.Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == taskId.Value, ct);
            taskName = task?.Name;
        }

        return JsonSerializer.Serialize(new
        {
            success = true,
            entry_id = entry.Id,
            task = taskName,
            started_at = entry.StartTime.ToString("HH:mm"),
            previous_stopped = running != null,
            message = taskName != null
                ? $"Timer started for \"{taskName}\""
                : "Timer started (no task assigned)"
        });
    }

    private static async Task<string> GetRunningTimerAsync(TimekeeperContext db, int userId, CancellationToken ct)
    {
        var entry = await db.TimeEntries
            .Include(e => e.Task).ThenInclude(t => t!.Project).ThenInclude(p => p!.Customer)
            .Where(e => e.UserId == userId && e.EndTime == null && e.PausedAt == null)
            .FirstOrDefaultAsync(ct);

        if (entry == null)
            return "{\"running\": false, \"message\": \"No timer is currently running\"}";

        var elapsed = DateTime.UtcNow - entry.StartTime - TimeSpan.FromSeconds(entry.TotalPausedSeconds);

        return JsonSerializer.Serialize(new
        {
            running = true,
            entry_id = entry.Id,
            task = entry.Task?.Name,
            project = entry.Task?.Project?.Name,
            customer = entry.Task?.Project?.Customer?.Name,
            started_at = entry.StartTime.ToString("HH:mm"),
            elapsed_minutes = (int)elapsed.TotalMinutes
        });
    }

    private async Task<string> GetDocumentationAsync(string? slug)
    {
        var docsDir = FindDocsDirectory();
        if (docsDir == null)
            return "{\"error\": \"Documentation not available on this server.\"}";

        try
        {
            if (string.IsNullOrWhiteSpace(slug))
            {
                // Return manifest — list of topics
                var manifestPath = Path.Combine(docsDir, "manifest.json");
                if (!File.Exists(manifestPath))
                    return "{\"error\": \"Documentation manifest not found.\"}";
                var json = await File.ReadAllTextAsync(manifestPath);
                // Parse and return just slugs+titles+summaries
                using var doc = JsonDocument.Parse(json);
                var sections = doc.RootElement.GetProperty("sections");
                var list = sections.EnumerateArray().Select(s => new
                {
                    slug = s.GetProperty("slug").GetString(),
                    title = s.GetProperty("title").GetString(),
                    summary = s.GetProperty("summary").GetString()
                });
                return JsonSerializer.Serialize(new { available_topics = list });
            }
            else
            {
                // Sanitise slug — strip traversal chars
                var safe = Path.GetFileName(slug.Trim().Replace('/', '-').Replace('\\', '-'));
                var mdPath = Path.Combine(docsDir, safe.EndsWith(".md") ? safe : safe + ".md");
                if (!File.Exists(mdPath))
                    return $"{{\"error\": \"Documentation page '{slug}' not found.\"}}";
                var content = await File.ReadAllTextAsync(mdPath);
                // Truncate very long docs to ~8000 chars to stay within context
                if (content.Length > 8000)
                    content = content[..8000] + "\n\n[... content truncated ...]";
                return JsonSerializer.Serialize(new { slug, content });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read documentation for slug '{Slug}'", slug);
            return "{\"error\": \"Failed to read documentation.\"}";
        }
    }

    private string? FindDocsDirectory()
    {
        // Production: served from wwwroot/docs (built by Vite)
        var webRoot = _webHostEnv.WebRootPath;
        if (!string.IsNullOrEmpty(webRoot))
        {
            var prod = Path.Combine(webRoot, "docs");
            if (Directory.Exists(prod)) return prod;
        }

        // Development fallback: Timekeeper.Web/public/docs
        var dev = Path.GetFullPath(
            Path.Combine(_webHostEnv.ContentRootPath, "..", "Timekeeper.Web", "public", "docs"));
        if (Directory.Exists(dev)) return dev;

        return null;
    }

    private static async Task<string> CreateCustomerAsync(TimekeeperContext db, JsonElement args, int workspaceId, CancellationToken ct)
    {
        if (!args.TryGetProperty("name", out var nameEl) || string.IsNullOrWhiteSpace(nameEl.GetString()))
            return "{\"error\": \"name is required\"}";

        var name = nameEl.GetString()!.Trim();
        // Check for duplicate (case-insensitive)
        var existing = await db.Customers
            .FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower(), ct);
        if (existing != null)
            return JsonSerializer.Serialize(new { already_exists = true, id = existing.Id, name = existing.Name, no = existing.No });

        var customer = new Customer
        {
            WorkspaceId = workspaceId,
            Name = name,
            No = args.TryGetProperty("no", out var noEl) ? noEl.GetString() : null,
            Description = args.TryGetProperty("description", out var descEl) ? descEl.GetString() : null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Customers.Add(customer);
        await db.SaveChangesAsync(ct);
        return JsonSerializer.Serialize(new { created = true, id = customer.Id, name = customer.Name, no = customer.No });
    }

    private static async Task<string> CreateProjectAsync(TimekeeperContext db, JsonElement args, int workspaceId, CancellationToken ct)
    {
        if (!args.TryGetProperty("name", out var nameEl) || string.IsNullOrWhiteSpace(nameEl.GetString()))
            return "{\"error\": \"name is required\"}";
        if (!args.TryGetProperty("customer_id", out var cidEl) || cidEl.ValueKind != JsonValueKind.Number)
            return "{\"error\": \"customer_id is required\"}";

        var customerId = cidEl.GetInt32();
        var customerExists = await db.Customers.AnyAsync(c => c.Id == customerId, ct);
        if (!customerExists)
            return $"{{\"error\": \"Customer {customerId} not found\"}}";

        var name = nameEl.GetString()!.Trim();
        var existing = await db.Projects
            .FirstOrDefaultAsync(p => p.CustomerId == customerId && p.Name.ToLower() == name.ToLower(), ct);
        if (existing != null)
            return JsonSerializer.Serialize(new { already_exists = true, id = existing.Id, name = existing.Name, no = existing.No, customer_id = existing.CustomerId });

        var project = new Project
        {
            WorkspaceId = workspaceId,
            CustomerId = customerId,
            Name = name,
            No = args.TryGetProperty("no", out var noEl) ? noEl.GetString() : null,
            Description = args.TryGetProperty("description", out var descEl) ? descEl.GetString() : null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Projects.Add(project);
        await db.SaveChangesAsync(ct);
        return JsonSerializer.Serialize(new { created = true, id = project.Id, name = project.Name, no = project.No, customer_id = project.CustomerId });
    }

    private static async Task<string> CreateTaskAsync(TimekeeperContext db, JsonElement args, int workspaceId, CancellationToken ct)
    {
        if (!args.TryGetProperty("name", out var nameEl) || string.IsNullOrWhiteSpace(nameEl.GetString()))
            return "{\"error\": \"name is required\"}";
        if (!args.TryGetProperty("project_id", out var pidEl) || pidEl.ValueKind != JsonValueKind.Number)
            return "{\"error\": \"project_id is required\"}";

        var projectId = pidEl.GetInt32();
        var projectExists = await db.Projects.AnyAsync(p => p.Id == projectId, ct);
        if (!projectExists)
            return $"{{\"error\": \"Project {projectId} not found\"}}";

        var name = nameEl.GetString()!.Trim();
        var existing = await db.Tasks
            .FirstOrDefaultAsync(t => t.ProjectId == projectId && t.Name.ToLower() == name.ToLower(), ct);
        if (existing != null)
            return JsonSerializer.Serialize(new { already_exists = true, id = existing.Id, name = existing.Name, project_id = existing.ProjectId });

        var task = new TaskItem
        {
            WorkspaceId = workspaceId,
            ProjectId = projectId,
            Name = name,
            Description = args.TryGetProperty("description", out var descEl) ? descEl.GetString() : null,
            Position = args.TryGetProperty("position", out var posEl) ? posEl.GetString() : null,
            ProcurementNumber = args.TryGetProperty("procurement_number", out var pnEl) ? pnEl.GetString() : null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        return JsonSerializer.Serialize(new { created = true, id = task.Id, name = task.Name, project_id = task.ProjectId, position = task.Position, procurement_number = task.ProcurementNumber });
    }

    private async Task<string> GetWorkspaceNameAsync(int workspaceId)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<TimekeeperContext>();
            var ws = await db.Workspaces.FirstOrDefaultAsync(w => w.Id == workspaceId);
            return ws?.Name ?? "Timekeeper";
        }
        catch
        {
            return "Timekeeper";
        }
    }

    // ────────────────────────────────────────────────────────────
    // Single-turn (non-streaming) AI helpers
    // ────────────────────────────────────────────────────────────

    private async Task<string?> CallModelSimpleAsync(string systemPrompt, string userMessage, string token, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("copilot");
        var req = new HttpRequestMessage(HttpMethod.Post, ModelsEndpoint);
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonSerializer.Serialize(new
        {
            model = ModelName,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userMessage }
            },
            max_tokens = 400
        }), Encoding.UTF8, "application/json");

        var resp = await client.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadAsStringAsync(ct);
        var doc = JsonDocument.Parse(body);
        return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();
    }

    public async Task<ResolveTaskResult?> ResolveTaskAsync(string description, int workspaceId, CancellationToken ct = default)
    {
        var (enabled, token) = await GetWorkspaceConfigAsync(workspaceId, ct);
        if (!enabled || string.IsNullOrWhiteSpace(token)) return null;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TimekeeperContext>();

        var tasks = await db.Tasks
            .Include(t => t.Project).ThenInclude(p => p.Customer)
            .Where(t => t.IsActive)
            .Select(t => new { t.Id, t.Name, project = t.Project.Name, customer = t.Project.Customer.Name })
            .ToListAsync(ct);

        if (tasks.Count == 0) return new ResolveTaskResult { Found = false, Reasoning = "No active tasks available." };

        var taskList = string.Join("\n", tasks.Select(t => $"ID:{t.Id} | Task: {t.Name} | Project: {t.project} | Customer: {t.customer}"));

        const string systemPrompt = """
            You are a task matcher for a time tracking app.
            Given a list of tasks and a work description, find the best matching task.
            Return ONLY valid JSON (no markdown fences, no explanation):
            {"taskId": <integer or null>, "taskName": "<name>", "projectName": "<name>", "customerName": "<name>", "reasoning": "<brief reason>"}
            If nothing matches, use null for taskId.
            """;

        try
        {
            var raw = await CallModelSimpleAsync(systemPrompt, $"Tasks:\n{taskList}\n\nDescription: \"{description}\"", token!, ct);
            if (raw == null) return null;

            // Strip possible markdown fences
            raw = raw.Trim();
            if (raw.StartsWith("```")) { raw = raw[(raw.IndexOf('\n') + 1)..]; }
            if (raw.EndsWith("```")) { raw = raw[..raw.LastIndexOf("```")]; }

            var doc = JsonDocument.Parse(raw.Trim());
            int? taskId = doc.RootElement.TryGetProperty("taskId", out var tidEl) && tidEl.ValueKind == JsonValueKind.Number
                ? tidEl.GetInt32() : null;
            var reasoning = doc.RootElement.TryGetProperty("reasoning", out var rEl) ? rEl.GetString() ?? "" : "";

            if (taskId == null)
                return new ResolveTaskResult { Found = false, Reasoning = reasoning };

            var matched = tasks.FirstOrDefault(t => t.Id == taskId);
            return new ResolveTaskResult
            {
                Found = matched != null,
                TaskId = taskId,
                TaskName = doc.RootElement.TryGetProperty("taskName", out var tnEl) ? tnEl.GetString() ?? matched?.Name ?? "" : matched?.Name ?? "",
                ProjectName = doc.RootElement.TryGetProperty("projectName", out var pnEl) ? pnEl.GetString() ?? matched?.project ?? "" : matched?.project ?? "",
                CustomerName = doc.RootElement.TryGetProperty("customerName", out var cnEl) ? cnEl.GetString() ?? matched?.customer ?? "" : matched?.customer ?? "",
                Reasoning = reasoning
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ResolveTask failed");
            return null;
        }
    }

    public async Task<string?> PolishNoteAsync(string rawNote, string? taskName, string? projectName, string? customerName, string? language, int workspaceId, CancellationToken ct = default)
    {
        var (enabled, token) = await GetWorkspaceConfigAsync(workspaceId, ct);
        if (!enabled || string.IsNullOrWhiteSpace(token)) return null;

        var contextParts = new[] {
            taskName    != null ? $"Task: {taskName}"    : null,
            projectName != null ? $"Project: {projectName}" : null,
            customerName != null ? $"Customer: {customerName}" : null,
        }.Where(s => s != null);
        var context = string.Join(", ", contextParts);

        var outputLanguage = string.IsNullOrWhiteSpace(language) ? "English" : language;
        var systemPrompt = $"""
            You are a professional billing note writer for a time tracking application.
            The user gives you a short internal note. Rewrite it as a concise, formal, customer-facing invoice description.
            Rules:
            - Write the output in {outputLanguage}.
            - Maximum 2 sentences.
            - Use professional language suitable for a customer invoice.
            - Do NOT repeat the task/project/customer names — they appear in other invoice fields.
            - Return ONLY the polished note text. No explanation, no quotes, no extra formatting.
            """;

        var userMessage = string.IsNullOrWhiteSpace(context)
            ? $"Raw note: {rawNote}"
            : $"Context: {context}\nRaw note: {rawNote}";

        try
        {
            return await CallModelSimpleAsync(systemPrompt, userMessage, token!, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PolishNote failed");
            return null;
        }
    }

    // ────────────────────────────────────────────────────────────
    // Tool definitions (OpenAI function calling schema)
    // ────────────────────────────────────────────────────────────

    private static JsonArray GetToolDefinitions() =>
    [
        MakeTool("get_today_summary",
            "Get today's work day info and all time entries for the current user.",
            new JsonObject()),

        MakeTool("get_recent_entries",
            "Get time entries for the last N days grouped by date.",
            new JsonObject
            {
                ["type"] = "object",
                ["properties"] = new JsonObject
                {
                    ["days"] = new JsonObject { ["type"] = "integer", ["description"] = "Number of days to look back (default 7)" }
                }
            }),

        MakeTool("get_customers",
            "Get all active customers in the workspace.",
            new JsonObject()),

        MakeTool("get_projects",
            "Get active projects, optionally filtered by customer.",
            new JsonObject
            {
                ["type"] = "object",
                ["properties"] = new JsonObject
                {
                    ["customer_id"] = new JsonObject { ["type"] = "integer", ["description"] = "Filter by customer ID" }
                }
            }),

        MakeTool("get_tasks",
            "Get ALL active tasks including task name, project name, and customer name. Call with NO filter to get everything, then fuzzy-match to find the right task. Only pass project_id if you already know the exact project ID.",
            new JsonObject
            {
                ["type"] = "object",
                ["properties"] = new JsonObject
                {
                    ["project_id"] = new JsonObject { ["type"] = "integer", ["description"] = "Filter by project ID" }
                }
            }),

        MakeTool("create_time_entry",
            "Create a Draft time entry for a task. Always confirm task/time with the user before calling this.",
            new JsonObject
            {
                ["type"] = "object",
                ["required"] = new JsonArray { "task_id" },
                ["properties"] = new JsonObject
                {
                    ["task_id"] = new JsonObject { ["type"] = "integer", ["description"] = "ID of the task" },
                    ["start_time"] = new JsonObject { ["type"] = "string", ["description"] = "ISO 8601 start time (default: now)" },
                    ["end_time"] = new JsonObject { ["type"] = "string", ["description"] = "ISO 8601 end time (omit to leave running)" },
                    ["notes"] = new JsonObject { ["type"] = "string", ["description"] = "Optional notes" }
                }
            }),

        MakeTool("start_timer",
            "Start a running timer (stops any currently running timer). Confirm with the user first.",
            new JsonObject
            {
                ["type"] = "object",
                ["properties"] = new JsonObject
                {
                    ["task_id"] = new JsonObject { ["type"] = "integer", ["description"] = "Task to track (optional)" }
                }
            }),

        MakeTool("get_running_timer",
            "Check if there is a timer currently running and how long it has been going.",
            new JsonObject()),

        MakeTool("get_documentation",
            "Read the application documentation. Call with no slug to get a list of available topics (returns slugs, titles, and summaries). Then call again with a specific slug to read that page's full content. Use this to answer questions about how the app works.",
            new JsonObject
            {
                ["type"] = "object",
                ["properties"] = new JsonObject
                {
                    ["slug"] = new JsonObject { ["type"] = "string", ["description"] = "Doc page slug (e.g. 'getting-started', 'ai-assistant'). Omit to list all topics." }
                }
            }),

        MakeTool("create_customer",
            "Create a new customer in the workspace. Returns the new customer's ID. If the customer already exists, returns the existing record instead.",
            new JsonObject
            {
                ["type"] = "object",
                ["required"] = new JsonArray { "name" },
                ["properties"] = new JsonObject
                {
                    ["name"] = new JsonObject { ["type"] = "string", ["description"] = "Customer name" },
                    ["no"] = new JsonObject { ["type"] = "string", ["description"] = "Customer number / external ID (optional)" },
                    ["description"] = new JsonObject { ["type"] = "string", ["description"] = "Optional description" }
                }
            }),

        MakeTool("create_project",
            "Create a new project under an existing customer. Returns the new project's ID. If a project with the same name already exists under that customer, returns the existing record instead.",
            new JsonObject
            {
                ["type"] = "object",
                ["required"] = new JsonArray { "name", "customer_id" },
                ["properties"] = new JsonObject
                {
                    ["name"] = new JsonObject { ["type"] = "string", ["description"] = "Project name" },
                    ["customer_id"] = new JsonObject { ["type"] = "integer", ["description"] = "ID of the parent customer" },
                    ["no"] = new JsonObject { ["type"] = "string", ["description"] = "Project number (e.g. '5276') or procurement number (optional)" },
                    ["description"] = new JsonObject { ["type"] = "string", ["description"] = "Optional description" }
                }
            }),

        MakeTool("create_task",
            "Create a new task under an existing project. Returns the new task's ID. If a task with the same name already exists under that project, returns the existing record instead.",
            new JsonObject
            {
                ["type"] = "object",
                ["required"] = new JsonArray { "name", "project_id" },
                ["properties"] = new JsonObject
                {
                    ["name"] = new JsonObject { ["type"] = "string", ["description"] = "Task name (derived from the task/line description in ERP data)" },
                    ["project_id"] = new JsonObject { ["type"] = "integer", ["description"] = "ID of the parent project" },
                    ["position"] = new JsonObject { ["type"] = "string", ["description"] = "Position code (e.g. '5.3.') from ERP export" },
                    ["procurement_number"] = new JsonObject { ["type"] = "string", ["description"] = "Line procurement number from ERP" },
                    ["description"] = new JsonObject { ["type"] = "string", ["description"] = "Optional description" }
                }
            }),
    ];

    private static JsonObject MakeTool(string name, string description, JsonObject parameters)
    {
        if (!parameters.ContainsKey("type") && !parameters.ContainsKey("properties"))
            parameters = new JsonObject { ["type"] = "object", ["properties"] = new JsonObject() };

        return new JsonObject
        {
            ["type"] = "function",
            ["function"] = new JsonObject
            {
                ["name"] = name,
                ["description"] = description,
                ["parameters"] = parameters
            }
        };
    }

    // Helper class to accumulate streaming tool calls
    private class ToolCallAccumulator
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string Arguments { get; set; } = "";
    }
}
