using Timekeeper.Core.Models;

namespace Timekeeper.Core.Services;

public interface ITimeEntryService
{
    Task<TimeEntry?> GetRunningEntryAsync();
    Task<TimeEntry?> GetActiveEntryAsync();
    Task<TimeEntry> StartTimerAsync(int? taskId, string? notes = null);
    Task<TimeEntry> StopTimerAsync(int entryId);
    Task<TimeEntry> ResumeTimerAsync(int entryId);
    Task<TimeEntry> PauseTimerAsync(int entryId);
    Task<TimeEntry> ResumeFromPauseAsync(int entryId);
    Task<bool> HasRunningTimerAsync();
}
