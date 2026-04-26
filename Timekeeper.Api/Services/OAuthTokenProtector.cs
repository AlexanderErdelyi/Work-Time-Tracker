using Microsoft.AspNetCore.DataProtection;

namespace Timekeeper.Api.Services;

public interface IOAuthTokenProtector
{
    string Protect(string plainTextToken);
    string? TryUnprotect(string? protectedToken);
}

public class OAuthTokenProtector : IOAuthTokenProtector
{
    private readonly IDataProtector _protector;
    private readonly ILogger<OAuthTokenProtector> _logger;

    public OAuthTokenProtector(IDataProtectionProvider dataProtectionProvider, ILogger<OAuthTokenProtector> logger)
    {
        _protector = dataProtectionProvider.CreateProtector("Timekeeper.Activity.OAuthTokens.v1");
        _logger = logger;
    }

    public string Protect(string plainTextToken)
    {
        return _protector.Protect(plainTextToken);
    }

    public string? TryUnprotect(string? protectedToken)
    {
        if (string.IsNullOrWhiteSpace(protectedToken))
            return null;

        try
        {
            return _protector.Unprotect(protectedToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to decrypt OAuth token.");
            return null;
        }
    }
}
