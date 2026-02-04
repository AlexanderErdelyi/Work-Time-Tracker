# Contributing to Timekeeper

Thank you for your interest in contributing to Timekeeper! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. **Fork the Repository**
   - Fork the repository to your own GitHub account
   - Clone your fork locally:
     ```bash
     git clone https://github.com/YOUR-USERNAME/Work-Time-Tracker.git
     cd Work-Time-Tracker
     ```

2. **Set Up Development Environment**
   - Install .NET 8.0 SDK or later
   - Build the solution:
     ```bash
     dotnet build
     ```
   - Run tests to verify setup:
     ```bash
     dotnet test
     ```

3. **Create a Branch**
   - Create a new branch for your work:
     ```bash
     git checkout -b feature/your-feature-name
     ```
   - Use descriptive branch names:
     - `feature/` for new features
     - `bugfix/` for bug fixes
     - `docs/` for documentation changes
     - `refactor/` for code refactoring

## Development Process

1. **Check Existing Issues**
   - Look for existing issues related to your contribution
   - Comment on the issue to let others know you're working on it
   - If no issue exists, create one first to discuss the change

2. **Make Your Changes**
   - Keep changes focused and atomic
   - Follow the existing code style and patterns
   - Write clean, maintainable code
   - Add comments for complex logic

3. **Write Tests**
   - Add unit tests for new functionality
   - Ensure all existing tests still pass
   - Aim for good test coverage

4. **Update Documentation**
   - Update README.md if needed
   - Add XML documentation comments to public APIs
   - Update API documentation for endpoint changes

## Coding Standards

### C# Guidelines
- Follow Microsoft's [C# Coding Conventions](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- Use meaningful variable and method names
- Keep methods small and focused
- Use async/await for asynchronous operations
- Handle exceptions appropriately

### Code Style
```csharp
// Good naming conventions
public class CustomerService
{
    private readonly ICustomerRepository _repository;
    
    public async Task<Customer> GetCustomerAsync(int id)
    {
        // Implementation
    }
}

// Use LINQ for readability
var activeProjects = projects
    .Where(p => p.IsActive)
    .OrderBy(p => p.Name)
    .ToList();
```

### Project Structure
- **Timekeeper.Core**: Domain models, services, and data access
- **Timekeeper.Api**: Controllers, DTOs, and API-specific services
- **Timekeeper.Tests**: All test files

## Submitting Changes

1. **Commit Your Changes**
   - Write clear, descriptive commit messages
   - Use the present tense ("Add feature" not "Added feature")
   - Reference issue numbers in commits: "Fix #123: Description"
   ```bash
   git commit -m "Add customer filtering by status"
   ```

2. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template completely
   - Link any related issues

4. **Code Review**
   - Address feedback from reviewers
   - Push additional commits to the same branch
   - Participate in the discussion

## Testing

### Running Tests
```bash
# Run all tests
dotnet test

# Run specific test project
dotnet test Timekeeper.Tests/Timekeeper.Tests.csproj

# Run with coverage
dotnet test /p:CollectCoverage=true
```

### Writing Tests
- Use xUnit framework
- Follow Arrange-Act-Assert pattern
- Use descriptive test names
- Test both success and failure scenarios

Example:
```csharp
[Fact]
public async Task GetCustomerAsync_WithValidId_ReturnsCustomer()
{
    // Arrange
    var service = CreateService();
    
    // Act
    var result = await service.GetCustomerAsync(1);
    
    // Assert
    Assert.NotNull(result);
    Assert.Equal("Test Customer", result.Name);
}
```

## Documentation

### Code Documentation
- Add XML comments to public classes and methods
- Explain the "why" not just the "what"
- Document parameters, return values, and exceptions

### API Documentation
- Use Swagger/OpenAPI comments
- Update API endpoint documentation for any changes

### README Updates
- Update features list for new capabilities
- Add new API endpoints to the documentation
- Update screenshots if UI changes

## Questions?

If you have questions or need help:
- Open a [Discussion](https://github.com/AlexanderErdelyi/Work-Time-Tracker/discussions)
- Create an issue with the "question" label
- Refer to the [README.md](../README.md) for project details

Thank you for contributing! 🎉
