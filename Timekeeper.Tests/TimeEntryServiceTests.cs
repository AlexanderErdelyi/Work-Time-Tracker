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
        pausedEntry.PausedAt = DateTime.UtcNow.AddSeconds(-3);
        await context.SaveChangesAsync();

        // Act
        var resumedEntry = await service.ResumeFromPauseAsync(entry.Id);

        // Assert
        Assert.Null(resumedEntry.PausedAt);
        Assert.Null(resumedEntry.EndTime);
        Assert.True(resumedEntry.TotalPausedSeconds >= 3);
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
        stoppedEntry.EndTime = DateTime.UtcNow.AddSeconds(-3);
        await context.SaveChangesAsync();

        // Act
        var restartedEntry = await service.ResumeTimerAsync(entry.Id);

        // Assert
        Assert.Null(restartedEntry.EndTime);
        Assert.True(restartedEntry.TotalPausedSeconds >= 3);
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
        var firstStopped = await service.StopTimerAsync(entry.Id);
        firstStopped.EndTime = DateTime.UtcNow.AddSeconds(-2);
        await context.SaveChangesAsync();
        var restart1 = await service.ResumeTimerAsync(entry.Id);
        var stoppedTime1 = restart1.TotalPausedSeconds;

        // Second stop-restart cycle
        var secondStopped = await service.StopTimerAsync(entry.Id);
        secondStopped.EndTime = DateTime.UtcNow.AddSeconds(-3);
        await context.SaveChangesAsync();
        var restart2 = await service.ResumeTimerAsync(entry.Id);

        // Assert
        Assert.Null(restart2.EndTime);
        Assert.True(restart2.TotalPausedSeconds >= stoppedTime1 + 3);
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
        var paused = await service.PauseTimerAsync(entry.Id);
        paused.PausedAt = DateTime.UtcNow.AddSeconds(-2);
        await context.SaveChangesAsync();
        var resumed = await service.ResumeFromPauseAsync(entry.Id);
        var pausedTime = resumed.TotalPausedSeconds;

        // Stop and restart
        var stopped = await service.StopTimerAsync(entry.Id);
        stopped.EndTime = DateTime.UtcNow.AddSeconds(-3);
        await context.SaveChangesAsync();
        var restarted = await service.ResumeTimerAsync(entry.Id);

        // Assert
        Assert.Null(restarted.EndTime);
        Assert.True(restarted.TotalPausedSeconds >= pausedTime + 3);
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

        var entry = await service.StartTimerAsync(1);
        entry.StartTime = DateTime.UtcNow.AddSeconds(-20);
        await context.SaveChangesAsync();

        var firstStopped = await service.StopTimerAsync(entry.Id);
        firstStopped.EndTime = DateTime.UtcNow.AddSeconds(-12);
        await context.SaveChangesAsync();

        await service.ResumeTimerAsync(entry.Id);
        var stoppedEntry = await service.StopTimerAsync(entry.Id);

        // Assert
        // Total elapsed ~20s, stopped period ~12s, expected duration ~8s
        Assert.NotNull(stoppedEntry.Duration);
        var durationSeconds = stoppedEntry.Duration.Value.TotalSeconds;
        Assert.True(durationSeconds >= 7.0 && durationSeconds <= 9.0,
            $"Duration should be ~8 seconds excluding stopped time, but was {durationSeconds}");
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
        entry.StartTime = DateTime.UtcNow.AddSeconds(-20);
        await context.SaveChangesAsync();

        // Pause and resume with deterministic paused duration (~3s)
        var pausedEntry = await service.PauseTimerAsync(entry.Id);
        pausedEntry.PausedAt = DateTime.UtcNow.AddSeconds(-3);
        await context.SaveChangesAsync();
        await service.ResumeFromPauseAsync(entry.Id);

        // Stop and restart with deterministic stopped duration (~4s)
        var firstStopped = await service.StopTimerAsync(entry.Id);
        firstStopped.EndTime = DateTime.UtcNow.AddSeconds(-4);
        await context.SaveChangesAsync();
        await service.ResumeTimerAsync(entry.Id);

        var stoppedEntry = await service.StopTimerAsync(entry.Id);

        // Assert
        // Total elapsed ~20s, paused+stopped ~7s, so duration should be ~13s
        Assert.NotNull(stoppedEntry.Duration);
        var durationSeconds = stoppedEntry.Duration.Value.TotalSeconds;
        Assert.True(durationSeconds >= 12.0 && durationSeconds <= 14.0,
            $"Duration should be ~13 seconds excluding paused and stopped time, but was {durationSeconds}");
    }
}
