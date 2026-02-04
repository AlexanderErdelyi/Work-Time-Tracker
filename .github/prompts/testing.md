# Testing Prompt for Timekeeper

## Overview
Use this prompt to create comprehensive tests for the Timekeeper time tracking application.

---

## Prompt Template

```
I need to create comprehensive tests for the Timekeeper project:

## Testing Context
**Project**: Timekeeper - C# .NET 8 time tracking application
**Test Framework**: xUnit
**Database**: In-Memory Entity Framework Core for testing
**Coverage Target**: [Specify percentage or "comprehensive"]

## Component to Test
**Type**: [Service / Controller / Model / Integration]
**File**: [Path to the file being tested]
**Class/Method**: [Specific class or method]

## Current Code
[Paste the code that needs to be tested]

## Test Requirements

### Test Coverage Goals
- [ ] All public methods tested
- [ ] Success scenarios covered
- [ ] Failure scenarios covered
- [ ] Edge cases handled
- [ ] Validation logic tested
- [ ] Error handling verified
- [ ] Null/empty input handled
- [ ] Boundary conditions checked

## Test Structure

### Test File Organization
Location: `Timekeeper.Tests/`

Follow this structure:
```
Timekeeper.Tests/
├── Services/           # Service layer tests
├── Controllers/        # Controller tests
├── Models/            # Model and relationship tests
└── Integration/       # Integration tests (if applicable)
```

### Test Class Template
```csharp
using Xunit;
using Microsoft.EntityFrameworkCore;
using Timekeeper.Core.Data;
using Timekeeper.Core.Services;
using Timekeeper.Core.Models;

namespace Timekeeper.Tests.Services
{
    public class ExampleServiceTests
    {
        private TimekeeperContext GetInMemoryContext()
        {
            var options = new DbContextOptionsBuilder<TimekeeperContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            
            return new TimekeeperContext(options);
        }
        
        private ExampleService CreateService(TimekeeperContext context = null)
        {
            context ??= GetInMemoryContext();
            return new ExampleService(context);
        }
        
        // Tests go here
    }
}
```

## Test Categories

### 1. Service Tests
Test business logic in isolation with in-memory database.

#### Success Scenarios
```csharp
[Fact]
public async Task GetByIdAsync_WithValidId_ReturnsEntity()
{
    // Arrange
    var context = GetInMemoryContext();
    var service = CreateService(context);
    var entity = new Entity { Name = "Test" };
    context.Entities.Add(entity);
    await context.SaveChangesAsync();
    
    // Act
    var result = await service.GetByIdAsync(entity.Id);
    
    // Assert
    Assert.NotNull(result);
    Assert.Equal("Test", result.Name);
    Assert.Equal(entity.Id, result.Id);
}

[Fact]
public async Task CreateAsync_WithValidData_CreatesEntity()
{
    // Arrange
    var context = GetInMemoryContext();
    var service = CreateService(context);
    var entity = new Entity { Name = "Test" };
    
    // Act
    var result = await service.CreateAsync(entity);
    
    // Assert
    Assert.NotNull(result);
    Assert.True(result.Id > 0);
    Assert.Equal("Test", result.Name);
    
    // Verify it's in the database
    var fromDb = await context.Entities.FindAsync(result.Id);
    Assert.NotNull(fromDb);
    Assert.Equal("Test", fromDb.Name);
}
```

#### Failure Scenarios
```csharp
[Fact]
public async Task GetByIdAsync_WithInvalidId_ReturnsNull()
{
    // Arrange
    var service = CreateService();
    
    // Act
    var result = await service.GetByIdAsync(999);
    
    // Assert
    Assert.Null(result);
}

[Fact]
public async Task CreateAsync_WithNullEntity_ThrowsArgumentNullException()
{
    // Arrange
    var service = CreateService();
    
    // Act & Assert
    await Assert.ThrowsAsync<ArgumentNullException>(
        () => service.CreateAsync(null)
    );
}

