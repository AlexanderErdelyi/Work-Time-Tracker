# Timekeeper Windows Installer

This repository now includes a Windows installer option alongside the portable ZIP distribution.

## What's New

### Two Distribution Options

1. **Windows Installer** (Recommended for most users)
   - File: `Timekeeper-v{version}-win-x64-installer.exe`
   - Easy installation with wizard
   - Start Menu shortcuts
   - Optional desktop icon
   - Clean uninstall from Windows Settings
   - Automatic updates available (future feature)

2. **Portable ZIP** (For advanced users or portable usage)
   - File: `Timekeeper-v{version}-win-x64.zip`
   - No installation required
   - Run from any location (USB drive, network share, etc.)
   - Multiple instances possible

## For End Users

### Using the Installer

1. Download the installer file: `Timekeeper-v{version}-win-x64-installer.exe`
2. Double-click the installer
3. Follow the installation wizard
4. Launch Timekeeper from:
   - Start Menu > Timekeeper
   - Desktop shortcut (if selected during installation)
5. To uninstall: Windows Settings > Apps > Timekeeper > Uninstall

**Note:** Your data (`timekeeper.db`) is preserved when uninstalling unless you explicitly choose to delete it.

### Using the Portable ZIP

1. Download the ZIP file: `Timekeeper-v{version}-win-x64.zip`
2. Extract to any folder
3. Double-click `START_TIMEKEEPER.bat` or `Timekeeper.TrayApp.exe`
4. See `START_HERE.txt` in the extracted folder for more options

## For Developers

### Building the Installer

The installer is built automatically during the release process. To build manually:

#### Prerequisites

1. Install Inno Setup from: https://jrsoftware.org/isdl.php
2. Ensure .NET 8.0 SDK is installed

#### Build Steps

```powershell
# Build with installer
.\publish-standalone.ps1 -Version "1.0.0" -BuildInstaller

# Build without installer (default)
.\publish-standalone.ps1 -Version "1.0.0"
```

The installer will be created at:
```
Release\Timekeeper-v{version}-win-x64-installer.exe
```

### Installer Configuration

The installer is configured in `installer.iss` using Inno Setup Script format.

Key features:
- Self-contained .NET runtime (no prerequisites)
- User-level installation (no admin rights required)
- Preserves user data on uninstall (with confirmation)
- Desktop and Start Menu shortcuts
- Modern wizard style
- 64-bit Windows only

### Customizing the Installer

Edit `installer.iss` to customize:
- App name and version
- Installation directory
- Shortcuts
- License agreement (uncomment LicenseFile line and add LICENSE file)
- Icon (uncomment SetupIconFile line and add icon file)

## Release Process

The GitHub Actions workflow (`release.yml`) automatically:
1. Builds the application
2. Creates the portable ZIP
3. Builds the Windows installer
4. Uploads both to GitHub Releases

Both distribution formats are included in every release starting from the next version.

## Troubleshooting

### Installer Issues

**"Windows protected your PC" warning:**
- Click "More info" then "Run anyway"
- This is normal for unsigned executables
- Code signing certificate would eliminate this warning (requires purchase)

**Installation fails:**
- Ensure you have enough disk space (approximately 150-200 MB)
- Try running as administrator (right-click > Run as administrator)
- Check Windows Event Viewer for detailed error messages

**Cannot uninstall:**
- Use Windows Settings > Apps to uninstall
- If that fails, run the installer again and choose "Repair" or "Remove"

### Portable ZIP Issues

See `SECURITY_RESTRICTED_ENVIRONMENTS.md` for issues running the portable version on restricted systems.

## License

The installer script (`installer.iss`) is part of the Timekeeper project and is available under the same license as the main project.

Inno Setup itself is distributed under its own license: https://jrsoftware.org/files/is/license.txt
