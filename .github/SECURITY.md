# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Timekeeper seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Open a Public Issue
Please **do not** open a public GitHub issue for security vulnerabilities. Public disclosure could put users at risk.

### 2. Report Privately
Send your report to the repository maintainer directly via:
- GitHub Security Advisories (preferred): Use the "Security" tab → "Report a vulnerability"
- Email: [Open an issue with label 'security-question' for contact information]

### 3. Include Details
Please include the following in your report:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information for follow-up

### 4. Response Timeline
- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies based on severity
  - Critical: Within 7 days
  - High: Within 30 days
  - Medium: Within 90 days
  - Low: Next release cycle

## Security Best Practices for Users

### General Recommendations
1. **Keep Updated**: Always use the latest version of Timekeeper
2. **Secure Deployment**: Use HTTPS in production environments
3. **Access Control**: Implement proper authentication and authorization
4. **Database Security**: Secure your SQLite database file with appropriate file permissions
5. **Environment Variables**: Store sensitive configuration in environment variables, not in code

### Development Security
1. **Dependencies**: Regularly update NuGet packages to get security patches
2. **Code Review**: Review all changes before merging
3. **Testing**: Run security tests before deployment

### Known Security Considerations

#### Data Storage
- The application uses SQLite for data storage
- Ensure the database file has appropriate file system permissions
- In production, consider database encryption for sensitive data

#### API Security
- The API currently does not include authentication
- For production use, implement proper authentication and authorization
- Consider rate limiting to prevent abuse

#### Input Validation
- All user inputs are validated at the API level
- Entity Framework Core provides parameterized queries to prevent SQL injection

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Updates will be announced through:
- GitHub Security Advisories
- Release notes
- README.md updates

## Vulnerability Disclosure Policy

When a security vulnerability is reported:
1. We will confirm receipt of your report
2. We will investigate and validate the vulnerability
3. We will develop and test a fix
4. We will release the fix and publicly disclose the vulnerability after users have had time to update
5. We will credit the reporter (if desired) in the security advisory and release notes

## Security Hall of Fame

We appreciate security researchers who help keep Timekeeper safe:
<!-- List of contributors who have responsibly disclosed vulnerabilities -->

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [.NET Security Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/security/)
- [ASP.NET Core Security](https://learn.microsoft.com/en-us/aspnet/core/security/)

## Questions?

If you have questions about this security policy, please open an issue with the 'security-question' label.
