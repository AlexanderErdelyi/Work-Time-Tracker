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
    Task DeleteWorkDayAsync(int id);
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
            workDay.CheckInTime = checkInTime;
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

    public async Task DeleteWorkDayAsync(int id)
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
            throw new InvalidOperationException("Cannot delete work day with associated time entries or breaks. Delete them first.");
        }

        _context.WorkDays.Remove(workDay);
        await _context.SaveChangesAsync();
    }
}
