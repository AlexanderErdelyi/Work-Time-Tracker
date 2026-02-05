# Publish Self-Contained Application
# This creates a standalone executable that users can run without installing .NET

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [string]$Runtime = "win-x64",  # win-x64, win-x86, linux-x64, osx-x64
    [switch]$BuildInstaller = $false  # Set to $true to also build Windows installer
)

Write-Host "Creating Self-Contained Release v$Version for $Runtime" -ForegroundColor Cyan
Write-Host ""

# Set location to script directory
Set-Location -Path $PSScriptRoot

# Update version in version.json
Write-Host "Updating version.json..." -ForegroundColor Yellow
$versionFile = Get-Content "version.json" | ConvertFrom-Json
$versionFile.version = $Version
$versionFile.releaseDate = (Get-Date -Format "yyyy-MM-dd")
$versionFile | ConvertTo-Json -Depth 10 | Set-Content "version.json"

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path ".\Release") {
    Remove-Item -Path ".\Release" -Recurse -Force
}
New-Item -ItemType Directory -Path ".\Release" | Out-Null

# Publish self-contained
Write-Host "Publishing self-contained application for $Runtime..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes..." -ForegroundColor Gray

# Note: We do NOT use PublishSingleFile for the API so that Timekeeper.Api.dll
# remains as a separate file, which allows the "dotnet Timekeeper.Api.dll" command
# to work in security-restricted environments.
# We also do NOT use PublishTrimmed to avoid runtime issues with EF Core and MVC.
dotnet publish Timekeeper.Api/Timekeeper.Api.csproj `
    --configuration Release `
    --runtime $Runtime `
    --self-contained true `
    --output ".\Release\Timekeeper-v$Version-$Runtime"

if ($LASTEXITCODE -ne 0) {
    Write-Host "API publish failed!" -ForegroundColor Red
    exit 1
}

# Publish Tray App (system tray launcher) for Windows only
if ($Runtime -like "win-*") {
    Write-Host "Publishing Tray App for $Runtime..." -ForegroundColor Yellow
    
    dotnet publish Timekeeper.TrayApp/Timekeeper.TrayApp.csproj `
        --configuration Release `
        --runtime $Runtime `
        --self-contained true `
        --output ".\Release\Timekeeper-v$Version-$Runtime" `
        /p:PublishSingleFile=true `
        /p:EnableCompressionInSingleFile=true
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Tray App publish failed!" -ForegroundColor Red
        exit 1
    }
}

$distFolder = ".\Release\Timekeeper-v$Version-$Runtime"

# Copy documentation
Write-Host "Adding documentation..." -ForegroundColor Yellow
Copy-Item ".\README.md" -Destination $distFolder
Copy-Item ".\SETUP_GUIDE.md" -Destination $distFolder
Copy-Item ".\version.json" -Destination $distFolder

# Create a simple README for users
Write-Host "Creating user documentation..." -ForegroundColor Yellow

$startHere = @"
# Timekeeper v$Version

## Quick Start

### Option 1: System Tray (Recommended)
- Double-click Timekeeper.TrayApp.exe
- The app will run in the system tray (bottom-right icons)
- Right-click the tray icon to start/stop or open the app
- No console window will appear!

### Option 2: Command Window
- Double-click START_TIMEKEEPER.bat
- Your browser will open automatically
- A console window will remain open

### Option 3: For Security-Restricted Systems (Company Laptops)
If Option 1 or 2 gives "Access Denied" errors:
- Double-click RUN_WITH_DOTNET.bat
- OR right-click RUN_WITH_DOTNET.ps1 and select "Run with PowerShell"
- These use 'dotnet' command which may bypass security restrictions

### To Stop:
- System Tray: Right-click tray icon > Exit
- Command Window: Close the console window or press Ctrl+C

## Your Data
All your data is saved in 'timekeeper.db' in this folder.
**IMPORTANT**: Backup this file regularly!

## Need Help?
See SIMPLE_USER_GUIDE.md for detailed instructions.

