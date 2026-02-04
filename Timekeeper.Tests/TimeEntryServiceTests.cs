using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;
using Timekeeper.Core.Services;

namespace Timekeeper.Tests;

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
        var service = new TimeEntryService(context);

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
        var service = new TimeEntryService(context);

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
        var service = new TimeEntryService(context);

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
        var service = new TimeEntryService(context);

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
        var service = new TimeEntryService(context);

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
        var service = new TimeEntryService(context);

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
}
