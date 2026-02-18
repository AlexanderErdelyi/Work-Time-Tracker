using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;
using Timekeeper.Core.Services;

namespace Timekeeper.Tests;

// Simple mock for testing
public class TestBillingService : IBillingService
{
    public decimal CalculateBilledHours(TimeSpan duration, int roundingThresholdMinutes = 3, decimal billingIncrementHours = 0.25m)
    {
        // Simple implementation for testing
        return (decimal)Math.Round(duration.TotalHours * 4) / 4;
    }
}

public class TimeEntryServiceTests
{
    private TimekeeperContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<TimekeeperContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new TimekeeperContext(options);
    }

    [Fact]
    public async Task StartTimer_ShouldCreateNewTimeEntry()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        // Act
        var entry = await service.StartTimerAsync(1, "Test notes");

        // Assert
        Assert.NotNull(entry);
        Assert.Equal(1, entry.TaskId);
        Assert.Equal("Test notes", entry.Notes);
        Assert.Null(entry.EndTime);
        Assert.True(entry.IsRunning);
    }

    [Fact]
    public async Task StartTimer_WhenTimerAlreadyRunning_ShouldThrowException()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        await service.StartTimerAsync(1);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.StartTimerAsync(1));
    }

    [Fact]
    public async Task StopTimer_ShouldSetEndTime()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var entry = await service.StartTimerAsync(1);

        // Act
        var stoppedEntry = await service.StopTimerAsync(entry.Id);

        // Assert
        Assert.NotNull(stoppedEntry.EndTime);
        Assert.False(stoppedEntry.IsRunning);
        Assert.NotNull(stoppedEntry.Duration);
    }

    [Fact]
    public async Task GetRunningEntry_WhenNoRunningTimer_ShouldReturnNull()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        // Act
        var entry = await service.GetRunningEntryAsync();

        // Assert
        Assert.Null(entry);
    }

    [Fact]
    public async Task GetRunningEntry_WhenTimerRunning_ShouldReturnEntry()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var startedEntry = await service.StartTimerAsync(1);

        // Act
        var runningEntry = await service.GetRunningEntryAsync();

        // Assert
        Assert.NotNull(runningEntry);
        Assert.Equal(startedEntry.Id, runningEntry.Id);
    }

    [Fact]
    public async Task HasRunningTimer_ShouldReturnCorrectValue()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        // Act & Assert - No running timer
        Assert.False(await service.HasRunningTimerAsync());

        // Start timer
        await service.StartTimerAsync(1);

        // Act & Assert - Has running timer
        Assert.True(await service.HasRunningTimerAsync());
    }

    [Fact]
    public async Task PauseTimer_ShouldSetPausedAt()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var entry = await service.StartTimerAsync(1);

        // Act
        var pausedEntry = await service.PauseTimerAsync(entry.Id);

        // Assert
        Assert.NotNull(pausedEntry.PausedAt);
        Assert.Null(pausedEntry.EndTime);
        Assert.True(pausedEntry.IsPaused);
    }

    [Fact]
    public async Task ResumeFromPause_ShouldAccumulatePausedTime()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var entry = await service.StartTimerAsync(1);
        var pausedEntry = await service.PauseTimerAsync(entry.Id);
        
        // Simulate 2 seconds pause
        await Task.Delay(2000);

        // Act
        var resumedEntry = await service.ResumeFromPauseAsync(entry.Id);

        // Assert
        Assert.Null(resumedEntry.PausedAt);
        Assert.Null(resumedEntry.EndTime);
        Assert.True(resumedEntry.TotalPausedSeconds >= 2);
        Assert.False(resumedEntry.IsPaused);
    }

    [Fact]
    public async Task RestartTimer_ShouldAccumulateStoppedTime()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var entry = await service.StartTimerAsync(1);
        var stoppedEntry = await service.StopTimerAsync(entry.Id);
        
        // Simulate 2 seconds stopped
        await Task.Delay(2000);

        // Act
        var restartedEntry = await service.ResumeTimerAsync(entry.Id);

        // Assert
        Assert.Null(restartedEntry.EndTime);
        Assert.True(restartedEntry.TotalPausedSeconds >= 2);
        Assert.True(restartedEntry.IsRunning);
    }

    [Fact]
    public async Task RestartTimer_MultipleCycles_ShouldAccumulateAllStoppedTime()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var entry = await service.StartTimerAsync(1);
        
        // First stop-restart cycle
        await service.StopTimerAsync(entry.Id);
        await Task.Delay(1000);
        var restart1 = await service.ResumeTimerAsync(entry.Id);
        var stoppedTime1 = restart1.TotalPausedSeconds;

        // Second stop-restart cycle
        await service.StopTimerAsync(entry.Id);
        await Task.Delay(1000);
        var restart2 = await service.ResumeTimerAsync(entry.Id);

        // Assert
        Assert.Null(restart2.EndTime);
        Assert.True(restart2.TotalPausedSeconds >= stoppedTime1 + 1);
        Assert.True(restart2.IsRunning);
    }

    [Fact]
    public async Task PauseAndRestart_ShouldAccumulateBothTypes()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var entry = await service.StartTimerAsync(1);
        
        // Pause and resume
        await service.PauseTimerAsync(entry.Id);
        await Task.Delay(1000);
        var resumed = await service.ResumeFromPauseAsync(entry.Id);
        var pausedTime = resumed.TotalPausedSeconds;

        // Stop and restart
        await service.StopTimerAsync(entry.Id);
        await Task.Delay(1000);
        var restarted = await service.ResumeTimerAsync(entry.Id);

        // Assert
        Assert.Null(restarted.EndTime);
        Assert.True(restarted.TotalPausedSeconds >= pausedTime + 1);
        Assert.True(restarted.IsRunning);
    }

    [Fact]
    public async Task Duration_WithStoppedTime_ShouldExcludeIt()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var startTime = DateTime.UtcNow;
        var entry = await service.StartTimerAsync(1);
        
        // Work for a bit, then stop
        await Task.Delay(1000);
        await service.StopTimerAsync(entry.Id);
        
        // Stop for 2 seconds
        await Task.Delay(2000);
        
        // Restart and work more
        await service.ResumeTimerAsync(entry.Id);
        await Task.Delay(1000);
        
        // Stop and calculate duration
        var stoppedEntry = await service.StopTimerAsync(entry.Id);

        // Assert
        // Total elapsed time is ~4 seconds, but stopped time was ~2 seconds
        // So duration should be approximately 2 seconds (4 - 2)
        Assert.NotNull(stoppedEntry.Duration);
        var durationSeconds = stoppedEntry.Duration.Value.TotalSeconds;
        Assert.True(durationSeconds >= 1.5 && durationSeconds <= 2.5, 
            $"Duration should be ~2 seconds excluding stopped time, but was {durationSeconds}");
    }

    [Fact]
    public async Task Duration_WithPausedAndStoppedTime_ShouldExcludeBoth()
    {
        // Arrange
        using var context = CreateContext();
        var service = new TimeEntryService(context, new TestBillingService());

        var customer = new Customer { Id = 1, Name = "Test Customer" };
        var project = new Project { Id = 1, Name = "Test Project", CustomerId = 1 };
        var task = new TaskItem { Id = 1, Name = "Test Task", ProjectId = 1 };

        context.Customers.Add(customer);
        context.Projects.Add(project);
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        var entry = await service.StartTimerAsync(1);
        
        // Work, pause, resume, stop, restart pattern
        await Task.Delay(500);
        await service.PauseTimerAsync(entry.Id);
        await Task.Delay(500); // 500ms paused
        await service.ResumeFromPauseAsync(entry.Id);
        await Task.Delay(500);
        await service.StopTimerAsync(entry.Id);
        await Task.Delay(500); // 500ms stopped
        await service.ResumeTimerAsync(entry.Id);
        await Task.Delay(500);
        
        var stoppedEntry = await service.StopTimerAsync(entry.Id);

        // Assert
        // Total elapsed ~2.5s, but paused+stopped ~1s, so duration should be ~1.5s
        Assert.NotNull(stoppedEntry.Duration);
        var durationSeconds = stoppedEntry.Duration.Value.TotalSeconds;
        Assert.True(durationSeconds >= 1.0 && durationSeconds <= 2.0, 
            $"Duration should be ~1.5 seconds excluding paused and stopped time, but was {durationSeconds}");
    }
}
