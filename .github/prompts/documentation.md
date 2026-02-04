# Documentation Prompt for Timekeeper

## Overview
Use this prompt to create or update documentation for the Timekeeper time tracking application.

---

## Prompt Template

```
I need help with documentation for the Timekeeper project:

## Documentation Type
**Type**: [README / API Documentation / Code Comments / User Guide / Architecture / Other]
**Scope**: [What needs to be documented]

## Context
**Project**: Timekeeper - C# .NET 8 time tracking application
**Audience**: [Developers / End Users / Contributors / All]
**Current State**: [New documentation / Update existing / Fill gaps]

## Documentation Requirements

### For Code Documentation (XML Comments)

#### Class Documentation
```csharp
/// <summary>
/// Service for managing time entry operations including timer functionality.
/// Provides CRUD operations and timer controls for tracking work time.
/// </summary>
/// <remarks>
/// This service ensures only one timer can run at a time per user.
/// All times are stored in UTC to avoid timezone issues.
/// </remarks>
public class TimeEntryService : ITimeEntryService
{
    // Implementation
}
```

#### Method Documentation
```csharp
/// <summary>
/// Starts a new timer for the specified task.
/// </summary>
/// <param name="taskId">The ID of the task to track time for.</param>
/// <param name="description">Optional description of the work being done.</param>
/// <returns>The newly created time entry with IsRunning set to true.</returns>
/// <exception cref="InvalidOperationException">
/// Thrown when a timer is already running. Stop the current timer before starting a new one.
/// </exception>
/// <exception cref="ArgumentException">
/// Thrown when the specified task ID does not exist.
/// </exception>
/// <example>
/// <code>
/// var entry = await service.StartTimerAsync(taskId: 5, description: "Working on authentication");
/// Console.WriteLine($"Timer started at {entry.StartTime}");
/// </code>
/// </example>
public async Task<TimeEntry> StartTimerAsync(int taskId, string description = null)
{
    // Implementation
}
```

#### Property Documentation
```csharp
/// <summary>
/// Gets or sets the unique identifier for the time entry.
/// </summary>
public int Id { get; set; }

/// <summary>
/// Gets or sets whether this timer is currently running.
/// Only one time entry can have IsRunning = true at a time.
/// </summary>
public bool IsRunning { get; set; }

/// <summary>
/// Gets or sets the start time of the time entry in UTC.
/// This is set when the timer starts or when creating a manual entry.
/// </summary>
public DateTime StartTime { get; set; }
```

### For API Documentation

#### Endpoint Documentation
Document each API endpoint with:
1. **Purpose**: What the endpoint does
2. **HTTP Method**: GET, POST, PUT, DELETE
3. **Route**: The URL path
4. **Parameters**: Query, route, and body parameters
5. **Request Body**: Example JSON
6. **Response**: Status codes and response body
7. **Example**: Complete request/response example

Example format:
```markdown
#### Start Timer
Starts a new timer for tracking time on a task.

**Endpoint**: `POST /api/timeentries/start`

**Request Body**:
```json
{
  "taskId": 5,
  "description": "Working on authentication feature"
}
```

**Response**: `201 Created`
```json
{
  "id": 123,
  "taskId": 5,
  "startTime": "2024-01-15T10:30:00Z",
  "endTime": null,
  "isRunning": true,
  "description": "Working on authentication feature",
  "task": {
    "id": 5,
    "name": "Authentication Implementation"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid task ID or timer already running
- `404 Not Found`: Task not found

**Example cURL**:
```bash
curl -X POST http://localhost:5199/api/timeentries/start \
  -H "Content-Type: application/json" \
  -d '{"taskId": 5, "description": "Working on authentication"}'
```
```

### For README Updates

