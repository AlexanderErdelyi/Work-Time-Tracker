namespace Timekeeper.Core.Services;

public interface IWorkspaceContext
{
    int WorkspaceId { get; }
    int? UserId { get; }
}
