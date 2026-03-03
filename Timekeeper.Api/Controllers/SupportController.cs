using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Api.DTOs;
using Timekeeper.Api.Services;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;
using Timekeeper.Core.Services;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SupportController : ControllerBase
{
    private readonly TimekeeperContext _context;
    private readonly IWorkspaceContext _workspaceContext;
    private readonly IGitHubIssueService _gitHubIssueService;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SupportController> _logger;

    public SupportController(
        TimekeeperContext context,
        IWorkspaceContext workspaceContext,
        IGitHubIssueService gitHubIssueService,
        IWebHostEnvironment environment,
        ILogger<SupportController> logger)
    {
        _context = context;
        _workspaceContext = workspaceContext;
        _gitHubIssueService = gitHubIssueService;
        _environment = environment;
        _logger = logger;
    }

    [HttpPost("issues")]
    public async Task<ActionResult<CreateSupportIssueResponseDto>> CreateIssue([FromBody] CreateSupportIssueRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title)
            || string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest("Title and description are required.");
        }

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == _workspaceContext.WorkspaceId, cancellationToken);

        if (workspace == null)
        {
            return NotFound("Workspace not found.");
        }

        if (string.IsNullOrWhiteSpace(workspace.GitHubIssueOwner)
            || string.IsNullOrWhiteSpace(workspace.GitHubIssueRepo))
        {
            return BadRequest("Support repository is not configured for this workspace.");
        }

        var submittedBy = GetCurrentUserEmail();
        var submittedByUserId = GetCurrentUserId();

        var submittedRole = User.FindFirstValue(ClaimTypes.Role)
            ?? "Member";

        var result = await _gitHubIssueService.CreateIssueAsync(
            workspace.GitHubIssueOwner,
            workspace.GitHubIssueRepo,
            workspace.GitHubIssueTokenProtected,
            request,
            submittedBy,
            submittedRole,
            workspace.Id,
            workspace.Name,
            cancellationToken);

        if (!result.Success)
        {
            _logger.LogError("GitHub issue creation failed for workspace {WorkspaceId}. Error: {Error}", workspace.Id, result.Error);
            return StatusCode(StatusCodes.Status502BadGateway, result.Error ?? "Could not create support issue at this time.");
        }

        var now = DateTime.UtcNow;
        var normalizedCategory = NormalizeCategory(request.Category);
        var normalizedSeverity = string.IsNullOrWhiteSpace(request.Severity) ? "medium" : request.Severity.Trim();

        _context.SupportTickets.Add(new SupportTicket
        {
            WorkspaceId = workspace.Id,
            CreatedByUserId = submittedByUserId,
            CreatedByEmail = submittedBy,
            SupportRepositoryOwner = workspace.GitHubIssueOwner.Trim(),
            SupportRepositoryRepo = workspace.GitHubIssueRepo.Trim(),
            IssueNumber = result.IssueNumber,
            IssueUrl = result.IssueUrl,
            Title = request.Title.Trim(),
            Category = normalizedCategory,
            Severity = normalizedSeverity,
            GitHubState = "open",
            LastCommentAt = null,
            LastIssueUpdatedAt = now,
            LastSyncedAt = now,
            LastViewedAt = now,
            HasUnreadUpdates = false,
            CreatedAt = now,
            UpdatedAt = now
        });

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new CreateSupportIssueResponseDto
        {
            IssueNumber = result.IssueNumber,
            IssueUrl = result.IssueUrl,
            Title = request.Title.Trim()
        });
    }

    [HttpGet("issues/my")]
    public async Task<ActionResult<IReadOnlyList<SupportTicketSummaryDto>>> GetMyIssues(CancellationToken cancellationToken)
    {
        var userEmail = GetCurrentUserEmail();
        var tickets = await _context.SupportTickets
            .Where(t => t.WorkspaceId == _workspaceContext.WorkspaceId && t.CreatedByEmail == userEmail)
            .OrderByDescending(t => t.LastIssueUpdatedAt ?? t.CreatedAt)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        if (tickets.Count == 0)
        {
            return Ok(Array.Empty<SupportTicketSummaryDto>());
        }

        var labelsByIssue = await SyncTicketsAsync(tickets, userEmail, cancellationToken);

        var result = tickets
            .OrderByDescending(t => t.LastIssueUpdatedAt ?? t.CreatedAt)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t =>
            {
                labelsByIssue.TryGetValue(t.IssueNumber, out var labels);
                return MapSummary(t, labels);
            })
            .ToList();

        return Ok(result);
    }

    [HttpGet("issues/{issueNumber:int}")]
    public async Task<ActionResult<SupportTicketDetailDto>> GetIssueDetail(int issueNumber, CancellationToken cancellationToken)
    {
        var userEmail = GetCurrentUserEmail();
        var ticket = await _context.SupportTickets
            .FirstOrDefaultAsync(t =>
                t.WorkspaceId == _workspaceContext.WorkspaceId
                && t.IssueNumber == issueNumber
                && t.CreatedByEmail == userEmail,
                cancellationToken);

        if (ticket == null)
        {
            return NotFound("Support ticket not found.");
        }

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == _workspaceContext.WorkspaceId, cancellationToken);

        if (workspace == null)
        {
            return NotFound("Workspace not found.");
        }

        var details = await _gitHubIssueService.GetIssueDetailsAsync(
            ticket.SupportRepositoryOwner,
            ticket.SupportRepositoryRepo,
            ticket.IssueNumber,
            workspace.GitHubIssueTokenProtected,
            cancellationToken);

        if (!details.Success)
        {
            if (details.IssueNotFound)
            {
                _context.SupportTickets.Remove(ticket);
                await _context.SaveChangesAsync(cancellationToken);
                return NotFound("Support ticket no longer exists on GitHub.");
            }

            _logger.LogError("Failed to load issue details for ticket #{IssueNumber} in workspace {WorkspaceId}. Error: {Error}", issueNumber, _workspaceContext.WorkspaceId, details.Error);
            return StatusCode(StatusCodes.Status502BadGateway, details.Error ?? "Could not load issue details at this time.");
        }

        ApplySyncResult(ticket, details, userEmail);
        await _context.SaveChangesAsync(cancellationToken);

        var payload = new SupportTicketDetailDto
        {
            Ticket = MapSummary(ticket, MapLabels(details.Labels, ticket.Category)),
            Comments = details.Comments
                .Select(c => new SupportTicketCommentDto
                {
                    Author = c.Author,
                    Body = c.Body,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    Url = c.Url,
                    IsResponseFromOthers = !string.Equals(c.Author, userEmail, StringComparison.OrdinalIgnoreCase)
                })
                .ToList()
        };

        if (!string.IsNullOrWhiteSpace(details.Body))
        {
            payload.Comments =
            [
                new SupportTicketCommentDto
                {
                    Author = "Issue",
                    Body = details.Body,
                    CreatedAt = details.CreatedAt ?? ticket.CreatedAt,
                    UpdatedAt = details.UpdatedAt,
                    Url = details.HtmlUrl,
                    IsResponseFromOthers = false
                },
                ..payload.Comments
            ];
        }

        return Ok(payload);
    }

    [HttpPost("issues/{issueNumber:int}/comments")]
    public async Task<ActionResult> AddIssueComment(int issueNumber, [FromBody] CreateSupportTicketCommentRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
        {
            return BadRequest("Comment body is required.");
        }

        var userEmail = GetCurrentUserEmail();
        var ticket = await _context.SupportTickets
            .FirstOrDefaultAsync(t =>
                t.WorkspaceId == _workspaceContext.WorkspaceId
                && t.IssueNumber == issueNumber
                && t.CreatedByEmail == userEmail,
                cancellationToken);

        if (ticket == null)
        {
            return NotFound("Support ticket not found.");
        }

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == _workspaceContext.WorkspaceId, cancellationToken);

        if (workspace == null)
        {
            return NotFound("Workspace not found.");
        }

        var commentResult = await _gitHubIssueService.AddIssueCommentAsync(
            ticket.SupportRepositoryOwner,
            ticket.SupportRepositoryRepo,
            ticket.IssueNumber,
            $"<!-- tk-user:{userEmail} -->\n{request.Body.Trim()}",
            workspace.GitHubIssueTokenProtected,
            cancellationToken);

        if (!commentResult.Success)
        {
            _logger.LogError("Failed to post comment for ticket #{IssueNumber} in workspace {WorkspaceId}. Error: {Error}", issueNumber, _workspaceContext.WorkspaceId, commentResult.Error);
            return StatusCode(StatusCodes.Status502BadGateway, commentResult.Error ?? "Could not post comment at this time.");
        }

        var now = DateTime.UtcNow;
        ticket.LastViewedAt = now;
        ticket.LastSyncedAt = now;
        ticket.HasUnreadUpdates = false;
        ticket.UpdatedAt = now;
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("issues/{issueNumber:int}/mark-read")]
    public async Task<ActionResult> MarkIssueAsRead(int issueNumber, CancellationToken cancellationToken)
    {
        var userEmail = GetCurrentUserEmail();
        var ticket = await _context.SupportTickets
            .FirstOrDefaultAsync(t =>
                t.WorkspaceId == _workspaceContext.WorkspaceId
                && t.IssueNumber == issueNumber
                && t.CreatedByEmail == userEmail,
                cancellationToken);

        if (ticket == null)
        {
            return NotFound("Support ticket not found.");
        }

        ticket.LastViewedAt = DateTime.UtcNow;
        ticket.HasUnreadUpdates = false;
        ticket.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("issues/{issueNumber:int}/close")]
    public async Task<ActionResult> CloseIssue(int issueNumber, CancellationToken cancellationToken)
    {
        var userEmail = GetCurrentUserEmail();
        var ticket = await _context.SupportTickets
            .FirstOrDefaultAsync(t =>
                t.WorkspaceId == _workspaceContext.WorkspaceId
                && t.IssueNumber == issueNumber
                && t.CreatedByEmail == userEmail,
                cancellationToken);

        if (ticket == null)
        {
            return NotFound("Support ticket not found.");
        }

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == _workspaceContext.WorkspaceId, cancellationToken);

        if (workspace == null)
        {
            return NotFound("Workspace not found.");
        }

        var closeResult = await _gitHubIssueService.CloseIssueAsync(
            ticket.SupportRepositoryOwner,
            ticket.SupportRepositoryRepo,
            ticket.IssueNumber,
            workspace.GitHubIssueTokenProtected,
            cancellationToken);

        if (!closeResult.Success && !closeResult.IssueNotFound)
        {
            _logger.LogError("Failed to close issue #{IssueNumber} in workspace {WorkspaceId}. Error: {Error}", issueNumber, _workspaceContext.WorkspaceId, closeResult.Error);
            return StatusCode(StatusCodes.Status502BadGateway, closeResult.Error ?? "Could not close issue at this time.");
        }

        var now = DateTime.UtcNow;
        ticket.GitHubState = "closed";
        ticket.LastIssueUpdatedAt = now;
        ticket.LastViewedAt = now;
        ticket.HasUnreadUpdates = false;
        ticket.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("issues/{issueNumber:int}")]
    public async Task<ActionResult> DeleteIssue(int issueNumber, CancellationToken cancellationToken)
    {
        var userEmail = GetCurrentUserEmail();
        var ticket = await _context.SupportTickets
            .FirstOrDefaultAsync(t =>
                t.WorkspaceId == _workspaceContext.WorkspaceId
                && t.IssueNumber == issueNumber
                && t.CreatedByEmail == userEmail,
                cancellationToken);

        if (ticket == null)
        {
            return NotFound("Support ticket not found.");
        }

        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == _workspaceContext.WorkspaceId, cancellationToken);

        if (workspace != null)
        {
            _ = await _gitHubIssueService.CloseIssueAsync(
                ticket.SupportRepositoryOwner,
                ticket.SupportRepositoryRepo,
                ticket.IssueNumber,
                workspace.GitHubIssueTokenProtected,
                cancellationToken);
        }

        _context.SupportTickets.Remove(ticket);
        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("issues/unread-count")]
    public async Task<ActionResult<SupportTicketUnreadCountDto>> GetUnreadCount(CancellationToken cancellationToken)
    {
        var userEmail = GetCurrentUserEmail();
        var tickets = await _context.SupportTickets
            .Where(t => t.WorkspaceId == _workspaceContext.WorkspaceId && t.CreatedByEmail == userEmail)
            .ToListAsync(cancellationToken);

        if (tickets.Count > 0)
        {
            await SyncTicketsAsync(tickets, userEmail, cancellationToken);
        }

        var count = tickets.Count(t => t.HasUnreadUpdates);
        return Ok(new SupportTicketUnreadCountDto { UnreadCount = count });
    }

    [HttpPost("images")]
    [RequestSizeLimit(5_000_000)]
    public async Task<ActionResult<UploadSupportImageResponseDto>> UploadImage([FromForm] IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Image file is required.");
        }

        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Only image files are supported.");
        }

        var uploadsRoot = Path.Combine(_environment.WebRootPath, "support-images");
        Directory.CreateDirectory(uploadsRoot);

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = ".png";
        }

        var safeFileName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(uploadsRoot, safeFileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return Ok(new UploadSupportImageResponseDto
        {
            Url = $"/api/support/images/{safeFileName}"
        });
    }

    [HttpGet("images/{fileName}")]
    public ActionResult GetImage(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)
            || fileName.Contains("..", StringComparison.Ordinal)
            || fileName.Contains('/')
            || fileName.Contains('\\'))
        {
            return BadRequest("Invalid file name.");
        }

        var uploadsRoot = Path.Combine(_environment.WebRootPath, "support-images");
        var fullPath = Path.Combine(uploadsRoot, fileName);
        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound();
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var contentType = extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            _ => "image/png"
        };

        return PhysicalFile(fullPath, contentType);
    }

    private async Task<Dictionary<int, IReadOnlyList<SupportTicketLabelDto>>> SyncTicketsAsync(
        List<SupportTicket> tickets,
        string userEmail,
        CancellationToken cancellationToken)
    {
        var labelsByIssue = new Dictionary<int, IReadOnlyList<SupportTicketLabelDto>>();
        var workspace = await _context.Workspaces
            .FirstOrDefaultAsync(w => w.Id == _workspaceContext.WorkspaceId, cancellationToken);

        if (workspace == null)
        {
            return labelsByIssue;
        }

        var hasChanges = false;
        var removedTickets = new List<SupportTicket>();
        foreach (var ticket in tickets)
        {
            var details = await _gitHubIssueService.GetIssueDetailsAsync(
                ticket.SupportRepositoryOwner,
                ticket.SupportRepositoryRepo,
                ticket.IssueNumber,
                workspace.GitHubIssueTokenProtected,
                cancellationToken);

            if (!details.Success && details.IssueNotFound)
            {
                _context.SupportTickets.Remove(ticket);
                removedTickets.Add(ticket);
                hasChanges = true;
                continue;
            }

            if (!details.Success)
            {
                continue;
            }

            hasChanges = true;
            ApplySyncResult(ticket, details, userEmail);
            labelsByIssue[ticket.IssueNumber] = MapLabels(details.Labels, ticket.Category);
        }

        if (removedTickets.Count > 0)
        {
            foreach (var removed in removedTickets)
            {
                tickets.Remove(removed);
            }
        }

        if (hasChanges)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return labelsByIssue;
    }

    private static void ApplySyncResult(SupportTicket ticket, GitHubIssueDetailsResult details, string currentUserEmail)
    {
        var oldState = ticket.GitHubState;
        ticket.GitHubState = details.State;

        if (!string.IsNullOrWhiteSpace(details.Title))
        {
            ticket.Title = details.Title;
        }

        if (!string.IsNullOrWhiteSpace(details.HtmlUrl))
        {
            ticket.IssueUrl = details.HtmlUrl;
        }

        ticket.LastIssueUpdatedAt = details.UpdatedAt;
        ticket.LastCommentAt = details.Comments.LastOrDefault()?.CreatedAt;
        ticket.LastSyncedAt = DateTime.UtcNow;
        ticket.UpdatedAt = DateTime.UtcNow;

        var latestExternalCommentAt = details.Comments
            .Where(c => !string.Equals(c.Author, currentUserEmail, StringComparison.OrdinalIgnoreCase))
            .Select(c => (DateTime?)c.CreatedAt)
            .Max();

        var stateChanged = !string.Equals(oldState, details.State, StringComparison.OrdinalIgnoreCase);
        var latestStateActivity = stateChanged ? details.UpdatedAt : null;

        var latestActivity = new[] { latestExternalCommentAt, latestStateActivity }
            .Where(d => d.HasValue)
            .Select(d => d!.Value)
            .DefaultIfEmpty()
            .Max();

        var latestActivityUtc = latestActivity == default ? (DateTime?)null : latestActivity;
        var effectiveLastViewedAt = ticket.LastViewedAt?.AddSeconds(2);
        ticket.HasUnreadUpdates = latestActivityUtc.HasValue
            && (!effectiveLastViewedAt.HasValue || latestActivityUtc.Value > effectiveLastViewedAt.Value);
    }

    private static SupportTicketSummaryDto MapSummary(SupportTicket ticket, IReadOnlyList<SupportTicketLabelDto>? labels = null)
    {
        return new SupportTicketSummaryDto
        {
            Id = ticket.Id,
            IssueNumber = ticket.IssueNumber,
            IssueUrl = ticket.IssueUrl,
            Title = ticket.Title,
            Category = ticket.Category,
            Severity = ticket.Severity,
            State = ticket.GitHubState,
            HasUnreadUpdates = ticket.HasUnreadUpdates,
            CreatedAt = ticket.CreatedAt,
            LastIssueUpdatedAt = ticket.LastIssueUpdatedAt,
            LastCommentAt = ticket.LastCommentAt,
            Labels = labels ??
                [
                    new SupportTicketLabelDto
                    {
                        Name = NormalizeCategory(ticket.Category),
                        Color = string.Empty
                    }
                ]
        };
    }

    private static IReadOnlyList<SupportTicketLabelDto> MapLabels(
        IReadOnlyList<GitHubIssueLabelResult> labels,
        string fallbackCategory)
    {
        if (labels.Count > 0)
        {
            return labels
                .Select(l => new SupportTicketLabelDto
                {
                    Name = l.Name,
                    Color = l.Color
                })
                .ToList();
        }

        return
        [
            new SupportTicketLabelDto
            {
                Name = NormalizeCategory(fallbackCategory),
                Color = string.Empty
            }
        ];
    }

    private static string NormalizeCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return "bug";
        }

        return category.Trim().ToLowerInvariant() switch
        {
            "feature" => "enhancement",
            "enhancement" => "enhancement",
            "question" => "question",
            _ => "bug"
        };
    }

    private string GetCurrentUserEmail()
    {
        return User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? "unknown@timekeeper.local";
    }

    private int GetCurrentUserId()
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id
            : 0;
    }
}
