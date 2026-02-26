using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Timekeeper.Api.Controllers;

/// <summary>
/// Serves the HTTPS certificate and trust script for download so users can
/// trust the shared-host certificate directly from the in-app Documentation page.
/// Both endpoints are anonymous - users may not be authenticated yet when they
/// need to install the certificate.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class CertController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public CertController(IWebHostEnvironment env)
    {
        _env = env;
    }

    /// <summary>
    /// Downloads the HTTPS certificate (.cer) so users can install it into
    /// their Windows trusted root store.
    /// </summary>
    [HttpGet("certificate")]
    public IActionResult DownloadCertificate()
    {
        // Look for the exported .cer file next to the running app.
        var cerPath = Path.Combine(_env.ContentRootPath, "certs", "timekeeper-https.cer");

        if (!System.IO.File.Exists(cerPath))
        {
            return NotFound(new { message = "Certificate file not found. This instance may not be configured for shared HTTPS hosting." });
        }

        var bytes = System.IO.File.ReadAllBytes(cerPath);
        return File(bytes, "application/x-x509-ca-cert", "timekeeper-https.cer");
    }

    /// <summary>
    /// Downloads the PowerShell trust script so users can install the certificate
    /// with a single right-click → Run with PowerShell.
    /// </summary>
    [HttpGet("trust-script")]
    public IActionResult DownloadTrustScript()
    {
        var scriptPath = Path.Combine(_env.ContentRootPath, "trust-shared-https-cert.ps1");

        if (!System.IO.File.Exists(scriptPath))
        {
            return NotFound(new { message = "Trust script not found. This instance may not be configured for shared HTTPS hosting." });
        }

        var bytes = System.IO.File.ReadAllBytes(scriptPath);
        return File(bytes, "application/octet-stream", "trust-certificate.ps1");
    }
}