[Fact]
public async Task UpdateAsync_WithNonExistentEntity_ThrowsException()
{
    // Arrange
    var service = CreateService();
    var entity = new Entity { Id = 999, Name = "Test" };
    
    // Act & Assert
    await Assert.ThrowsAsync<InvalidOperationException>(
        () => service.UpdateAsync(entity)
    );
}
```

#### Edge Cases
```csharp
[Fact]
public async Task GetAllAsync_WhenEmpty_ReturnsEmptyList()
{
    // Arrange
    var service = CreateService();
    
    // Act
    var result = await service.GetAllAsync();
    
    // Assert
    Assert.NotNull(result);
    Assert.Empty(result);
}

[Theory]
[InlineData("")]
[InlineData(" ")]
[InlineData(null)]
public async Task CreateAsync_WithInvalidName_ThrowsException(string name)
{
    // Arrange
    var service = CreateService();
    var entity = new Entity { Name = name };
    
    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(
        () => service.CreateAsync(entity)
    );
}

[Fact]
public async Task CreateAsync_WithVeryLongName_ThrowsException()
{
    // Arrange
    var service = CreateService();
    var entity = new Entity { Name = new string('a', 201) }; // Max 200
    
    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(
        () => service.CreateAsync(entity)
    );
}
```

### 2. Controller Tests
Test API endpoints including validation and error handling.

```csharp
using Microsoft.AspNetCore.Mvc;
using Moq;

public class ExampleControllerTests
{
    private readonly Mock<IExampleService> _mockService;
    private readonly ExampleController _controller;
    
    public ExampleControllerTests()
    {
        _mockService = new Mock<IExampleService>();
        _controller = new ExampleController(_mockService.Object);
    }
    
    [Fact]
    public async Task GetById_WithValidId_ReturnsOkResult()
    {
        // Arrange
        var entity = new Entity { Id = 1, Name = "Test" };
        _mockService.Setup(s => s.GetByIdAsync(1))
            .ReturnsAsync(entity);
        
        // Act
        var result = await _controller.GetById(1);
        
        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<EntityDto>(okResult.Value);
        Assert.Equal(1, dto.Id);
        Assert.Equal("Test", dto.Name);
    }
    
    [Fact]
    public async Task GetById_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        _mockService.Setup(s => s.GetByIdAsync(999))
            .ReturnsAsync((Entity)null);
        
        // Act
        var result = await _controller.GetById(999);
        
