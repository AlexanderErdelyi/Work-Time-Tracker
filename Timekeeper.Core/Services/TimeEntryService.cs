using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Core.Services;

public class TimeEntryService : ITimeEntryService
{
    private readonly TimekeeperContext _context;

    public TimeEntryService(TimekeeperContext context)
    {
        _context = context;
    }

    public async Task<TimeEntry?> GetRunningEntryAsync()
    {
        return await _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(e => e.EndTime == null);
    }

    public async Task<TimeEntry> StartTimerAsync(int taskId, string? notes = null)
    {
        var runningEntry = await GetRunningEntryAsync();
        if (runningEntry != null)
        {
            throw new InvalidOperationException("A timer is already running. Stop it before starting a new one.");
        }

        var task = await _context.Tasks.FindAsync(taskId);
        if (task == null)
        {
            throw new ArgumentException($"Task with ID {taskId} not found.", nameof(taskId));
        }

        var entry = new TimeEntry
        {
            TaskId = taskId,
            StartTime = DateTime.UtcNow,
            Notes = notes
        };

        _context.TimeEntries.Add(entry);
        await _context.SaveChangesAsync();

        return await _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
            .FirstAsync(e => e.Id == entry.Id);
    }

    public async Task<TimeEntry> StopTimerAsync(int entryId)
    {
        var entry = await _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(e => e.Id == entryId);

        if (entry == null)
        {
            throw new ArgumentException($"Time entry with ID {entryId} not found.", nameof(entryId));
        }

        if (entry.EndTime.HasValue)
        {
            throw new InvalidOperationException("This time entry has already been stopped.");
        }

        entry.EndTime = DateTime.UtcNow;
        entry.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return entry;
    }

    public async Task<bool> HasRunningTimerAsync()
    {
        return await _context.TimeEntries.AnyAsync(e => e.EndTime == null);
    }
}
