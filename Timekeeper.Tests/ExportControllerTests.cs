using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Api.Controllers;
using Timekeeper.Api.Services;
using Timekeeper.Core.Data;
using Timekeeper.Core.Models;
using Timekeeper.Core.Services;

namespace Timekeeper.Tests;

public class ExportControllerTests
{
    private TimekeeperContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<TimekeeperContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new TimekeeperContext(options);
    }

    private ExportController CreateController(TimekeeperContext context, string role = "Member", int userId = 1)
    {
        var workspaceContext = new TestWorkspaceContext(userId);
        var exportService = new ExportService();
        
        var controller = new ExportController(context, exportService, workspaceContext);
        
        // Set up user claims
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Role, role),
            new Claim("user_id", userId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };
        
        return controller;
    }

    private async Task SeedTestData(TimekeeperContext context)
    {
        // Create customers
        var customer = new Customer
        {
            Id = 1,
            Name = "Test Customer",
            No = "C001",
            IsActive = true
        };
        context.Customers.Add(customer);

        // Create project
        var project = new Project
        {
            Id = 1,
            Name = "Test Project",
            No = "P001",
            CustomerId = 1,
            IsActive = true
        };
        context.Projects.Add(project);

        // Create task
        var task = new TaskItem
        {
            Id = 1,
            Name = "Test Task",
            Position = "T001",
            ProjectId = 1,
            IsActive = true
        };
        context.Tasks.Add(task);

        // Create time entries for user 1
        var entry1 = new TimeEntry
        {
            Id = 1,
            UserId = 1,
            TaskId = 1,
            StartTime = DateTime.UtcNow.AddHours(-2),
            EndTime = DateTime.UtcNow.AddHours(-1),
            BilledHours = 1.0m
        };
        context.TimeEntries.Add(entry1);

        // Create time entries for user 2
        var entry2 = new TimeEntry
        {
            Id = 2,
            UserId = 2,
            TaskId = 1,
            StartTime = DateTime.UtcNow.AddHours(-4),
            EndTime = DateTime.UtcNow.AddHours(-3),
            BilledHours = 1.0m
        };
        context.TimeEntries.Add(entry2);

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task ExportCsv_AsMember_ReturnsOnlyOwnEntries()
    {
        // Arrange
        var context = CreateInMemoryContext();
        await SeedTestData(context);
        var controller = CreateController(context, role: "Member", userId: 1);

        // Act
        var result = await controller.ExportCsv();

        // Assert
        Assert.IsType<FileContentResult>(result);
        var fileResult = (FileContentResult)result;
        Assert.Equal("text/csv", fileResult.ContentType);
        
        // Verify content contains only user 1's data
        var content = System.Text.Encoding.UTF8.GetString(fileResult.FileContents);
        // The export should have 2 lines (header + 1 entry for user 1)
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(2, lines.Length); // Header + 1 data row
    }

    [Fact]
    public async Task ExportCsv_AsAdmin_ReturnsAllEntries()
    {
        // Arrange
        var context = CreateInMemoryContext();
        await SeedTestData(context);
        var controller = CreateController(context, role: "Admin", userId: 1);

        // Act
        var result = await controller.ExportCsv();

        // Assert
        Assert.IsType<FileContentResult>(result);
        var fileResult = (FileContentResult)result;
        Assert.Equal("text/csv", fileResult.ContentType);
        
        // Verify content contains all entries
        var content = System.Text.Encoding.UTF8.GetString(fileResult.FileContents);
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(3, lines.Length); // Header + 2 data rows
    }

    [Fact]
    public async Task ExportCsv_AsManager_ReturnsAllEntries()
    {
        // Arrange
        var context = CreateInMemoryContext();
        await SeedTestData(context);
        var controller = CreateController(context, role: "Manager", userId: 1);

        // Act
        var result = await controller.ExportCsv();

        // Assert
        Assert.IsType<FileContentResult>(result);
        var fileResult = (FileContentResult)result;
        Assert.Equal("text/csv", fileResult.ContentType);
        
        // Verify content contains all entries
        var content = System.Text.Encoding.UTF8.GetString(fileResult.FileContents);
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(3, lines.Length); // Header + 2 data rows
    }

    [Fact]
    public async Task ExportXlsx_AsMember_ReturnsOnlyOwnEntries()
    {
        // Arrange
        var context = CreateInMemoryContext();
        await SeedTestData(context);
        var controller = CreateController(context, role: "Member", userId: 1);

        // Act
        var result = await controller.ExportXlsx();

        // Assert
        Assert.IsType<FileContentResult>(result);
        var fileResult = (FileContentResult)result;
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileResult.ContentType);
    }

    [Fact]
    public async Task ExportTodayCsv_AsMember_ReturnsOnlyOwnEntries()
    {
        // Arrange
        var context = CreateInMemoryContext();
        
        // Seed with today's data
        var customer = new Customer { Id = 1, Name = "Test Customer", No = "C001", IsActive = true };
        context.Customers.Add(customer);
        var project = new Project { Id = 1, Name = "Test Project", No = "P001", CustomerId = 1, IsActive = true };
        context.Projects.Add(project);
        var task = new TaskItem { Id = 1, Name = "Test Task", Position = "T001", ProjectId = 1, IsActive = true };
        context.Tasks.Add(task);
        
        var todayEntry = new TimeEntry
        {
            Id = 1,
            UserId = 1,
            TaskId = 1,
            StartTime = DateTime.Today.AddHours(9),
            EndTime = DateTime.Today.AddHours(10),
            BilledHours = 1.0m
        };
        context.TimeEntries.Add(todayEntry);
        
        var todayEntryUser2 = new TimeEntry
        {
            Id = 2,
            UserId = 2,
            TaskId = 1,
            StartTime = DateTime.Today.AddHours(9),
            EndTime = DateTime.Today.AddHours(10),
            BilledHours = 1.0m
        };
        context.TimeEntries.Add(todayEntryUser2);
        
        await context.SaveChangesAsync();
        
        var controller = CreateController(context, role: "Member", userId: 1);

        // Act
        var result = await controller.ExportTodayCsv();

        // Assert
        Assert.IsType<FileContentResult>(result);
        var fileResult = (FileContentResult)result;
        Assert.Equal("text/csv", fileResult.ContentType);
        
        // Verify content contains only user 1's data
        var content = System.Text.Encoding.UTF8.GetString(fileResult.FileContents);
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal(2, lines.Length); // Header + 1 data row
    }

    // Helper class to mock IWorkspaceContext
    private class TestWorkspaceContext : IWorkspaceContext
    {
        public TestWorkspaceContext(int userId)
        {
            UserId = userId;
            WorkspaceId = 1;
        }

        public int WorkspaceId { get; }
        public int? UserId { get; }
    }
}
