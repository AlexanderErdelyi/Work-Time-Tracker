# Feature Development Prompt for Timekeeper

## Overview
Use this prompt to develop new features for the Timekeeper time tracking application following best practices and existing patterns.

---

## Prompt Template

```
I need to develop a new feature for the Timekeeper project:

## Feature Description
**Feature Name**: [Name of the feature]
**Description**: [Detailed description of what the feature does]
**User Story**: As a [user type], I want to [action] so that [benefit]

## Technical Context
- **Project**: Timekeeper - C# .NET 8 time tracking application
- **Technology Stack**: ASP.NET Core 8.0, Entity Framework Core 8.0, SQLite, xUnit
- **Related Issue**: [Issue number if applicable]

## Current Architecture
```
Timekeeper/
├── Timekeeper.Core/          # Domain models, services, data access
│   ├── Data/                 # EF Core DbContext and migrations
│   ├── Models/               # Entity models (Customer, Project, Task, TimeEntry)
│   └── Services/             # Business logic services
├── Timekeeper.Api/           # Web API and UI
│   ├── Controllers/          # API controllers
│   ├── DTOs/                 # Data transfer objects
│   ├── Services/             # API-specific services (Export)
│   └── wwwroot/              # Static web files (HTML, CSS, JS)
└── Timekeeper.Tests/         # Unit and integration tests
```

## Requirements

### Functional Requirements
1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]

### Non-Functional Requirements
- **Performance**: [Any performance requirements]
- **Security**: [Any security considerations]
- **Compatibility**: Must maintain backward compatibility
- **Testing**: Must include comprehensive tests

## Implementation Guidelines

### 1. Domain Model Changes (if needed)
Location: `Timekeeper.Core/Models/`

- [ ] Create or modify entity models
- [ ] Define relationships with other entities
- [ ] Add validation attributes
- [ ] Consider cascading deletes

Example pattern:
```csharp
public class ExampleEntity
{
    public int Id { get; set; }
    [Required]
    [MaxLength(200)]
    public string Name { get; set; }
    // Navigation properties
    public ICollection<RelatedEntity> RelatedEntities { get; set; }
}
```

### 2. Database Changes (if needed)
Location: `Timekeeper.Core/Data/`

- [ ] Update DbContext with new DbSet if new entity
- [ ] Configure entity relationships in OnModelCreating
- [ ] Create migration: `dotnet ef migrations add [MigrationName] --output-dir Data/Migrations`
- [ ] Review migration up/down methods
- [ ] Add seed data if needed

### 3. Service Layer
Location: `Timekeeper.Core/Services/`

- [ ] Create interface (e.g., IExampleService)
- [ ] Implement service with business logic
- [ ] Use dependency injection for DbContext
- [ ] Implement async methods
- [ ] Add proper error handling
- [ ] Add validation logic

Example pattern:
```csharp
public interface IExampleService
{
    Task<ExampleEntity> GetByIdAsync(int id);
    Task<IEnumerable<ExampleEntity>> GetAllAsync();
    Task<ExampleEntity> CreateAsync(ExampleEntity entity);
    Task<ExampleEntity> UpdateAsync(ExampleEntity entity);
    Task<bool> DeleteAsync(int id);
}

public class ExampleService : IExampleService
{
    private readonly TimekeeperContext _context;
    
    public ExampleService(TimekeeperContext context)
    {
        _context = context;
    }
    
    // Implementation with async/await, validation, error handling
}
```

### 4. DTOs
Location: `Timekeeper.Api/DTOs/`

- [ ] Create DTOs for request/response
- [ ] Add validation attributes
- [ ] Keep DTOs separate from domain models

Example:
```csharp
public class CreateExampleDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; }
}

public class ExampleDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    // Include related data as needed
}
```

### 5. API Controller
Location: `Timekeeper.Api/Controllers/`

- [ ] Create or modify controller
- [ ] Follow RESTful conventions
- [ ] Use appropriate HTTP verbs
- [ ] Return proper status codes
- [ ] Add Swagger documentation
- [ ] Validate model state
- [ ] Map between DTOs and domain models

Example pattern:
```csharp
[ApiController]
[Route("api/[controller]")]
public class ExampleController : ControllerBase
{
    private readonly IExampleService _service;
    
