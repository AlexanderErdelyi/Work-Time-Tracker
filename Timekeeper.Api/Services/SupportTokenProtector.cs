using Microsoft.AspNetCore.DataProtection;

namespace Timekeeper.Api.Services;

public interface ISupportTokenProtector
{
    string Protect(string plainTextToken);
    string? TryUnprotect(string? protectedToken);
}

public class SupportTokenProtector : ISupportTokenProtector
{
    private readonly IDataProtector _protector;
    private readonly ILogger<SupportTokenProtector> _logger;

    public SupportTokenProtector(IDataProtectionProvider dataProtectionProvider, ILogger<SupportTokenProtector> logger)
    {
        _protector = dataProtectionProvider.CreateProtector("Timekeeper.SupportIssues.Token.v1");
        _logger = logger;
    }

    public string Protect(string plainTextToken)
    {
        return _protector.Protect(plainTextToken);
    }

    public string? TryUnprotect(string? protectedToken)
    {
        if (string.IsNullOrWhiteSpace(protectedToken))
        {
            return null;
        }

        try
        {
            return _protector.Unprotect(protectedToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to decrypt workspace support token.");
            return null;
        }
    }
}
