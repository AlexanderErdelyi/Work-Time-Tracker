using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Core.Services;

public interface IWorkDayService
{
    Task<WorkDay?> GetTodayWorkDayAsync();
    Task<WorkDay?> GetWorkDayByDateAsync(DateTime date);
    Task<WorkDay> CheckInAsync(DateTime? time = null, string? notes = null);
    Task<WorkDay> CheckOutAsync(DateTime? time = null, string? notes = null);
    Task<bool> IsCheckedInAsync();
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
}
