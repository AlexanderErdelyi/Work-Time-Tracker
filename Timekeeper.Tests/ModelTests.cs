using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;

namespace Timekeeper.Tests;

public class ModelTests
{
    [Fact]
    public void TimeEntry_Duration_ShouldCalculateCorrectly()
    {
        // Arrange
        var entry = new TimeEntry
        {
            StartTime = new DateTime(2024, 1, 1, 10, 0, 0),
            EndTime = new DateTime(2024, 1, 1, 12, 30, 0)
        };

        // Act
        var duration = entry.Duration;

        // Assert
        Assert.NotNull(duration);
        Assert.Equal(2.5, duration.Value.TotalHours);
    }

    [Fact]
    public void TimeEntry_IsRunning_ShouldReturnTrueWhenNoEndTime()
    {
        // Arrange
        var entry = new TimeEntry
        {
            StartTime = DateTime.UtcNow,
            EndTime = null
        };

        // Act & Assert
        Assert.True(entry.IsRunning);
    }

    [Fact]
    public void TimeEntry_IsRunning_ShouldReturnFalseWhenHasEndTime()
    {
        // Arrange
        var entry = new TimeEntry
        {
            StartTime = DateTime.UtcNow.AddHours(-1),
            EndTime = DateTime.UtcNow
        };

        // Act & Assert
        Assert.False(entry.IsRunning);
    }

    [Fact]
    public async Task DbContext_SeedData_ShouldContainDefaultRecords()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<TimekeeperContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        // Act
        using var context = new TimekeeperContext(options);
        await context.Database.EnsureCreatedAsync();

        // Assert
        Assert.True(await context.Customers.AnyAsync());
        Assert.True(await context.Projects.AnyAsync());
        Assert.True(await context.Tasks.AnyAsync());
        
        var customerCount = await context.Customers.CountAsync();
        var projectCount = await context.Projects.CountAsync();
        var taskCount = await context.Tasks.CountAsync();
        
        Assert.Equal(2, customerCount);
        Assert.Equal(3, projectCount);
        Assert.Equal(4, taskCount);
    }

    [Fact]
    public async Task Customer_Projects_Relationship_ShouldWork()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<TimekeeperContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new TimekeeperContext(options);
        
        var customer = new Customer { Name = "Test Customer" };
        context.Customers.Add(customer);
        await context.SaveChangesAsync();

        var project = new Project { Name = "Test Project", CustomerId = customer.Id };
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        // Act
        var loadedCustomer = await context.Customers
            .Include(c => c.Projects)
            .FirstAsync(c => c.Id == customer.Id);

        // Assert
        Assert.Single(loadedCustomer.Projects);
        Assert.Equal("Test Project", loadedCustomer.Projects.First().Name);
    }

    [Fact]
    public async Task Project_Tasks_Relationship_ShouldWork()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<TimekeeperContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new TimekeeperContext(options);
        
        var customer = new Customer { Name = "Test Customer" };
        context.Customers.Add(customer);
        await context.SaveChangesAsync();

        var project = new Project { Name = "Test Project", CustomerId = customer.Id };
        context.Projects.Add(project);
        await context.SaveChangesAsync();

        var task = new TaskItem { Name = "Test Task", ProjectId = project.Id };
        context.Tasks.Add(task);
        await context.SaveChangesAsync();

        // Act
        var loadedProject = await context.Projects
            .Include(p => p.Tasks)
            .FirstAsync(p => p.Id == project.Id);

        // Assert
        Assert.Single(loadedProject.Tasks);
        Assert.Equal("Test Task", loadedProject.Tasks.First().Name);
    }
}
