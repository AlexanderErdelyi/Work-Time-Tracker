# .github Directory

This directory contains GitHub-specific configuration files, templates, and reusable resources for the Timekeeper project.

## Contents

### 📋 Templates

#### Issue Templates (`ISSUE_TEMPLATE/`)
Pre-formatted templates for creating different types of issues:
- **bug_report.md** - Report bugs and unexpected behavior
- **feature_request.md** - Suggest new features or enhancements
- **question.md** - Ask questions or get help with the project

#### Pull Request Template
- **PULL_REQUEST_TEMPLATE.md** - Standard template for all pull requests

### 📖 Documentation

- **CONTRIBUTING.md** - Comprehensive guide for contributing to the project
  - Development setup
  - Coding standards
  - Submission guidelines
  - Testing requirements

- **SECURITY.md** - Security policy and vulnerability reporting guidelines
  - Supported versions
  - How to report vulnerabilities
  - Security best practices
  - Response timeline

### 🤖 AI Prompts (`prompts/`)
Reusable prompts for AI-assisted development tasks:

- **code-review.md** - Comprehensive code review checklist
- **feature-development.md** - Template for developing new features
- **bug-fixing.md** - Systematic debugging approach
- **testing.md** - Test creation guidelines
- **documentation.md** - Documentation standards

See [prompts/README.md](prompts/README.md) for detailed usage instructions.

### ⚙️ Workflows (`workflows/`)
GitHub Actions workflow examples (not active by default):
- CI/CD examples
- PR validation
- Code coverage reporting

See [workflows/README.md](workflows/README.md) for setup instructions.

## Quick Links

### For Contributors
1. Start with [CONTRIBUTING.md](CONTRIBUTING.md) to understand the contribution process
2. Use issue templates when reporting bugs or requesting features
3. Follow the PR template when submitting changes
4. Refer to AI prompts for guidance on common tasks

### For Maintainers
1. Review [SECURITY.md](SECURITY.md) for handling security issues
2. Use PR template to ensure consistent reviews
3. Leverage AI prompts for code reviews and testing
4. Consider enabling GitHub Actions workflows

### For Users
1. Use issue templates to report bugs or request features
2. Check existing issues before creating new ones
3. Review [SECURITY.md](SECURITY.md) for security concerns

## Using Issue Templates

When creating a new issue, GitHub will present you with the available templates:

1. **Bug Report** - For reporting defects
   - Includes: Steps to reproduce, environment details, error logs
   - Use when: Something doesn't work as expected

2. **Feature Request** - For suggesting enhancements
   - Includes: Problem statement, proposed solution, use cases
   - Use when: You have an idea for improvement

3. **Question** - For asking questions
   - Includes: Question context, what you've tried
   - Use when: You need help or clarification

## Using AI Prompts

The `prompts/` directory contains templates for AI-assisted development:

### Example: Code Review
```
1. Open prompts/code-review.md
2. Copy the template
3. Fill in your specific details (files changed, type of change)
4. Paste into your AI assistant
5. Review the feedback and address issues
```

### Example: Feature Development
```
1. Open prompts/feature-development.md
2. Describe your feature using the template
3. Follow the step-by-step implementation guide
4. Use the validation checklist before submitting
```

### Benefits
- **Consistency** - Same standards across all contributions
- **Completeness** - Don't miss important steps
- **Quality** - Comprehensive checklists and guidelines
- **Learning** - Understand best practices

## Customizing Templates

You can modify these templates to fit your workflow:

1. **Issue Templates** - Edit files in `ISSUE_TEMPLATE/`
2. **PR Template** - Edit `PULL_REQUEST_TEMPLATE.md`
3. **AI Prompts** - Adapt prompts in `prompts/` directory

After making changes, commit them to the repository to make them available to all contributors.

## Contributing to Templates

If you find ways to improve these templates:

1. Test your changes
2. Update relevant documentation
3. Submit a PR with your improvements
4. Explain the benefits of your changes

## Additional Resources

- [GitHub Issue Templates Documentation](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
- [GitHub Pull Request Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories)

## Structure Overview

```
.github/
├── README.md (this file)
├── CONTRIBUTING.md
├── SECURITY.md
├── PULL_REQUEST_TEMPLATE.md
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   ├── feature_request.md
│   └── question.md
├── prompts/
│   ├── README.md
│   ├── code-review.md
│   ├── feature-development.md
│   ├── bug-fixing.md
│   ├── testing.md
│   └── documentation.md
└── workflows/
    └── README.md (examples, not active)
```

## Questions?

If you have questions about any of these templates or guidelines:
- Open an issue with the "question" template
- Refer to CONTRIBUTING.md for contribution guidelines
- Check the README.md in subdirectories for specific help

---

**Note**: These templates and guidelines are living documents. Feel free to suggest improvements!
