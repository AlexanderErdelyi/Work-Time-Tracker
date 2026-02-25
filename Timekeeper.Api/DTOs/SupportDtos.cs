namespace Timekeeper.Api.DTOs;

public class CreateSupportIssueRequestDto
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "bug";
    public string Severity { get; set; } = "medium";
    public string Description { get; set; } = string.Empty;
    public string? StepsToReproduce { get; set; }
    public string? ExpectedBehavior { get; set; }
    public string? ActualBehavior { get; set; }
    public string? Browser { get; set; }
    public string? OperatingSystem { get; set; }
    public string? AppVersion { get; set; }
    public string? ContactEmail { get; set; }
}

public class CreateSupportIssueResponseDto
{
    public int IssueNumber { get; set; }
    public string IssueUrl { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
}

public class SupportTicketSummaryDto
{
    public int Id { get; set; }
    public int IssueNumber { get; set; }
    public string IssueUrl { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public bool HasUnreadUpdates { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastIssueUpdatedAt { get; set; }
    public DateTime? LastCommentAt { get; set; }
}

public class SupportTicketCommentDto
{
    public string Author { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string Url { get; set; } = string.Empty;
    public bool IsResponseFromOthers { get; set; }
}

public class SupportTicketDetailDto
{
    public SupportTicketSummaryDto Ticket { get; set; } = new();
    public IReadOnlyList<SupportTicketCommentDto> Comments { get; set; } = [];
}

public class SupportTicketUnreadCountDto
{
    public int UnreadCount { get; set; }
}

public class UploadSupportImageResponseDto
{
    public string Url { get; set; } = string.Empty;
}

public class CreateSupportTicketCommentRequestDto
{
    public string Body { get; set; } = string.Empty;
}