## Features
- No installation required - everything is included!
- No .NET Runtime needed
- Your data stays on your computer
- Offline application - works without internet
- Runs in system tray - no disturbing windows!

Enjoy!
"@

Set-Content -Path "$distFolder\START_HERE.txt" -Value $startHere -Encoding UTF8

# Create batch file for Windows
if ($Runtime -like "win-*") {
    Write-Host "Creating START_TIMEKEEPER.bat..." -ForegroundColor Yellow
    
$batchContent = @'
@echo off
title Timekeeper - Time Tracking Application
echo.
echo ================================================
echo   Timekeeper is starting...
echo ================================================
echo.
echo The application will open in your default browser.
echo If it doesn't open automatically, go to:
echo.
echo    http://localhost:5000
echo.
echo To STOP the application, close this window or press Ctrl+C
echo.
echo ================================================
echo.

start http://localhost:5000

Timekeeper.Api.exe

pause
'@

    Set-Content -Path "$distFolder\START_TIMEKEEPER.bat" -Value $batchContent -Encoding ASCII
    Write-Host "Created START_TIMEKEEPER.bat" -ForegroundColor Green
    
    # Create RUN_WITH_DOTNET.bat for security-restricted environments
    Write-Host "Creating RUN_WITH_DOTNET.bat..." -ForegroundColor Yellow
    
$dotnetBatchContent = @'
@echo off
title Timekeeper - Time Tracking Application (dotnet launcher)
echo.
echo ================================================
echo   Timekeeper is starting with dotnet...
echo ================================================
echo.
echo This launcher runs the app using 'dotnet' command
echo which may work better on security-restricted systems.
echo.
echo The application will open in your default browser.
echo If it doesn't open automatically, go to:
echo.
echo    http://localhost:5000
echo.
echo To STOP the application, close this window or press Ctrl+C
echo.
echo ================================================
echo.

start http://localhost:5000

dotnet "%~dp0Timekeeper.Api.dll"

pause
'@

    Set-Content -Path "$distFolder\RUN_WITH_DOTNET.bat" -Value $dotnetBatchContent -Encoding ASCII
    Write-Host "Created RUN_WITH_DOTNET.bat" -ForegroundColor Green
    
    # Create RUN_WITH_DOTNET.ps1 as PowerShell alternative
    Write-Host "Creating RUN_WITH_DOTNET.ps1..." -ForegroundColor Yellow
    
$dotnetPsContent = @'
# Timekeeper Launcher - PowerShell Version
# This launcher runs the app using 'dotnet' command
# which may work better on security-restricted systems.

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Timekeeper is starting with dotnet..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This launcher runs the app using 'dotnet' command" -ForegroundColor Yellow
Write-Host "which may work better on security-restricted systems." -ForegroundColor Yellow
Write-Host ""
Write-Host "The application will open in your default browser." -ForegroundColor Green
Write-Host "If it doesn't open automatically, go to:" -ForegroundColor Green
Write-Host ""
Write-Host "   http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "To STOP the application, press Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Open browser
Start-Process "http://localhost:5000"

# Run the application with dotnet
$dllPath = Join-Path $PSScriptRoot "Timekeeper.Api.dll"
& dotnet $dllPath
'@

    Set-Content -Path "$distFolder\RUN_WITH_DOTNET.ps1" -Value $dotnetPsContent -Encoding UTF8
    Write-Host "Created RUN_WITH_DOTNET.ps1" -ForegroundColor Green
}

# Create ZIP
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
$zipPath = ".\Release\Timekeeper-v$Version-$Runtime.zip"
Compress-Archive -Path $distFolder -DestinationPath $zipPath -Force

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

