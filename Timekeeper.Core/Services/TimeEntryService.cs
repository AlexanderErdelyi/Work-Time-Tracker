using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Core.Services;

public class TimeEntryService : ITimeEntryService
{
    private readonly TimekeeperContext _context;
    private readonly IBillingService _billingService;

    public TimeEntryService(TimekeeperContext context, IBillingService billingService)
    {
        _context = context;
        _billingService = billingService;
    }

    public async Task<TimeEntry?> GetRunningEntryAsync()
    {
        return await _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(e => e.EndTime == null && e.PausedAt == null);
    }

    public async Task<TimeEntry?> GetActiveEntryAsync()
    {
        // Returns any timer that hasn't ended (running or paused)
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
        
        // Calculate billed hours
        if (entry.Duration.HasValue)
        {
            // Default settings: 3 min threshold, 0.25h (15 min) increment
            // These can be made configurable later
            entry.BilledHours = _billingService.CalculateBilledHours(
                entry.Duration.Value,
                roundingThresholdMinutes: 3,
                billingIncrementHours: 0.25m
            );
        }
        
        await _context.SaveChangesAsync();

        return entry;
    }

    public async Task<TimeEntry> ResumeTimerAsync(int entryId)
    {
        // Check for already running timer
        var runningEntry = await GetRunningEntryAsync();
        if (runningEntry != null && runningEntry.Id != entryId)
        {
            throw new InvalidOperationException(
                $"Timer {runningEntry.Id} is already running. Stop it before resuming another.");
        }

        var entry = await _context.TimeEntries
            .Include(e => e.Task)
                .ThenInclude(t => t.Project)
                    .ThenInclude(p => p.Customer)
            .FirstOrDefaultAsync(e => e.Id == entryId);

        if (entry == null)
        {
            throw new ArgumentException($"Time entry with ID {entryId} not found.");
        }

        if (!entry.EndTime.HasValue)
        {
            // Already running, just return it
            return entry;
        }

        // Resume by clearing EndTime and BilledHours
        entry.EndTime = null;
        entry.BilledHours = null;
        entry.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return entry;
    }

    public async Task<TimeEntry> PauseTimerAsync(int entryId)
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
            throw new InvalidOperationException("Cannot pause a stopped time entry.");
        }

        if (entry.PausedAt.HasValue)
        {
            throw new InvalidOperationException("This time entry is already paused.");
        }

        entry.PausedAt = DateTime.UtcNow;
        entry.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return entry;
    }

    public async Task<TimeEntry> ResumeFromPauseAsync(int entryId)
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
            throw new InvalidOperationException("Cannot resume a stopped time entry. Use resume to restart it.");
        }

        if (!entry.PausedAt.HasValue)
        {
            throw new InvalidOperationException("This time entry is not paused.");
        }

        // Calculate pause duration and accumulate
        var pauseDuration = DateTime.UtcNow - entry.PausedAt.Value;
        entry.TotalPausedSeconds += (int)pauseDuration.TotalSeconds;
        entry.PausedAt = null;
        entry.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return entry;
    }

    public async Task<bool> HasRunningTimerAsync()
    {
        return await _context.TimeEntries.AnyAsync(e => e.EndTime == null);
    }
}
