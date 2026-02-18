using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Core.Services;

public interface IWorkDayService
{
    Task<WorkDay?> GetTodayWorkDayAsync();
    Task<WorkDay?> GetWorkDayByDateAsync(DateTime date);
    Task<List<WorkDay>> GetWorkDaysAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<WorkDay> CheckInAsync(DateTime? time = null, string? notes = null);
    Task<WorkDay> CheckOutAsync(DateTime? time = null, string? notes = null);
    Task<bool> IsCheckedInAsync();
    Task<WorkDay?> UpdateWorkDayAsync(int id, DateTime? checkInTime, DateTime? checkOutTime, string? notes);
    Task DeleteWorkDayAsync(int id, bool cascade = false);
}

public class WorkDayService : IWorkDayService
{
    private readonly TimekeeperContext _context;

    public WorkDayService(TimekeeperContext context)
    {
        _context = context;
    }

    public async Task<WorkDay?> GetTodayWorkDayAsync()
    {
        var today = DateTime.Today;
        return await _context.WorkDays
            .Include(w => w.TimeEntries)
                .ThenInclude(e => e.Task)
            .Include(w => w.Breaks)
            .FirstOrDefaultAsync(w => w.Date.Date == today);
    }

    public async Task<WorkDay?> GetWorkDayByDateAsync(DateTime date)
    {
        return await _context.WorkDays
            .Include(w => w.TimeEntries)
                .ThenInclude(e => e.Task)
            .Include(w => w.Breaks)
            .FirstOrDefaultAsync(w => w.Date.Date == date.Date);
    }

    public async Task<List<WorkDay>> GetWorkDaysAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.WorkDays
            .Include(w => w.TimeEntries)
            .Include(w => w.Breaks)
            .AsQueryable();

        if (startDate.HasValue)
        {
            query = query.Where(w => w.Date >= startDate.Value.Date);
        }

        if (endDate.HasValue)
        {
            query = query.Where(w => w.Date <= endDate.Value.Date);
        }

        return await query
            .OrderByDescending(w => w.Date)
            .ToListAsync();
    }

    public async Task<WorkDay> CheckInAsync(DateTime? time = null, string? notes = null)
    {
        var checkInTime = time ?? DateTime.Now;
        var today = DateTime.Today;

        var workDay = await GetTodayWorkDayAsync();

        if (workDay == null)
        {
            workDay = new WorkDay
            {
                Date = today,
                CheckInTime = checkInTime,
                Notes = notes
            };
            _context.WorkDays.Add(workDay);
        }
        else
        {
            // Preserve original check-in time, only clear checkout to allow re-check-in
            workDay.CheckOutTime = null;
            if (!string.IsNullOrEmpty(notes))
            {
                workDay.Notes = notes;
            }
        }

        await _context.SaveChangesAsync();
        return workDay;
    }

    public async Task<WorkDay> CheckOutAsync(DateTime? time = null, string? notes = null)
    {
        var checkOutTime = time ?? DateTime.Now;
        var workDay = await GetTodayWorkDayAsync();

        if (workDay == null)
        {
            throw new InvalidOperationException("Cannot check out without checking in first.");
        }

        workDay.CheckOutTime = checkOutTime;
        if (!string.IsNullOrEmpty(notes))
        {
            workDay.Notes = string.IsNullOrEmpty(workDay.Notes)
                ? notes
                : workDay.Notes + Environment.NewLine + notes;
        }

        await _context.SaveChangesAsync();
        return workDay;
    }

    public async Task<bool> IsCheckedInAsync()
    {
        var workDay = await GetTodayWorkDayAsync();
        return workDay?.IsCheckedIn ?? false;
    }

    public async Task<WorkDay?> UpdateWorkDayAsync(int id, DateTime? checkInTime, DateTime? checkOutTime, string? notes)
    {
        var workDay = await _context.WorkDays.FindAsync(id);
        if (workDay == null)
        {
            return null;
        }

        if (checkInTime.HasValue)
        {
            workDay.CheckInTime = checkInTime;
        }

        if (checkOutTime.HasValue)
        {
            workDay.CheckOutTime = checkOutTime;
        }

        if (notes != null)
        {
            workDay.Notes = notes;
        }

        await _context.SaveChangesAsync();
        return workDay;
    }

    public async Task DeleteWorkDayAsync(int id, bool cascade = false)
    {
        var workDay = await _context.WorkDays
            .Include(w => w.TimeEntries)
            .Include(w => w.Breaks)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workDay == null)
        {
            throw new InvalidOperationException($"Work day with ID {id} not found.");
        }

        // Check if work day has time entries or breaks
        if (workDay.TimeEntries.Any() || workDay.Breaks.Any())
        {
            if (!cascade)
            {
                var timeEntriesCount = workDay.TimeEntries.Count;
                var breaksCount = workDay.Breaks.Count;
                var details = new List<string>();
                if (timeEntriesCount > 0) details.Add($"{timeEntriesCount} time {(timeEntriesCount == 1 ? "entry" : "entries")}");
                if (breaksCount > 0) details.Add($"{breaksCount} {(breaksCount == 1 ? "break" : "breaks")}");
                throw new InvalidOperationException($"Cannot delete work day with {string.Join(" and ", details)}. Delete them first or use force delete.");
            }
            
            // Cascade delete: remove associated records first
            _context.Breaks.RemoveRange(workDay.Breaks);
            _context.TimeEntries.RemoveRange(workDay.TimeEntries);
        }

        _context.WorkDays.Remove(workDay);
        await _context.SaveChangesAsync();
    }
}
