using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Diagnostics;

namespace Timekeeper.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class TerminalController : ControllerBase
    {
        [HttpPost("execute")]
        public IActionResult ExecuteCommand([FromBody] CommandRequest request)
        {
            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoExit -Command \"{request.Command}\"",
                    UseShellExecute = true,
                    CreateNoWindow = false,
                    WindowStyle = ProcessWindowStyle.Normal
                };

                Process.Start(startInfo);

                return Ok(new { success = true, message = "Command executed successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("stop-port")]
        public async Task<IActionResult> StopPort([FromBody] StopPortRequest request)
        {
            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-Command \"Get-NetTCPConnection -LocalPort {request.Port} -ErrorAction SilentlyContinue | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force }}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                using var process = Process.Start(startInfo);
                if (process != null)
                {
                    await process.WaitForExitAsync();
                    var output = await process.StandardOutput.ReadToEndAsync();
                    var error = await process.StandardError.ReadToEndAsync();

                    return Ok(new { success = true, message = $"Process on port {request.Port} stopped", output, error });
                }

                return BadRequest(new { success = false, message = "Failed to start PowerShell" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("port-info/{port}")]
        public async Task<IActionResult> GetPortInfo(int port)
        {
            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-Command \"$conn = Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue; if ($conn) {{ $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue; if ($proc) {{ Write-Output \\\"$($proc.ProcessName)|$($proc.Id)|$($proc.Path)\\\" }} else {{ Write-Output 'Unknown||' }} }} else {{ Write-Output '' }}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                using var process = Process.Start(startInfo);
                if (process != null)
                {
                    await process.WaitForExitAsync();
                    var output = (await process.StandardOutput.ReadToEndAsync()).Trim();
                    
                    if (string.IsNullOrEmpty(output))
                    {
                        return Ok(new { inUse = false, processName = "", processId = 0, processPath = "" });
                    }

                    var parts = output.Split('|');
                    var processName = parts.Length > 0 ? parts[0] : "Unknown";
                    var processId = parts.Length > 1 && int.TryParse(parts[1], out var pid) ? pid : 0;
                    var processPath = parts.Length > 2 ? parts[2] : "";

                    return Ok(new { 
                        inUse = true, 
                        processName, 
                        processId,
                        processPath,
                        port
                    });
                }

                return BadRequest(new { success = false, message = "Failed to start PowerShell" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }

    public class CommandRequest
    {
        public string Command { get; set; } = string.Empty;
    }

    public class StopPortRequest
    {
        public int Port { get; set; }
    }
}
