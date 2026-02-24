using System.DirectoryServices.Protocols;
using System.Net;

namespace Timekeeper.Api.Services;

public class WindowsCredentialsOptions
{
    public bool Enabled { get; set; }
    public string LdapHost { get; set; } = string.Empty;
    public int LdapPort { get; set; } = 636;
    public bool UseLdaps { get; set; } = true;
    public string DefaultDomain { get; set; } = string.Empty;
    public int ConnectTimeoutSeconds { get; set; } = 10;
}

public record WindowsDirectoryAuthResult(
    bool Success,
    string? Error,
    string? Domain,
    string? Username,
    string? DisplayName,
    string? Email,
    string? ExternalUserId);

public interface IWindowsDirectoryAuthService
{
    bool IsEnabled { get; }
    Task<WindowsDirectoryAuthResult> ValidateCredentialsAsync(
        string usernameOrDomainUser,
        string password,
        string? domain,
        CancellationToken cancellationToken = default);
}

public class WindowsDirectoryAuthService : IWindowsDirectoryAuthService
{
    private readonly WindowsCredentialsOptions _options;

    public WindowsDirectoryAuthService(IConfiguration configuration)
    {
        _options = configuration.GetSection("Authentication:WindowsCredentials").Get<WindowsCredentialsOptions>()
            ?? new WindowsCredentialsOptions();
    }

    public bool IsEnabled =>
        _options.Enabled
        && !string.IsNullOrWhiteSpace(_options.LdapHost)
        && _options.LdapPort > 0;

    public Task<WindowsDirectoryAuthResult> ValidateCredentialsAsync(
        string usernameOrDomainUser,
        string password,
        string? domain,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return Task.FromResult(new WindowsDirectoryAuthResult(
                false,
                "Windows credentials login is not configured on this server.",
                null,
                null,
                null,
                null,
                null));
        }

        if (string.IsNullOrWhiteSpace(usernameOrDomainUser) || string.IsNullOrWhiteSpace(password))
        {
            return Task.FromResult(new WindowsDirectoryAuthResult(
                false,
                "Username and password are required.",
                null,
                null,
                null,
                null,
                null));
        }

        var normalized = ResolveIdentity(usernameOrDomainUser.Trim(), domain?.Trim());
        if (!normalized.Success)
        {
            return Task.FromResult(new WindowsDirectoryAuthResult(
                false,
                normalized.Error,
                null,
                null,
                null,
                null,
                null));
        }

        try
        {
            var identifier = new LdapDirectoryIdentifier(_options.LdapHost, _options.LdapPort, true, false);
            using var connection = new LdapConnection(identifier)
            {
                AuthType = AuthType.Negotiate,
                Timeout = TimeSpan.FromSeconds(Math.Max(3, _options.ConnectTimeoutSeconds)),
                Credential = new NetworkCredential(normalized.Username, password, normalized.Domain)
            };

            connection.SessionOptions.ProtocolVersion = 3;
            if (_options.UseLdaps)
            {
                connection.SessionOptions.SecureSocketLayer = true;
            }

            connection.Bind();

            var email = normalized.Username.Contains('@')
                ? normalized.Username.ToLowerInvariant()
                : $"{normalized.Username.ToLowerInvariant()}@{normalized.Domain.ToLowerInvariant()}.windows.local";

            var displayName = $"{normalized.Domain}\\{normalized.Username}";

            return Task.FromResult(new WindowsDirectoryAuthResult(
                true,
                null,
                normalized.Domain,
                normalized.Username,
                displayName,
                email,
                displayName.ToLowerInvariant()));
        }
        catch (LdapException)
        {
            return Task.FromResult(new WindowsDirectoryAuthResult(
                false,
                "Windows credentials are invalid or not authorized.",
                normalized.Domain,
                normalized.Username,
                null,
                null,
                null));
        }
        catch
        {
            return Task.FromResult(new WindowsDirectoryAuthResult(
                false,
                "Windows directory service is unavailable.",
                normalized.Domain,
                normalized.Username,
                null,
                null,
                null));
        }
    }

    private (bool Success, string Domain, string Username, string? Error) ResolveIdentity(string usernameOrDomainUser, string? providedDomain)
    {
        if (usernameOrDomainUser.Contains('\\'))
        {
            var parts = usernameOrDomainUser.Split('\\', 2, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 2)
            {
                return (true, parts[0], parts[1], null);
            }
        }

        if (usernameOrDomainUser.Contains('@'))
        {
            var parts = usernameOrDomainUser.Split('@', 2, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 2)
            {
                return (true, parts[1], parts[0], null);
            }
        }

        var domain = !string.IsNullOrWhiteSpace(providedDomain)
            ? providedDomain!
            : _options.DefaultDomain;

        if (string.IsNullOrWhiteSpace(domain))
        {
            return (false, string.Empty, string.Empty, "Domain is required (or configure Authentication:WindowsCredentials:DefaultDomain).");
        }

        return (true, domain, usernameOrDomainUser, null);
    }
}