#### Feature Section
```markdown
### [Feature Name]
Brief description of the feature and its purpose.

**Key Capabilities**:
- Capability 1: Description
- Capability 2: Description
- Capability 3: Description

**Usage Example**:
```bash
# Command or API call example
curl -X POST http://localhost:5199/api/endpoint
```

**Configuration** (if applicable):
- Setting 1: Description
- Setting 2: Description
```

#### Getting Started Section
Update installation, configuration, or usage instructions:
```markdown
## Getting Started

### Prerequisites
- .NET 8.0 SDK or later
- [Any new requirements]

### Installation
1. Step 1
2. Step 2
3. Step 3

### Configuration
[New configuration steps if needed]

### First Run
[Updated first-run experience]
```

### For Architecture Documentation

Create or update architecture documentation with:

```markdown
## Architecture Overview

### System Components
- **Component 1**: Purpose and responsibilities
- **Component 2**: Purpose and responsibilities

### Layer Architecture
```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (API Controllers, wwwroot)       │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│        Application Layer            │
│     (Services, Business Logic)      │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│         Data Access Layer           │
│  (DbContext, Repositories, Models)  │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│            Database                 │
│           (SQLite)                  │
└─────────────────────────────────────┘
```

### Data Flow
1. Request flow from client to database
2. Response flow back to client
3. Key decision points

### Design Patterns Used
- **Pattern 1**: Where and why it's used
- **Pattern 2**: Where and why it's used

### Technology Choices
- **Technology**: Reason for choosing it
```

### For User Guide

```markdown
## [Feature] User Guide

### Overview
What this feature does and why users would want to use it.

### Step-by-Step Instructions

#### Task 1: [Name]
1. Navigate to [location]
2. Click [button/link]
3. Enter [information]
4. Expected result: [what happens]

**Screenshot**: [If UI changes, include screenshot]

#### Task 2: [Name]
[Continue with step-by-step instructions]

### Tips and Tricks
- **Tip 1**: Description
- **Tip 2**: Description

### Troubleshooting
**Problem**: Common issue
**Solution**: How to resolve it

**Problem**: Another issue
**Solution**: Resolution steps

### FAQs
**Q**: Common question?
**A**: Answer with details.
```

## Documentation Standards

### Writing Style
- **Clear and Concise**: Use simple, direct language
- **Active Voice**: "The service starts the timer" not "The timer is started by the service"
- **Present Tense**: "Returns a list" not "Will return a list"
- **Consistent Terminology**: Use the same terms throughout
  - "Time Entry" (not "time log" or "time record")
  - "Customer" (not "client")
  - "Project" (not "job")
  - "Task" (not "activity")

### Code Examples
- Include complete, runnable examples
- Use realistic data (not foo/bar)
- Show both success and error cases when relevant
- Include necessary imports/using statements
- Format code properly

### Formatting
- Use markdown formatting consistently
- Use code blocks with language specification: ```csharp
- Use headers hierarchically (don't skip levels)
- Use bullet points for lists
- Use numbered lists for sequential steps
- Use tables for structured data

### Completeness Checklist
- [ ] Purpose clearly stated
- [ ] Prerequisites listed
- [ ] Step-by-step instructions provided
- [ ] Code examples included
- [ ] Error cases documented
- [ ] Screenshots for UI features
- [ ] Links to related documentation
- [ ] Examples are tested and working
- [ ] Terminology is consistent
- [ ] Grammar and spelling checked

## What to Document

### Always Document
1. **Public APIs**: All public classes and methods
2. **Complex Logic**: Any non-obvious code
3. **Business Rules**: Special constraints or requirements
4. **Configuration**: Settings and their effects
5. **Breaking Changes**: Changes that affect existing users
6. **Migration Guides**: How to upgrade from old versions
7. **Known Issues**: Current limitations or bugs
8. **Workarounds**: Temporary solutions to known issues

### Don't Over-Document
- Self-explanatory code doesn't need comments
- Framework features don't need explanation
- Obvious setters/getters don't need XML comments
- Implementation details that might change

## Documentation Types

### 1. README.md
Primary documentation for the repository:
- Project overview
- Features list
- Installation instructions
- Quick start guide
- API endpoint summary
- Technology stack
- Project structure
- Contributing guide link
- License information

### 2. API Documentation
Detailed API reference:
- All endpoints documented
- Request/response examples
- Error codes explained
- Authentication requirements (if any)
- Rate limiting (if any)
- Versioning information

### 3. Code Comments
In-code documentation:
- XML documentation for public APIs
- Inline comments for complex logic
- TODO comments for future work
- WARNING comments for important constraints

### 4. Architecture Documentation
High-level design:
- System components
- Data flow diagrams
- Design patterns used
- Technology decisions
- Scalability considerations

### 5. Contributing Guide
For contributors:
- Development setup
- Code style guide
- Testing requirements
- Pull request process
- Issue templates

### 6. User Guide
For end users:
- Feature walkthroughs
- Common workflows
- Best practices
- Tips and tricks
- Troubleshooting

## Examples

### Example 1: Documenting a New Feature
```
I need help documenting a new export feature:

