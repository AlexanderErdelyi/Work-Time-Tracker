namespace Timekeeper.Api.DTOs;

// ---- Integration DTOs ----

public class UserIntegrationDto
{
    public int Id { get; set; }
    public string Provider { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public List<string> EnabledSources { get; set; } = [];
    public DateTime? LastSyncedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class ConnectIntegrationRequestDto
{
    public string Provider { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
    /// <summary>Optional comma-separated org names. If provided, skips auto-discovery.</summary>
    public string? Organizations { get; set; }
}

public class UpdateAdoOrganizationsDto
{
    public string Organizations { get; set; } = string.Empty;
}

public class UpdateEnabledSourcesDto
{
    public List<string> EnabledSources { get; set; } = [];
}

public class ConnectWithPkceRequestDto
{
    public string Code { get; set; } = string.Empty;
    public string CodeVerifier { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
}

// ---- Activity Event DTOs ----

public class ActivityEventDto
{
    public int Id { get; set; }
    public string Source { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string ExternalId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int EstimatedMinutes { get; set; }
    public string SuggestionState { get; set; } = string.Empty;
    public int? SuggestedCustomerId { get; set; }
    public string? SuggestedCustomerName { get; set; }
    public int? SuggestedProjectId { get; set; }
    public string? SuggestedProjectName { get; set; }
    public int? SuggestedTaskId { get; set; }
    public string? SuggestedTaskName { get; set; }
    public string? SuggestedNotes { get; set; }
    public string? ExternalUrl { get; set; }
    public string? Confidence { get; set; }
    public int? LinkedTimeEntryId { get; set; }
    public Dictionary<string, object?> Metadata { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class AcceptSuggestionRequestDto
{
    public int? CustomerId { get; set; }
    public int? ProjectId { get; set; }
    public int? TaskId { get; set; }
    public string? Notes { get; set; }
    public int? OverrideMinutes { get; set; }
}

public class EditSuggestionRequestDto
{
    public int? CustomerId { get; set; }
    public int? ProjectId { get; set; }
    public int? TaskId { get; set; }
    public string? Notes { get; set; }
    public int? EstimatedMinutes { get; set; }
}

public class DismissSuggestionRequestDto
{
    public string? Reason { get; set; }
}

public class ActivitySummaryDto
{
    public int PendingCount { get; set; }
    public int AcceptedToday { get; set; }
    public int DismissedToday { get; set; }
    public List<ActivityEventDto> RecentSuggestions { get; set; } = [];
}

// ---- Mapping Rule DTOs ----

public class ActivityMappingRuleDto
{
    public int Id { get; set; }
    public string MatchField { get; set; } = string.Empty;
    public string MatchOperator { get; set; } = string.Empty;
    public string MatchValue { get; set; } = string.Empty;
    public int? MappedCustomerId { get; set; }
    public string? MappedCustomerName { get; set; }
    public int? MappedProjectId { get; set; }
    public string? MappedProjectName { get; set; }
    public int? MappedTaskId { get; set; }
    public string? MappedTaskName { get; set; }
    public int Priority { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateMappingRuleRequestDto
{
    public string MatchField { get; set; } = string.Empty;
    public string MatchOperator { get; set; } = string.Empty;
    public string MatchValue { get; set; } = string.Empty;
    public int? MappedCustomerId { get; set; }
    public int? MappedProjectId { get; set; }
    public int? MappedTaskId { get; set; }
    public int Priority { get; set; }
}

public class UpdateMappingRuleRequestDto
{
    public string? MatchField { get; set; }
    public string? MatchOperator { get; set; }
    public string? MatchValue { get; set; }
    public int? MappedCustomerId { get; set; }
    public int? MappedProjectId { get; set; }
    public int? MappedTaskId { get; set; }
    public int? Priority { get; set; }
    public bool? IsActive { get; set; }
}

public class ReorderMappingRulesRequestDto
{
    public List<MappingRuleOrderItemDto> Order { get; set; } = [];
}

public class MappingRuleOrderItemDto
{
    public int Id { get; set; }
    public int Priority { get; set; }
}

// ---- Preferences DTOs ----

public class UserActivityPreferencesDto
{
    public string NotesLanguage { get; set; } = "en";
    public int BusinessHoursStart { get; set; } = 8;
    public int BusinessHoursEnd { get; set; } = 18;
    public bool AutoCreateDrafts { get; set; } = false;
    public int MinActivityMinutes { get; set; } = 5;
}

public class UpdateActivityPreferencesRequestDto
{
    public string? NotesLanguage { get; set; }
    public int? BusinessHoursStart { get; set; }
    public int? BusinessHoursEnd { get; set; }
    public bool? AutoCreateDrafts { get; set; }
    public int? MinActivityMinutes { get; set; }
}
