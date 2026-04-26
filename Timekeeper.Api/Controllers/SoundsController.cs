using Microsoft.AspNetCore.Mvc;

namespace Timekeeper.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SoundsController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SoundsController> _logger;
    private readonly IWebHostEnvironment _env;

    public SoundsController(IConfiguration configuration, ILogger<SoundsController> logger, IWebHostEnvironment env)
    {
        _configuration = configuration;
        _logger = logger;
        _env = env;
    }

    [HttpGet]
    public ActionResult<IEnumerable<SoundFileDto>> GetAvailableSounds()
    {
        try
        {
            // 1. Explicit config override
            // 2. wwwroot/sounds — used in production (hosted server)
            // 3. Timekeeper.Web/public/sounds — used in dev (Vite serves from there)
            var soundsPath = _configuration["SoundsPath"];

            if (string.IsNullOrWhiteSpace(soundsPath))
            {
                var wwwrootSounds = Path.Combine(_env.WebRootPath ?? string.Empty, "sounds");
                var devSounds = Path.Combine(Directory.GetCurrentDirectory(), "..", "Timekeeper.Web", "public", "sounds");
                soundsPath = Directory.Exists(wwwrootSounds) ? wwwrootSounds : devSounds;
            }

            _logger.LogInformation("Looking for sounds in: {Path}", soundsPath);

            if (!Directory.Exists(soundsPath))
            {
                _logger.LogWarning("Sounds directory does not exist: {Path}", soundsPath);
                return Ok(new List<SoundFileDto>());
            }

            var supportedExtensions = new[] { ".mp3", ".wav", ".ogg" };
            var soundFiles = Directory.GetFiles(soundsPath)
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
