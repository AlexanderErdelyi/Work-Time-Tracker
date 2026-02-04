# AI Prompts for Timekeeper Development

This directory contains reusable AI prompts for common development tasks in the Timekeeper project. These prompts are designed to help maintain consistency and quality across contributions.

## Available Prompts

### Development Prompts
- **code-review.md**: Comprehensive code review checklist and guidelines
- **feature-development.md**: Template for developing new features
- **bug-fixing.md**: Systematic approach to debugging and fixing issues
- **testing.md**: Test creation and validation guidelines
- **documentation.md**: Documentation standards and templates

### How to Use These Prompts

1. **Copy the relevant prompt**: Select the prompt that matches your task
2. **Fill in the specific details**: Replace placeholders with your specific requirements
3. **Provide context**: Include relevant code snippets, file paths, or issue numbers
4. **Iterate**: Use the AI's response to refine your implementation

## Prompt Structure

Each prompt includes:
- **Objective**: Clear goal of the task
- **Context**: Background information about the codebase
- **Requirements**: Specific criteria to meet
- **Constraints**: Limitations and guidelines to follow
- **Output Format**: Expected format of the response

## Best Practices

### When Using AI Prompts
1. **Be Specific**: Provide exact file paths, method names, and requirements
2. **Include Context**: Share relevant code snippets and architectural decisions
3. **Set Constraints**: Specify coding standards, patterns, and limitations
4. **Ask for Tests**: Always request test cases for new functionality
5. **Request Documentation**: Ask for XML comments and README updates

### Quality Guidelines
- Follow the existing code style and patterns in the repository
- Ensure backward compatibility unless specifically breaking
- Write comprehensive tests with good coverage
- Update documentation for any API changes
- Consider performance and security implications

## Example Usage

### Feature Development Example
```
Using the feature-development.md prompt, I want to add the following:

Feature: Add ability to filter time entries by date range

Context:
- Current file: Timekeeper.Api/Controllers/TimeEntriesController.cs
- Related service: Timekeeper.Core/Services/TimeEntryService.cs
- Database context: Timekeeper.Core/Data/TimekeeperContext.cs

Requirements:
- Add query parameters: startDate and endDate
- Filter time entries between these dates (inclusive)
- Return filtered results with existing pagination
- Maintain backward compatibility (optional parameters)

Please implement this feature following the existing patterns in the codebase.
```

## Contributing

If you find these prompts helpful or have suggestions for improvement:
1. Test the prompts on various tasks
2. Note what works well and what could be improved
3. Submit a PR with enhancements
4. Share your experience in the issue tracker

## Feedback

We welcome feedback on these prompts! If you have:
- Improvements to existing prompts
- Ideas for new prompts
- Examples of successful usage
- Issues or challenges

Please open an issue with the label 'prompts' or submit a PR.
