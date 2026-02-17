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

    public async Task<TimeEntry> StartTimerAsync(int? taskId, string? notes = null)
    {
        var runningEntry = await GetRunningEntryAsync();
        if (runningEntry != null)
        {
            throw new InvalidOperationException("A timer is already running. Stop it before starting a new one.");
        }

        // Task is now optional - only validate if taskId is provided and > 0
        if (taskId.HasValue && taskId.Value > 0)
        {
            var task = await _context.Tasks.FindAsync(taskId.Value);
            if (task == null)
            {
                throw new ArgumentException($"Task with ID {taskId} not found.", nameof(taskId));
            }
        }

        // Set taskId to null if it's 0 or negative
        var validTaskId = (taskId.HasValue && taskId.Value > 0) ? taskId : null;

        var entry = new TimeEntry
        {
            TaskId = validTaskId,
            StartTime = DateTime.UtcNow,
            Notes = notes
        };

        _context.TimeEntries.Add(entry);
        await _context.SaveChangesAsync();

        // Reload with includes only if task exists
        if (validTaskId.HasValue)
        {
            return await _context.TimeEntries
                .Include(e => e.Task)
                    .ThenInclude(t => t.Project)
                        .ThenInclude(p => p.Customer)
                .FirstAsync(e => e.Id == entry.Id);
        }
        
        return entry;
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