        // Assert
        Assert.IsType<NotFoundResult>(result.Result);
    }
    
    [Fact]
    public async Task Create_WithValidData_ReturnsCreatedResult()
    {
        // Arrange
        var dto = new CreateEntityDto { Name = "Test" };
        var entity = new Entity { Id = 1, Name = "Test" };
        _mockService.Setup(s => s.CreateAsync(It.IsAny<Entity>()))
            .ReturnsAsync(entity);
        
        // Act
        var result = await _controller.Create(dto);
        
        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var returnedDto = Assert.IsType<EntityDto>(createdResult.Value);
        Assert.Equal(1, returnedDto.Id);
    }
    
    [Fact]
    public async Task Create_WithInvalidModelState_ReturnsBadRequest()
    {
        // Arrange
        _controller.ModelState.AddModelError("Name", "Required");
        var dto = new CreateEntityDto();
        
        // Act
        var result = await _controller.Create(dto);
        
        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
```

### 3. Relationship Tests
Test entity relationships and cascading behavior.

```csharp
[Fact]
public async Task DeleteCustomer_WithProjects_DeletesProjects()
{
    // Arrange
    var context = GetInMemoryContext();
    var customer = new Customer { Name = "Test Customer" };
    var project = new Project { Name = "Test Project", Customer = customer };
    context.Customers.Add(customer);
    context.Projects.Add(project);
    await context.SaveChangesAsync();
    
    // Act
    context.Customers.Remove(customer);
    await context.SaveChangesAsync();
    
    // Assert
    var projectExists = await context.Projects.AnyAsync(p => p.Id == project.Id);
    Assert.False(projectExists);
}
```

### 4. Timer-Specific Tests
Test timer functionality thoroughly (critical for Timekeeper).

```csharp
[Fact]
public async Task StartTimer_WhenNoTimerRunning_StartsTimer()
{
    // Arrange
    var context = GetInMemoryContext();
    var service = new TimeEntryService(context);
    var taskId = 1;
    
    // Act
    var result = await service.StartTimerAsync(taskId, "Description");
    
    // Assert
    Assert.NotNull(result);
    Assert.True(result.IsRunning);
    Assert.NotNull(result.StartTime);
    Assert.Null(result.EndTime);
    Assert.Equal(DateTimeKind.Utc, result.StartTime.Kind);
}

[Fact]
public async Task StartTimer_WhenTimerAlreadyRunning_ThrowsException()
{
    // Arrange
    var context = GetInMemoryContext();
    var service = new TimeEntryService(context);
    var existingEntry = new TimeEntry 
    { 
        TaskId = 1, 
        StartTime = DateTime.UtcNow, 
        IsRunning = true 
    };
    context.TimeEntries.Add(existingEntry);
    await context.SaveChangesAsync();
    
    // Act & Assert
    await Assert.ThrowsAsync<InvalidOperationException>(
        () => service.StartTimerAsync(2, "Description")
    );
}

[Fact]
public async Task StopTimer_CalculatesDurationCorrectly()
{
    // Arrange
    var context = GetInMemoryContext();
    var service = new TimeEntryService(context);
    var startTime = DateTime.UtcNow.AddHours(-2);
    var entry = new TimeEntry 
    { 
        Id = 1,
        StartTime = startTime, 
        IsRunning = true 
    };
    context.TimeEntries.Add(entry);
    await context.SaveChangesAsync();
    
    // Act
    var result = await service.StopTimerAsync(1);
    
    // Assert
    Assert.False(result.IsRunning);
    Assert.NotNull(result.EndTime);
    var duration = result.EndTime.Value - result.StartTime;
    Assert.True(duration.TotalHours >= 2);
    Assert.True(duration.TotalHours < 2.1); // Allow small margin
}
```

### 5. Filtering and Query Tests
Test filtering logic with various combinations.

```csharp
[Fact]
public async Task GetTimeEntries_WithDateFilter_ReturnsFilteredResults()
{
    // Arrange
    var context = GetInMemoryContext();
    var service = new TimeEntryService(context);
    var yesterday = DateTime.UtcNow.AddDays(-1);
    var today = DateTime.UtcNow;
    var tomorrow = DateTime.UtcNow.AddDays(1);
    
    context.TimeEntries.AddRange(
        new TimeEntry { StartTime = yesterday },
        new TimeEntry { StartTime = today },
        new TimeEntry { StartTime = tomorrow }
    );
    await context.SaveChangesAsync();
    
    // Act
    var result = await service.GetTimeEntriesAsync(
        startDate: today.Date,
        endDate: today.Date.AddDays(1)
    );
    
    // Assert
    Assert.Single(result);
    Assert.Equal(today.Date, result.First().StartTime.Date);
}

[Theory]
[InlineData(null, null, 3)] // No filters
[InlineData("2024-01-01", null, 2)] // Start date only
[InlineData(null, "2024-01-31", 2)] // End date only
[InlineData("2024-01-10", "2024-01-20", 1)] // Both dates
public async Task GetTimeEntries_WithVariousDateFilters_ReturnsCorrectCount(
    string startDateStr, 
    string endDateStr, 
    int expectedCount)
{
    // Test multiple scenarios with Theory
}
```

### 6. Export Tests
Test CSV and XLSX export functionality.

```csharp
[Fact]
public async Task ExportToCsv_WithData_ReturnsValidCsv()
{
    // Arrange
    var service = new CsvExportService();
    var entries = new List<TimeEntry>
    {
        new TimeEntry { Description = "Test", StartTime = DateTime.UtcNow }
    };
    
    // Act
    var csv = await service.ExportToCsvAsync(entries);
    
    // Assert
    Assert.NotNull(csv);
    Assert.Contains("Description", csv);
    Assert.Contains("Test", csv);
    
    // Verify CSV format
    var lines = csv.Split('\n');
    Assert.True(lines.Length >= 2); // Header + at least one data row
}
```

## Test Best Practices

### Naming Convention
Use descriptive names that indicate:
1. Method being tested
2. Scenario
3. Expected result

Format: `MethodName_Scenario_ExpectedResult`

```csharp
[Fact]
public async Task GetCustomerById_WithValidId_ReturnsCustomer()

[Fact]
public async Task CreateProject_WithoutCustomer_ThrowsArgumentException()

[Fact]
public async Task DeleteTask_WhenHasTimeEntries_PreservesTimeEntries()
```

### Arrange-Act-Assert Pattern
Always structure tests clearly:
```csharp
[Fact]
public async Task ExampleTest()
{
    // Arrange - Set up test data and dependencies
    var context = GetInMemoryContext();
    var service = CreateService(context);
    
    // Act - Execute the method being tested
    var result = await service.DoSomething();
    
    // Assert - Verify the results
    Assert.NotNull(result);
    Assert.Equal(expected, result);
}
```

### Use Theory for Multiple Scenarios
```csharp
[Theory]
[InlineData(0)]
[InlineData(-1)]
[InlineData(-100)]
public async Task GetById_WithInvalidId_ReturnsNull(int invalidId)
{
    // Test same behavior with multiple inputs
}
```

### Test Isolation
Each test should be independent:
```csharp
// GOOD - New context for each test
private TimekeeperContext GetInMemoryContext()
{
    var options = new DbContextOptionsBuilder<TimekeeperContext>()
        .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
        .Options;
    return new TimekeeperContext(options);
}

// BAD - Shared state between tests
private static TimekeeperContext _sharedContext; // Don't do this
```

## Validation Steps

After writing tests:
- [ ] All tests pass: `dotnet test`
- [ ] Tests are independent (can run in any order)
- [ ] Test names are descriptive
- [ ] Both success and failure cases covered
- [ ] Edge cases tested
- [ ] No hardcoded values (use constants or generate)
- [ ] Assertions are specific and meaningful
- [ ] Tests run quickly (< 1 second each for unit tests)

## Coverage Goals

### Minimum Coverage by Component
- **Services**: 90%+ (business logic is critical)
- **Controllers**: 80%+ (API contracts)
- **Models**: 70%+ (relationships and validation)
- **Overall**: 80%+

### Critical Paths (100% coverage required)
- Timer start/stop logic
- Data validation
- Cascade delete behavior
- Permission/authorization checks (when added)
- Export functionality

## Deliverables

Please provide:
1. **Complete test class** with all test methods
2. **Test coverage report** if available
3. **Test execution results** showing all tests pass
4. **Documentation** of any testing assumptions or limitations

## Additional Context
[Add any specific testing requirements or constraints]

Please create comprehensive tests following the patterns and guidelines above.
```

---

## Example Usage

### Example 1: Testing a New Service
```
I need to create comprehensive tests for the Timekeeper project:

## Testing Context
**Coverage Target**: Comprehensive (90%+)

## Component to Test
**Type**: Service
**File**: Timekeeper.Core/Services/ProjectService.cs
**Class/Method**: ProjectService (all public methods)

## Current Code
[Paste the ProjectService code]

[Continue with the template]
```

### Example 2: Testing Timer Logic
```
I need to create comprehensive tests for timer functionality:

## Component to Test
**Type**: Service
**File**: Timekeeper.Core/Services/TimeEntryService.cs
**Class/Method**: Timer-related methods (StartTimerAsync, StopTimerAsync, GetRunningTimerAsync)

This is critical functionality that must have 100% coverage.

[Continue with the template]
```

## Tips for Writing Good Tests

1. **Test behavior, not implementation** - Don't test internal details
2. **One assertion per test** (when possible) - Makes failures clear
3. **Use meaningful test data** - "Test Customer 1" is better than "x"
4. **Test the unhappy path** - Errors and edge cases are important
5. **Keep tests simple** - Tests should be easy to understand
6. **Don't test framework code** - Don't test Entity Framework itself
7. **Mock external dependencies** - But use real database for integration tests
8. **Make tests fast** - Slow tests won't be run frequently
