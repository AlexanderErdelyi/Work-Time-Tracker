# Bug Fixing Prompt for Timekeeper

## Overview
Use this prompt to systematically debug and fix issues in the Timekeeper time tracking application.

---

## Prompt Template

```
I need help fixing a bug in the Timekeeper project:

## Bug Information
**Bug ID**: [Issue number]
**Title**: [Brief description of the bug]
**Severity**: [Critical / High / Medium / Low]
**Reported By**: [Username or source]
**Date Reported**: [Date]

## Bug Description
[Detailed description of what's wrong]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Observed incorrect behavior]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Error Messages/Logs
```
[Paste any error messages, stack traces, or relevant logs]
```

## Environment
- **OS**: [e.g., Windows 11, macOS 14, Ubuntu 22.04]
- **.NET Version**: [e.g., 8.0.1]
- **Browser** (if applicable): [e.g., Chrome 120]
- **Database**: SQLite
- **Timekeeper Version**: [Commit hash or version]

## Affected Areas
- [ ] Frontend (wwwroot/)
- [ ] API Controllers (Timekeeper.Api/Controllers/)
- [ ] Business Logic (Timekeeper.Core/Services/)
- [ ] Data Layer (Timekeeper.Core/Data/)
- [ ] Models (Timekeeper.Core/Models/)
- [ ] Other: [Specify]

## Investigation Steps

### 1. Reproduce the Bug
- [ ] Set up the exact environment described
- [ ] Follow the reproduction steps exactly
- [ ] Confirm the bug exists
- [ ] Document additional observations

### 2. Identify the Root Cause
- [ ] Review error messages and stack traces
- [ ] Check recent changes (git log)
- [ ] Add logging/debugging to narrow down the issue
- [ ] Review related code sections
- [ ] Check database state if applicable
- [ ] Test edge cases

### 3. Analyze Impact
- [ ] Determine which features are affected
- [ ] Check if this is a regression (did it work before?)
- [ ] Identify any related issues
- [ ] Assess data integrity concerns
- [ ] Consider security implications

### 4. Develop Fix
Follow these guidelines:
- **Minimal changes**: Fix only what's broken
- **Root cause**: Address the underlying issue, not symptoms
- **Backward compatible**: Don't break existing functionality
- **Well-tested**: Include tests that verify the fix

## Common Bug Categories in Timekeeper

### Timer Issues
**Symptoms**: Timer not starting/stopping, parallel timers, incorrect duration
**Likely locations**:
- `Timekeeper.Core/Services/TimeEntryService.cs` - Timer logic
- `Timekeeper.Api/Controllers/TimeEntriesController.cs` - Timer endpoints
- `Timekeeper.Api/wwwroot/app.js` - Frontend timer management

**Check for**:
- Race conditions in start/stop operations
- Incorrect state management (IsRunning flag)
- Time zone handling issues
- Null/undefined checks in JavaScript

### Data Integrity Issues
**Symptoms**: Missing data, incorrect totals, broken relationships
**Likely locations**:
- `Timekeeper.Core/Data/TimekeeperContext.cs` - Entity relationships
- `Timekeeper.Core/Services/*Service.cs` - CRUD operations
- Database migrations

**Check for**:
- Cascade delete problems
- Missing foreign key constraints
- Incorrect relationship configurations
- Orphaned records

### API Response Issues
**Symptoms**: Wrong status codes, missing data in responses, errors not handled
**Likely locations**:
- `Timekeeper.Api/Controllers/*Controller.cs` - API endpoints
- `Timekeeper.Api/DTOs/` - Data transfer objects

**Check for**:
- Missing null checks
- Incorrect ModelState validation
- Wrong HTTP status codes
- Missing try-catch blocks
- DTO mapping errors

### Query Performance Issues
**Symptoms**: Slow responses, timeouts, high memory usage
**Likely locations**:
- `Timekeeper.Core/Services/*Service.cs` - Database queries

**Check for**:
- N+1 query problems
- Missing pagination
- Inefficient LINQ queries
- Missing database indexes
- Loading unnecessary data (use .Select() projections)

### Export Issues
**Symptoms**: Incorrect data in CSV/XLSX, formatting problems, missing data
**Likely locations**:
- `Timekeeper.Api/Services/CsvExportService.cs`
- `Timekeeper.Api/Services/ExcelExportService.cs`
- `Timekeeper.Api/Controllers/ExportController.cs`

**Check for**:
- Date formatting inconsistencies
- Missing null checks
- Character encoding issues
- Excel formula errors

### Frontend Issues
**Symptoms**: UI not updating, incorrect display, JavaScript errors
**Likely locations**:
- `Timekeeper.Api/wwwroot/app.js` - JavaScript logic
- `Timekeeper.Api/wwwroot/index.html` - HTML structure
- `Timekeeper.Api/wwwroot/styles.css` - Styling

**Check for**:
- Async/await issues in JavaScript
- DOM manipulation errors
- Event listener problems
- State synchronization issues
- Browser console errors

## Fix Implementation

### Code Changes
Provide the fix with:
1. **Explanation** of what was wrong
2. **Root cause** analysis
3. **The fix** with code changes
4. **Why this fixes it** - explanation of the solution

Example format:
```csharp
// BEFORE (buggy code)
public async Task<TimeEntry> StopTimer(int id)
{
    var entry = await _context.TimeEntries.FindAsync(id);
    entry.EndTime = DateTime.Now; // BUG: Not UTC
    await _context.SaveChangesAsync();
    return entry;
}

// AFTER (fixed code)
public async Task<TimeEntry> StopTimer(int id)
{
    var entry = await _context.TimeEntries.FindAsync(id);
    if (entry == null)
        throw new ArgumentException($"Time entry {id} not found");
    
    if (!entry.IsRunning)
        throw new InvalidOperationException("Timer is not running");
    
    entry.EndTime = DateTime.UtcNow; // FIXED: Use UTC
    entry.IsRunning = false; // FIXED: Update running state
    await _context.SaveChangesAsync();
    return entry;
}
```

### Testing the Fix

#### 1. Create Regression Test
Create a test that fails before the fix and passes after:
```csharp
[Fact]
public async Task StopTimer_WhenTimerNotRunning_ThrowsException()
{
    // Arrange
    var context = GetInMemoryContext();
    var service = new TimeEntryService(context);
    var entry = new TimeEntry { Id = 1, IsRunning = false };
    context.TimeEntries.Add(entry);
    await context.SaveChangesAsync();
    
    // Act & Assert
    await Assert.ThrowsAsync<InvalidOperationException>(
        () => service.StopTimer(1)
    );
}

[Fact]
public async Task StopTimer_UsesUtcTime()
{
    // Arrange
    var context = GetInMemoryContext();
    var service = new TimeEntryService(context);
    var startTime = DateTime.UtcNow.AddHours(-1);
    var entry = new TimeEntry { 
        Id = 1, 
        StartTime = startTime, 
        IsRunning = true 
    };
    context.TimeEntries.Add(entry);
    await context.SaveChangesAsync();
    
    // Act
    var result = await service.StopTimer(1);
    
    // Assert
    Assert.NotNull(result.EndTime);
    Assert.Equal(DateTimeKind.Utc, result.EndTime.Value.Kind);
}
```

#### 2. Manual Testing
- [ ] Verify the exact reproduction steps no longer cause the issue
- [ ] Test related functionality to ensure nothing broke
- [ ] Test edge cases
- [ ] Verify the fix works across different browsers/environments

#### 3. Verify No Regressions
```bash
dotnet test
```
- [ ] All existing tests still pass
- [ ] No new warnings introduced
- [ ] No performance degradation

## Documentation

### Update Comments
If the bug was due to unclear code, add comments:
```csharp
// We use UTC throughout to avoid timezone conversion issues
// when exporting data or displaying across different locales
entry.EndTime = DateTime.UtcNow;
```

### Update Documentation
If the bug revealed unclear behavior:
- [ ] Update XML documentation
- [ ] Add to README if it affects users
- [ ] Document the workaround if temporary

### Bug Report Update
Update the original issue with:
- Root cause explanation
- Fix description
- Test cases added
- Related issues found

## Validation Checklist

- [ ] Bug is fully reproducible before fix
- [ ] Fix addresses root cause, not symptoms
- [ ] All reproduction steps now work correctly
- [ ] Regression test added that would catch this bug
- [ ] All existing tests pass
- [ ] No new warnings or errors
- [ ] Edge cases considered and tested
- [ ] Code follows project conventions
- [ ] Documentation updated if needed
- [ ] No breaking changes introduced
- [ ] Performance not negatively impacted
- [ ] Security not compromised

## Deliverables

Please provide:
1. **Root cause analysis**: What caused the bug
2. **The fix**: Code changes with explanations
3. **Tests**: Regression tests that verify the fix
4. **Verification**: Evidence that the bug is fixed
5. **Impact assessment**: What else might be affected
6. **Documentation**: Any necessary updates

## Additional Context
[Add any additional information, theories, or context]

Please investigate and fix this bug following the systematic approach above.
```

---

## Example Usage

### Example 1: Timer Bug
```
I need help fixing a bug in the Timekeeper project:

## Bug Information
**Bug ID**: #123
**Title**: Timer continues running after stopping
**Severity**: High
**Reported By**: User feedback

## Bug Description
When a user stops a timer, the UI shows it as stopped but the database still shows IsRunning=true. If the user refreshes the page, the timer appears to still be running.

## Steps to Reproduce
1. Start a timer for any task
2. Wait 1-2 minutes
3. Click "Stop Timer" button
4. Refresh the page
5. Timer still shows as running

## Expected Behavior
After stopping the timer, it should remain stopped even after page refresh.

## Actual Behavior
Timer appears stopped initially but shows as running after refresh.

[Continue with the full template]
```

### Example 2: Export Bug
```
I need help fixing a bug in the Timekeeper project:

## Bug Information
**Bug ID**: #145
**Title**: XLSX export missing time entries
**Severity**: Medium

## Bug Description
When exporting time entries to XLSX with date filters, some entries within the date range are missing from the export.

[Continue with the full template]
```

## Debugging Techniques

### For Backend Issues
```csharp
// Add detailed logging
_logger.LogInformation($"Stopping timer {id} at {DateTime.UtcNow}");
_logger.LogDebug($"Entry state before: IsRunning={entry.IsRunning}");

// Use debugger breakpoints
// Set breakpoints in Visual Studio/VS Code

// Check database state
var entries = await _context.TimeEntries.ToListAsync();
_logger.LogInformation($"Total entries: {entries.Count}, Running: {entries.Count(e => e.IsRunning)}");
```

### For Frontend Issues
```javascript
// Add console logging
console.log('Timer state:', timerState);
console.log('API response:', response);

// Use browser developer tools
// Set breakpoints in browser debugger
// Check Network tab for API calls
// Check Console for errors
```

### For Database Issues
```sql
-- Query SQLite directly
SELECT * FROM TimeEntries WHERE IsRunning = 1;
SELECT * FROM TimeEntries WHERE EndTime IS NULL;

-- Check relationships
SELECT te.*, t.Name as TaskName, p.Name as ProjectName
FROM TimeEntries te
LEFT JOIN Tasks t ON te.TaskId = t.Id
LEFT JOIN Projects p ON t.ProjectId = p.Id;
```

## Tips for Effective Bug Fixing

1. **Reproduce first** - Never start fixing until you can reproduce
2. **Understand the root cause** - Don't just fix symptoms
3. **Test the fix** - Verify it actually works
4. **Add regression tests** - Prevent the bug from coming back
5. **Check for similar bugs** - Fix related issues while you're there
6. **Keep changes minimal** - Only fix what's broken
7. **Document your findings** - Help others learn from this bug
