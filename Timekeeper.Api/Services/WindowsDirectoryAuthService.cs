using System.DirectoryServices.Protocols;
using System.Net;
using Microsoft.Extensions.Logging;

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
    private readonly ILogger<WindowsDirectoryAuthService> _logger;

    public WindowsDirectoryAuthService(IConfiguration configuration, ILogger<WindowsDirectoryAuthService> logger)
    {
        _options = configuration.GetSection("Authentication:WindowsCredentials").Get<WindowsCredentialsOptions>()
            ?? new WindowsCredentialsOptions();
        _logger = logger;
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
            var bindAttempts = BuildCredentialCandidates(usernameOrDomainUser.Trim(), password, normalized.Username, normalized.Domain)
                .DistinctBy(candidate => $"{candidate.UserName}|{candidate.Domain}")
                .ToList();

            var bindSucceeded = false;
            LdapException? lastLdapException = null;
            foreach (var credentials in bindAttempts)
            {
                bindSucceeded = TryBind(identifier, AuthType.Negotiate, credentials, out var ldapException);
                if (ldapException != null)
                {
                    lastLdapException = ldapException;
                }

                if (bindSucceeded)
                {
                    break;
                }
            }

            if (!bindSucceeded)
            {
                var basicPrincipals = BuildBasicPrincipals(usernameOrDomainUser.Trim(), normalized.Username, normalized.Domain)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                foreach (var principal in basicPrincipals)
                {
                    var basicCredential = new NetworkCredential(principal, password);
                    bindSucceeded = TryBind(identifier, AuthType.Basic, basicCredential, out var ldapException);
                    if (ldapException != null)
                    {
                        lastLdapException = ldapException;
                    }

                    if (bindSucceeded)
                    {
                        break;
                    }
                }
            }

            if (!bindSucceeded)
            {
                if (lastLdapException != null)
                {
                    _logger.LogWarning(
                        lastLdapException,
                        "Windows credentials LDAP bind failed. ErrorCode: {ErrorCode}, ServerError: {ServerError}",
                        lastLdapException.ErrorCode,
                        lastLdapException.ServerErrorMessage);

                    if (IsDirectoryUnavailable(lastLdapException))
                    {
                        return Task.FromResult(new WindowsDirectoryAuthResult(
                            false,
                            "Windows directory is unavailable or LDAPS certificate trust failed.",
                            normalized.Domain,
                            normalized.Username,
                            null,
                            null,
                            null));
                    }
                }

                return Task.FromResult(new WindowsDirectoryAuthResult(
                    false,
                    "Windows credentials are invalid or not authorized.",
                    normalized.Domain,
                    normalized.Username,
                    null,
                    null,
                    null));
            }

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

    private static IEnumerable<NetworkCredential> BuildCredentialCandidates(string rawInput, string password, string normalizedUsername, string normalizedDomain)
    {
        // Canonical DOMAIN\\username form
        yield return new NetworkCredential(normalizedUsername, password, normalizedDomain);

        // UPN form if user entered user@domain
        if (rawInput.Contains('@'))
        {
            yield return new NetworkCredential(rawInput, password);
            yield return new NetworkCredential(normalizedUsername, password, normalizedDomain);
        }

        // DOMAIN\\user passed as username can work in some environments
        if (!string.IsNullOrWhiteSpace(normalizedDomain) && !string.IsNullOrWhiteSpace(normalizedUsername))
        {
            yield return new NetworkCredential($"{normalizedDomain}\\{normalizedUsername}", password);
        }

        // Fallback: if domain is FQDN (e.g. applabs.local), also try NetBIOS-like short form (APPLABS)
        if (normalizedDomain.Contains('.'))
        {
            var shortDomain = normalizedDomain.Split('.', 2, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(shortDomain))
            {
                var shortUpper = shortDomain.ToUpperInvariant();
                yield return new NetworkCredential(normalizedUsername, password, shortUpper);
                yield return new NetworkCredential($"{shortUpper}\\{normalizedUsername}", password);
            }
        }
    }

    private IEnumerable<string> BuildBasicPrincipals(string rawInput, string normalizedUsername, string normalizedDomain)
    {
        // If user already entered an explicit principal format, try it first.
        yield return rawInput;

        // Canonical forms commonly accepted by LDAP simple bind.
        yield return $"{normalizedDomain}\\{normalizedUsername}";
        yield return $"{normalizedUsername}@{normalizedDomain}";

        // NetBIOS fallback when configured domain is FQDN.
        if (normalizedDomain.Contains('.'))
        {
            var shortDomain = normalizedDomain.Split('.', 2, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(shortDomain))
            {
                var shortUpper = shortDomain.ToUpperInvariant();
                yield return $"{shortUpper}\\{normalizedUsername}";
                yield return $"{normalizedUsername}@{shortUpper}";
            }
        }

        // Last resort.
        yield return normalizedUsername;
    }

    private bool TryBind(LdapDirectoryIdentifier identifier, AuthType authType, NetworkCredential credential, out LdapException? ldapException)
    {
        ldapException = null;

        using var connection = new LdapConnection(identifier)
        {
            AuthType = authType,
            Timeout = TimeSpan.FromSeconds(Math.Max(3, _options.ConnectTimeoutSeconds)),
            Credential = credential
        };

        connection.SessionOptions.ProtocolVersion = 3;
        if (_options.UseLdaps)
        {
            connection.SessionOptions.SecureSocketLayer = true;
        }

        try
        {
            connection.Bind();
            return true;
        }
        catch (LdapException ex)
        {
            ldapException = ex;
            return false;
        }
    }

    private static bool IsDirectoryUnavailable(LdapException ex)
    {
        if (ex.ErrorCode == 81)
        {
            return true;
        }

        var message = $"{ex.Message} {ex.ServerErrorMessage}";
        return message.Contains("server is unavailable", StringComparison.OrdinalIgnoreCase)
               || message.Contains("can't contact ldap", StringComparison.OrdinalIgnoreCase)
               || message.Contains("cannot contact ldap", StringComparison.OrdinalIgnoreCase)
               || message.Contains("transport layer security", StringComparison.OrdinalIgnoreCase)
               || message.Contains("ssl", StringComparison.OrdinalIgnoreCase)
               || message.Contains("tls", StringComparison.OrdinalIgnoreCase)
               || message.Contains("certificate", StringComparison.OrdinalIgnoreCase);
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
