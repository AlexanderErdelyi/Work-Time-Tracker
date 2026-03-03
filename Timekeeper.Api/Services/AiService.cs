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
}

public class AiService : IAiService
{
    private const string ModelsEndpoint = "https://models.inference.ai.azure.com/chat/completions";

    private readonly IConfiguration _config;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AiService> _logger;

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
        ILogger<AiService> logger)
    {
        _config = config;
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
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
                The user is in workspace "{workspaceName}".
                Help log time naturally, summarize work, and answer time-tracking questions.
                Use the provided tools to read real data and to create/start time entries.
                Always confirm with the user before creating or modifying entries.
                Keep answers concise and helpful. Today is {DateTime.UtcNow:yyyy-MM-dd}.
                """
        };

        // Append user message
        history.Add(new JsonObject { ["role"] = "user", ["content"] = userMessage });

        // Tool-call loop (max 5 rounds to avoid infinite loops)
        for (int round = 0; round < 5; round++)
        {
            // Build messages array: [system] + history
            var messages = new JsonArray { system };
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

                var choice = chunk?["choices"]?[0];
                if (choice == null) continue;

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
            "Get active tasks, optionally filtered by project.",
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