# Build installer if requested (Windows only)
$installerPath = $null
if ($BuildInstaller -and $Runtime -like "win-*") {
    Write-Host ""
    Write-Host "Building Windows Installer..." -ForegroundColor Yellow
    
    # Check if Inno Setup is installed
    $isccPath = $null
    $possiblePaths = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles(x86)}\Inno Setup 5\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 5\ISCC.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $isccPath = $path
            break
        }
    }
    
    if ($isccPath) {
        Write-Host "   Found Inno Setup at: $isccPath" -ForegroundColor Gray
        
        # Set environment variable for version
        $env:APP_VERSION = $Version
        
        # Run Inno Setup compiler
        & $isccPath "installer.iss"
        
        if ($LASTEXITCODE -eq 0) {
            $installerPath = ".\Release\Timekeeper-v$Version-$Runtime-installer.exe"
            if (Test-Path $installerPath) {
                $installerSize = [math]::Round((Get-Item $installerPath).Length / 1MB, 2)
                Write-Host "   Installer created successfully!" -ForegroundColor Green
                Write-Host "   Size: $installerSize MB" -ForegroundColor White
            }
        } else {
            Write-Host "   Installer build failed!" -ForegroundColor Red
        }
    } else {
        Write-Host "   Inno Setup not found. Skipping installer creation." -ForegroundColor Yellow
        Write-Host "   Download from: https://jrsoftware.org/isdl.php" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Self-Contained Release Created!" -ForegroundColor Green
Write-Host ""
Write-Host "Package Details:" -ForegroundColor Cyan
Write-Host "   ZIP Location: $zipPath" -ForegroundColor White
Write-Host "   ZIP Size: $zipSize MB" -ForegroundColor White
if ($installerPath -and (Test-Path $installerPath)) {
    Write-Host "   Installer: $installerPath" -ForegroundColor White
    $installerSize = [math]::Round((Get-Item $installerPath).Length / 1MB, 2)
    Write-Host "   Installer Size: $installerSize MB" -ForegroundColor White
}
Write-Host "   Runtime: $Runtime" -ForegroundColor White
Write-Host ""
Write-Host "Full Path:" -ForegroundColor Cyan
Write-Host "   $(Resolve-Path $zipPath)" -ForegroundColor Yellow
if ($installerPath -and (Test-Path $installerPath)) {
    Write-Host "   $(Resolve-Path $installerPath)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "What's Included:" -ForegroundColor Cyan
Write-Host "   - Complete application" -ForegroundColor White
Write-Host "   - .NET Runtime (no installation needed)" -ForegroundColor White
Write-Host "   - All dependencies" -ForegroundColor White
Write-Host "   - Documentation" -ForegroundColor White
Write-Host "   - Easy-start batch file (Windows)" -ForegroundColor White
if ($installerPath -and (Test-Path $installerPath)) {
    Write-Host "   - Windows Installer (for easy install/uninstall)" -ForegroundColor White
}
Write-Host ""
Write-Host "For Users:" -ForegroundColor Cyan
if ($installerPath -and (Test-Path $installerPath)) {
    Write-Host "   Option 1 (Recommended): Run the installer" -ForegroundColor White
    Write-Host "      - Double-click the installer .exe" -ForegroundColor Gray
    Write-Host "      - Follow the installation wizard" -ForegroundColor Gray
    Write-Host "      - Uninstall anytime from Windows Settings" -ForegroundColor Gray
    Write-Host "   Option 2: Portable ZIP" -ForegroundColor White
    Write-Host "      - Extract the ZIP" -ForegroundColor Gray
    Write-Host "      - Double-click START_TIMEKEEPER.bat" -ForegroundColor Gray
} else {
    Write-Host "   1. Extract the ZIP" -ForegroundColor White
    Write-Host "   2. Double-click START_TIMEKEEPER.bat" -ForegroundColor White
    Write-Host "   3. That's it!" -ForegroundColor White
}
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Test the application from the Release folder" -ForegroundColor White
Write-Host "   2. Share the files with users" -ForegroundColor White
Write-Host "   3. Or upload to GitHub Releases" -ForegroundColor White
Write-Host ""

# Open folder
Write-Host "Opening Release folder..." -ForegroundColor Yellow
Start-Process explorer.exe -ArgumentList "/select,`"$(Resolve-Path $zipPath)`""

Write-Host "Done!" -ForegroundColor Green
