using Timekeeper.Core.Models;

namespace Timekeeper.Core.Services;

public interface ITimeEntryService
{
    Task<TimeEntry?> GetRunningEntryAsync();
    Task<TimeEntry> StartTimerAsync(int? taskId, string? notes = null);
    Task<TimeEntry> StopTimerAsync(int entryId);
    Task<bool> HasRunningTimerAsync();
}