    public ExampleController(IExampleService service)
    {
        _service = service;
    }
    
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ExampleDto>>> GetAll()
    {
        // Implementation
    }
    
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExampleDto>> GetById(int id)
    {
        // Implementation
    }
    
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExampleDto>> Create(CreateExampleDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        // Implementation
    }
}
```

### 6. Dependency Injection
Location: `Timekeeper.Api/Program.cs`

- [ ] Register services in DI container
```csharp
builder.Services.AddScoped<IExampleService, ExampleService>();
```

### 7. Frontend (if needed)
Location: `Timekeeper.Api/wwwroot/`

- [ ] Update index.html for UI elements
- [ ] Update app.js for API calls
- [ ] Update styles.css for styling
- [ ] Follow existing patterns

### 8. Testing
Location: `Timekeeper.Tests/`

- [ ] Create service tests with in-memory database
- [ ] Create controller tests
- [ ] Test success scenarios
- [ ] Test failure scenarios
- [ ] Test edge cases
- [ ] Test validation

Example test pattern:
```csharp
public class ExampleServiceTests
{
    private TimekeeperContext GetInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<TimekeeperContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new TimekeeperContext(options);
    }
    
    [Fact]
    public async Task CreateAsync_WithValidData_ReturnsCreatedEntity()
    {
        // Arrange
        var context = GetInMemoryContext();
        var service = new ExampleService(context);
        var entity = new ExampleEntity { Name = "Test" };
        
        // Act
        var result = await service.CreateAsync(entity);
        
        // Assert
        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal("Test", result.Name);
    }
}
```

### 9. Documentation
- [ ] Add XML documentation comments to public APIs
- [ ] Update README.md with new endpoints/features
- [ ] Update API documentation
- [ ] Add usage examples

## Constraints and Considerations

### Follow Existing Patterns
- Study similar existing features (Customers, Projects, Tasks, TimeEntries)
- Use the same architectural patterns
- Follow the same naming conventions
- Match the code style

### Performance
- Use async/await for database operations
- Implement pagination for list endpoints
- Use IQueryable efficiently
- Consider indexing for frequently queried fields

### Security
- Validate all inputs
- Use parameterized queries (EF Core does this)
- Don't expose sensitive data
- Handle exceptions without leaking information

### Backward Compatibility
- Don't break existing APIs
- Make new parameters optional when possible
- Provide migration path for breaking changes

## Validation Steps

After implementation:
1. [ ] Build succeeds: `dotnet build`
2. [ ] All tests pass: `dotnet test`
3. [ ] No new warnings introduced
4. [ ] API endpoints work via Swagger
5. [ ] Manual testing completed
6. [ ] Documentation updated
7. [ ] No security vulnerabilities
8. [ ] No performance regressions

## Deliverables

Please provide:
1. **Implementation code** for all layers (Models, Services, Controllers, DTOs)
2. **Database migration** if schema changes
3. **Comprehensive tests** with good coverage
4. **Documentation updates** (XML comments, README)
5. **Usage examples** for the new feature
6. **Migration guide** if there are breaking changes

## Additional Context
[Add any specific requirements, constraints, or context for this feature]

Please implement this feature following the guidelines above and the existing patterns in the Timekeeper codebase.
```

---

## Example Usage

### Example 1: Adding a Categories Feature
```
I need to develop a new feature for the Timekeeper project:

## Feature Description
**Feature Name**: Task Categories
**Description**: Add the ability to categorize tasks (e.g., Development, Meeting, Documentation)
**User Story**: As a user, I want to categorize my tasks so that I can better organize and report on different types of work

## Technical Context
[Standard context]

## Requirements

### Functional Requirements
1. Create a Category entity with Name and Color properties
2. Allow associating multiple categories with a task (many-to-many)
3. Provide API endpoints for CRUD operations on categories
4. Add filtering by category in time entries endpoint
5. Include category information in time entry DTOs

### Non-Functional Requirements
- Performance: Categories should load efficiently with tasks
- Security: Standard input validation
- Compatibility: Must maintain backward compatibility (optional field)
- Testing: Cover category CRUD and task associations

[Continue with implementation using the template above]
```

### Example 2: Adding Export by Project
```
I need to develop a new feature for the Timekeeper project:

## Feature Description
**Feature Name**: Project-specific Export
**Description**: Allow exporting time entries for a specific project
**User Story**: As a user, I want to export time entries for a single project so that I can share project-specific reports with clients

[Continue with full template]
```

## Tips for Feature Development

1. **Start with the domain model** - Get the data structure right first
2. **Study existing features** - Look at how Customers/Projects are implemented
3. **Build layer by layer** - Model → Service → Controller → Tests
4. **Test as you go** - Don't wait until everything is complete
5. **Keep it simple** - Follow YAGNI (You Aren't Gonna Need It)
6. **Think about edge cases** - What happens with null values, empty lists, etc.?
7. **Consider the user experience** - How will this feature be used?

## Common Pitfalls to Avoid

1. **Don't bypass the service layer** - Controllers should be thin
2. **Don't use domain models as DTOs** - Keep them separate
3. **Don't forget async/await** - All database operations should be async
4. **Don't skip tests** - They catch bugs early
5. **Don't ignore validation** - Validate at multiple layers
6. **Don't forget error handling** - What if something goes wrong?
7. **Don't create circular dependencies** - Keep dependencies flowing in one direction
