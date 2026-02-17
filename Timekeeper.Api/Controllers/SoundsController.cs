using Microsoft.AspNetCore.Mvc;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SoundsController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SoundsController> _logger;

    public SoundsController(IConfiguration configuration, ILogger<SoundsController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public ActionResult<IEnumerable<SoundFileDto>> GetAvailableSounds()
    {
        try
        {
            // Get the sounds directory path from configuration or use default
            var webProjectPath = _configuration["SoundsPath"] 
                ?? Path.Combine(Directory.GetCurrentDirectory(), "..", "Timekeeper.Web", "public", "sounds");
            
            _logger.LogInformation("Looking for sounds in: {Path}", webProjectPath);

            if (!Directory.Exists(webProjectPath))
            {
                _logger.LogWarning("Sounds directory does not exist: {Path}", webProjectPath);
                return Ok(new List<SoundFileDto>());
            }

            var supportedExtensions = new[] { ".mp3", ".wav", ".ogg" };
            var soundFiles = Directory.GetFiles(webProjectPath)
                .Where(f => supportedExtensions.Contains(Path.GetExtension(f).ToLowerInvariant()))
                .Select(filePath =>
                {
                    var fileInfo = new FileInfo(filePath);
                    return new SoundFileDto
                    {
                        FileName = fileInfo.Name,
                        DisplayName = Path.GetFileNameWithoutExtension(fileInfo.Name),
                        SizeBytes = fileInfo.Length,
                        Extension = fileInfo.Extension.TrimStart('.')
                    };
                })
                .OrderBy(s => s.DisplayName)
                .ToList();

            _logger.LogInformation("Found {Count} sound files", soundFiles.Count);
            return Ok(soundFiles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving sound files");
            return StatusCode(500, new { error = "Failed to retrieve sound files" });
        }
    }
}

public class SoundFileDto
{
    public string FileName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Extension { get; set; } = string.Empty;
    
    public string SizeFormatted => SizeBytes switch
    {
        < 1024 => $"{SizeBytes} B",
        < 1024 * 1024 => $"{SizeBytes / 1024.0:F1} KB",
        _ => $"{SizeBytes / (1024.0 * 1024.0):F2} MB"
    };
}