## Documentation Type
**Type**: API Documentation + README Update
**Scope**: New CSV/XLSX export endpoints
**Audience**: Developers and end users

## Requirements
Document the following new endpoints:
- GET /api/export/csv
- GET /api/export/xlsx

Include:
- Complete API documentation with examples
- Update README.md features section
- Add usage examples

[Provide the code to be documented]
```

### Example 2: Adding XML Comments
```
I need XML documentation comments for the following service:

## Documentation Type
**Type**: Code Comments (XML)
**Audience**: Developers

[Paste the code that needs documentation]

Please add comprehensive XML comments following C# standards.
```

### Example 3: Creating User Guide
```
I need a user guide for the timer feature:

## Documentation Type
**Type**: User Guide
**Scope**: Timer functionality (start, stop, view running timer)
**Audience**: End users (non-technical)

Please create a step-by-step guide with:
- How to start a timer
- How to stop a timer
- How to view running timer
- Common issues and solutions
```

## Review Checklist

Before finalizing documentation:
- [ ] **Accuracy**: All information is correct
- [ ] **Completeness**: All necessary topics covered
- [ ] **Clarity**: Easy to understand for target audience
- [ ] **Examples**: Code examples work correctly
- [ ] **Consistency**: Terminology and style consistent
- [ ] **Links**: All links work correctly
- [ ] **Grammar**: No spelling or grammar errors
- [ ] **Format**: Properly formatted markdown
- [ ] **Screenshots**: Up-to-date if UI has changed
- [ ] **Version**: Correct version information

## Deliverables

Please provide:
1. **Documentation content** in the appropriate format
2. **Code examples** that are tested and working
3. **Placement recommendations** where the documentation should go
4. **Related updates** if other docs need changes
5. **Review notes** any considerations or limitations

## Additional Context
[Add specific requirements, examples to follow, or areas needing special attention]

Please create comprehensive documentation following the guidelines above.
```

---

## Tips for Great Documentation

1. **Write for your audience** - Technical level appropriate to readers
2. **Show, don't just tell** - Include examples and screenshots
3. **Keep it current** - Update docs when code changes
4. **Be consistent** - Same terms, same style throughout
5. **Test your examples** - Make sure code examples actually work
6. **Link related docs** - Help readers find more information
7. **Explain the "why"** - Not just what it does, but why
8. **Consider maintenance** - Don't document implementation details that change frequently

## Common Documentation Mistakes to Avoid

1. **Outdated examples** - Always test code examples
2. **Missing error cases** - Document what can go wrong
3. **Assumed knowledge** - Don't assume readers know everything
4. **Too much detail** - Don't document every getter/setter
5. **Wrong audience** - Match technical level to readers
6. **No examples** - Always include practical examples
7. **Broken links** - Check links work
8. **Inconsistent terminology** - Use same terms throughout
