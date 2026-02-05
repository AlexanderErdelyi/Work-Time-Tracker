using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;

namespace Timekeeper.TrayApp;

public class TrayApplicationContext : ApplicationContext
{
    private readonly NotifyIcon _trayIcon;
    private Process? _apiProcess;
    private readonly string _apiExecutablePath;

    public TrayApplicationContext()
    {
        // Get the directory where this executable is located
        var appDirectory = AppDomain.CurrentDomain.BaseDirectory;
        _apiExecutablePath = Path.Combine(appDirectory, "Timekeeper.Api.exe");

        // Create the tray icon
        _trayIcon = new NotifyIcon()
        {
            Icon = SystemIcons.Application,
            Visible = true,
            Text = "Timekeeper - Time Tracking"
        };

        // Create context menu
        var contextMenu = new ContextMenuStrip();
        
        var openMenuItem = new ToolStripMenuItem("Open Timekeeper", null, OnOpen);
        var startMenuItem = new ToolStripMenuItem("Start Service", null, OnStart);
        var stopMenuItem = new ToolStripMenuItem("Stop Service", null, OnStop);
        var separator = new ToolStripSeparator();
        var exitMenuItem = new ToolStripMenuItem("Exit", null, OnExit);

        contextMenu.Items.Add(openMenuItem);
        contextMenu.Items.Add(new ToolStripSeparator());
        contextMenu.Items.Add(startMenuItem);
        contextMenu.Items.Add(stopMenuItem);
        contextMenu.Items.Add(separator);
        contextMenu.Items.Add(exitMenuItem);

        _trayIcon.ContextMenuStrip = contextMenu;
        _trayIcon.DoubleClick += (s, e) => OnOpen(s, e);

        // Auto-start the API
        StartApi();
    }

    private void OnOpen(object? sender, EventArgs e)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "http://localhost:5000",
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to open browser: {ex.Message}", "Error", 
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void OnStart(object? sender, EventArgs e)
    {
        if (_apiProcess != null && !_apiProcess.HasExited)
        {
            MessageBox.Show("Timekeeper is already running.", "Info", 
                MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        StartApi();
    }

    private void StartApi()
    {
        try
        {
            if (!File.Exists(_apiExecutablePath))
            {
                MessageBox.Show($"Could not find Timekeeper.Api.exe at:\n{_apiExecutablePath}", 
                    "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            _apiProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = _apiExecutablePath,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory
                }
            };

            _apiProcess.Start();
            _trayIcon.Text = "Timekeeper - Running";
            _trayIcon.ShowBalloonTip(2000, "Timekeeper", "Service started successfully", ToolTipIcon.Info);

            // Wait a moment then open browser (run on background thread)
            _ = Task.Run(async () =>
            {
                await Task.Delay(1500);
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "http://localhost:5000",
                        UseShellExecute = true
                    });
                }
                catch { /* Silently fail browser launch */ }
            });
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to start Timekeeper: {ex.Message}", "Error", 
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void OnStop(object? sender, EventArgs e)
    {
        StopApi();
    }

    private void StopApi()
    {
        if (_apiProcess != null && !_apiProcess.HasExited)
        {
            try
            {
                // Try to kill the process tree gracefully
                _apiProcess.Kill(true); // Kill entire process tree
                _apiProcess.WaitForExit(5000);
                _apiProcess.Dispose();
                _apiProcess = null;
                _trayIcon.Text = "Timekeeper - Stopped";
                _trayIcon.ShowBalloonTip(2000, "Timekeeper", "Service stopped", ToolTipIcon.Info);
            }
            catch (InvalidOperationException)
            {
                // Process already exited
                _apiProcess?.Dispose();
                _apiProcess = null;
                _trayIcon.Text = "Timekeeper - Stopped";
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to stop Timekeeper: {ex.Message}", "Error", 
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        else
        {
            MessageBox.Show("Timekeeper is not running.", "Info", 
                MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
    }

    private void OnExit(object? sender, EventArgs e)
    {
        StopApi();
        _trayIcon.Visible = false;
        _trayIcon.Dispose();
        Application.Exit();
    }
}
