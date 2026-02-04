# Code Review Prompt for Timekeeper

## Overview
Use this prompt to conduct comprehensive code reviews for the Timekeeper time tracking application. This ensures consistency, quality, and adherence to project standards.

---

## Prompt Template

```
I need you to perform a comprehensive code review for the following changes in the Timekeeper project:

## Context
- **Project**: Timekeeper - C# .NET 8 time tracking application
- **Technology Stack**: ASP.NET Core 8.0, Entity Framework Core, SQLite, xUnit
- **Files Changed**: [List the files that were modified]
- **Type of Change**: [Bug fix / New feature / Refactoring / Documentation]
- **Related Issue**: [Issue number if applicable]

## Code to Review
[Paste the code changes here or provide file paths]

## Review Criteria

### 1. Code Quality
- [ ] Follows C# coding conventions and style guidelines
- [ ] Uses meaningful variable and method names
- [ ] Code is DRY (Don't Repeat Yourself)
- [ ] Methods are small and focused on single responsibility
- [ ] Proper error handling and validation
- [ ] No hardcoded values (uses configuration where appropriate)
- [ ] Comments explain "why" not "what" for complex logic

### 2. Architecture & Design
- [ ] Follows existing project structure:
  - Timekeeper.Core: Domain models, data access, business logic
  - Timekeeper.Api: Controllers, DTOs, API services
  - Timekeeper.Tests: Test files
- [ ] Proper separation of concerns
- [ ] Uses dependency injection appropriately
- [ ] DTOs used for API contracts (not domain models directly)
- [ ] Repository pattern followed for data access
- [ ] Service layer contains business logic

### 3. API Design (if applicable)
- [ ] RESTful endpoint design
- [ ] Proper HTTP verbs (GET, POST, PUT, DELETE)
- [ ] Appropriate status codes (200, 201, 400, 404, etc.)
- [ ] Consistent naming conventions
- [ ] Proper validation with model state
- [ ] Returns appropriate DTOs
- [ ] Swagger/OpenAPI documentation included

### 4. Database & Entity Framework
- [ ] Proper entity relationships defined
- [ ] Database migrations included if schema changes
- [ ] Efficient queries (no N+1 problems)
- [ ] Proper use of async/await for database operations
- [ ] Appropriate indexes for performance
- [ ] Proper handling of database constraints

### 5. Testing
- [ ] Unit tests included for new functionality
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] Test names clearly describe what is being tested
- [ ] Both success and failure cases covered
- [ ] Integration tests for API endpoints
- [ ] Test coverage is adequate
- [ ] All existing tests still pass

### 6. Security
- [ ] No SQL injection vulnerabilities (using parameterized queries)
- [ ] Input validation on all user inputs
- [ ] No sensitive data in logs or error messages
- [ ] Proper exception handling (no information leakage)
- [ ] No secrets or credentials in code

### 7. Performance
- [ ] Async/await used for I/O operations
- [ ] Proper use of IQueryable vs IEnumerable
- [ ] Pagination implemented for large result sets
- [ ] No unnecessary database calls
- [ ] Efficient LINQ queries

### 8. Error Handling
- [ ] Exceptions are caught and handled appropriately
- [ ] User-friendly error messages
- [ ] Proper logging of errors
- [ ] No swallowed exceptions
- [ ] Validation errors return proper status codes

### 9. Documentation
- [ ] XML documentation comments for public APIs
- [ ] README.md updated if needed
- [ ] API documentation accurate
- [ ] Complex logic explained with comments
- [ ] Breaking changes documented

### 10. Backward Compatibility
- [ ] No breaking changes to existing APIs (unless intentional)
- [ ] Database migrations are reversible
- [ ] Existing functionality still works
- [ ] Configuration changes documented

## Review Instructions

Please review the code against all criteria above and provide:

1. **Summary**: Overall assessment of the changes
2. **Issues Found**: List any problems, organized by severity:
   - 🔴 **Critical**: Must be fixed before merge
   - 🟡 **Important**: Should be fixed before merge
   - 🔵 **Minor**: Consider fixing, but not blocking
   - 💡 **Suggestion**: Nice-to-have improvements
3. **Positive Feedback**: What was done well
4. **Recommendations**: Specific suggestions for improvement with code examples
5. **Test Coverage**: Assessment of testing adequacy
6. **Security Considerations**: Any security concerns
7. **Performance Impact**: Potential performance implications
8. **Overall Recommendation**: Approve / Request Changes / Comment

## Additional Context
[Add any specific areas of concern or questions you have about the changes]

Please be thorough but constructive in your review.
```

---

## Example Usage

### Example 1: Reviewing a Bug Fix
```
I need you to perform a comprehensive code review for the following bug fix in Timekeeper:

## Context
- Files Changed: Timekeeper.Api/Controllers/TimeEntriesController.cs, Timekeeper.Core/Services/TimeEntryService.cs
- Type of Change: Bug fix
- Related Issue: #45 - Timer not stopping correctly when end time is manually set

## Code to Review
[Include the actual code changes]

[Continue with the full prompt above]
```

### Example 2: Reviewing a New Feature
```
I need a code review for a new feature:

## Context
- Files Changed: 
  - Timekeeper.Api/Controllers/ReportsController.cs (new)
  - Timekeeper.Core/Services/ReportService.cs (new)
  - Timekeeper.Tests/Services/ReportServiceTests.cs (new)
- Type of Change: New feature - Monthly time report generation
- Related Issue: #67

[Continue with the full prompt above]
```

## Tips for Effective Reviews

1. **Run the code locally** before reviewing
2. **Test the changes** manually if possible
3. **Check for edge cases** that might not be covered
4. **Consider maintainability** - will others understand this code in 6 months?
5. **Think about scalability** - will this work with larger datasets?
6. **Review tests carefully** - do they actually test what they claim?
7. **Check documentation** - is it accurate and helpful?

## Common Issues to Watch For

### In Timekeeper Specifically
- Timer logic: Ensure no parallel timers and proper state management
- Date/time handling: Check timezone considerations
- Cascade deletes: Ensure related entities are properly handled
- Export functionality: Verify data integrity in CSV/XLSX exports
- Filtering: Test edge cases in date range and entity filters
- Aggregations: Verify daily/weekly totals are calculated correctly

## After the Review

1. **Discuss findings** with the author
2. **Prioritize issues** - what must be fixed vs. nice-to-have
3. **Re-review** if significant changes are made
4. **Approve** once all critical issues are resolved
