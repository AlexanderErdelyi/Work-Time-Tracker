using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Core.Services;

public interface IBreakService
{
    Task<Break?> GetActiveBreakAsync();
    Task<List<Break>> GetTodayBreaksAsync();
    Task<List<Break>> GetBreaksByWorkDayIdAsync(int workDayId);
    Task<Break> StartBreakAsync(string? notes = null);
    Task<Break> EndBreakAsync(string? notes = null);
    Task<bool> IsOnBreakAsync();
    Task DeleteBreakAsync(int id);
}

public class BreakService : IBreakService
{
    private readonly TimekeeperContext _context;
    private readonly IWorkDayService _workDayService;
    private readonly IWorkspaceContext? _workspaceContext;

    private int CurrentUserId => _workspaceContext?.UserId ?? 1;

    public BreakService(TimekeeperContext context, IWorkDayService workDayService, IWorkspaceContext? workspaceContext = null)
    {
        _context = context;
        _workDayService = workDayService;
        _workspaceContext = workspaceContext;
    }

    public async Task<Break?> GetActiveBreakAsync()
    {
        return await _context.Breaks
            .Include(b => b.WorkDay)
            .FirstOrDefaultAsync(b => b.EndTime == null && b.WorkDay != null && b.WorkDay.UserId == CurrentUserId);
    }

    public async Task<List<Break>> GetTodayBreaksAsync()
    {
        var today = DateTime.Today;
        var workDay = await _workDayService.GetTodayWorkDayAsync();
        
        if (workDay == null)
            return new List<Break>();

        return await _context.Breaks
            .Where(b => b.WorkDayId == workDay.Id)
            .OrderByDescending(b => b.StartTime)
            .ToListAsync();
    }

    public async Task<List<Break>> GetBreaksByWorkDayIdAsync(int workDayId)
    {
        return await _context.Breaks
            .Where(b => b.WorkDayId == workDayId && b.WorkDay != null && b.WorkDay.UserId == CurrentUserId)
            .OrderByDescending(b => b.StartTime)
            .ToListAsync();
    }

    public async Task<Break> StartBreakAsync(string? notes = null)
    {
        // Check if already on break
        var activeBreak = await GetActiveBreakAsync();
        if (activeBreak != null)
        {
            throw new InvalidOperationException("Break is already active. End current break before starting a new one.");
        }

        // Ensure user is checked in
        var isCheckedIn = await _workDayService.IsCheckedInAsync();
        if (!isCheckedIn)
        {
            throw new InvalidOperationException("Cannot start break. You must check in first.");
        }

        var workDay = await _workDayService.GetTodayWorkDayAsync();
        if (workDay == null)
        {
            throw new InvalidOperationException("No work day found. Please check in first.");
        }

        var breakEntity = new Break
        {
            StartTime = DateTime.Now,
            Notes = notes,
            WorkDayId = workDay.Id
        };

        _context.Breaks.Add(breakEntity);
        await _context.SaveChangesAsync();

        return breakEntity;
    }

    public async Task<Break> EndBreakAsync(string? notes = null)
    {
        var activeBreak = await GetActiveBreakAsync();
        if (activeBreak == null)
        {
            throw new InvalidOperationException("No active break found.");
        }

        activeBreak.EndTime = DateTime.Now;
        
        // Append notes if provided
        if (!string.IsNullOrWhiteSpace(notes))
        {
            activeBreak.Notes = string.IsNullOrWhiteSpace(activeBreak.Notes)
                ? notes
                : $"{activeBreak.Notes}\n{notes}";
        }

        await _context.SaveChangesAsync();

        return activeBreak;
    }

    public async Task<bool> IsOnBreakAsync()
    {
        return await _context.Breaks
            .AnyAsync(b => b.EndTime == null && b.WorkDay != null && b.WorkDay.UserId == CurrentUserId);
    }

    public async Task DeleteBreakAsync(int id)
    {
        var breakEntity = await _context.Breaks
            .Include(b => b.WorkDay)
            .FirstOrDefaultAsync(b => b.Id == id && b.WorkDay != null && b.WorkDay.UserId == CurrentUserId);
        if (breakEntity == null)
        {
            throw new InvalidOperationException($"Break with ID {id} not found.");
        }

        _context.Breaks.Remove(breakEntity);
        await _context.SaveChangesAsync();
    }
}
