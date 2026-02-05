# Publish Self-Contained Application
# This creates a standalone executable that users can run without installing .NET

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [string]$Runtime = "win-x64"  # win-x64, win-x86, linux-x64, osx-x64
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

dotnet publish Timekeeper.Api/Timekeeper.Api.csproj `
    --configuration Release `
    --runtime $Runtime `
    --self-contained true `
    --output ".\Release\Timekeeper-v$Version-$Runtime" `
    /p:PublishSingleFile=true `
    /p:PublishTrimmed=true `
    /p:EnableCompressionInSingleFile=true

if ($LASTEXITCODE -ne 0) {
    Write-Host "Publish failed!" -ForegroundColor Red
    exit 1
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

### Windows Users:
1. Double-click START_TIMEKEEPER.bat to start
2. Your browser will open automatically
3. Start tracking time!

### To Stop:
- Close the console window or press Ctrl+C

## Your Data
All your data is saved in 'timekeeper.db' in this folder.
**IMPORTANT**: Backup this file regularly!

## Need Help?
See SETUP_GUIDE.md for detailed instructions.

## Features
- No installation required - everything is included!
- No .NET Runtime needed
- Your data stays on your computer
- Offline application - works without internet

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
}

# Create ZIP
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
$zipPath = ".\Release\Timekeeper-v$Version-$Runtime.zip"
Compress-Archive -Path $distFolder -DestinationPath $zipPath -Force

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "Self-Contained Release Created!" -ForegroundColor Green
Write-Host ""
Write-Host "Package Details:" -ForegroundColor Cyan
Write-Host "   Location: $zipPath" -ForegroundColor White
Write-Host "   Size: $zipSize MB" -ForegroundColor White
Write-Host "   Runtime: $Runtime" -ForegroundColor White
Write-Host ""
Write-Host "Full Path:" -ForegroundColor Cyan
Write-Host "   $(Resolve-Path $zipPath)" -ForegroundColor Yellow
Write-Host ""
Write-Host "What's Included:" -ForegroundColor Cyan
Write-Host "   - Complete application" -ForegroundColor White
Write-Host "   - .NET Runtime (no installation needed)" -ForegroundColor White
Write-Host "   - All dependencies" -ForegroundColor White
Write-Host "   - Documentation" -ForegroundColor White
Write-Host "   - Easy-start batch file (Windows)" -ForegroundColor White
Write-Host ""
Write-Host "For Users:" -ForegroundColor Cyan
Write-Host "   1. Extract the ZIP" -ForegroundColor White
Write-Host "   2. Double-click START_TIMEKEEPER.bat" -ForegroundColor White
Write-Host "   3. That's it!" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Test the application from the Release folder" -ForegroundColor White
Write-Host "   2. Share the ZIP file with users" -ForegroundColor White
Write-Host "   3. Or upload to GitHub Releases" -ForegroundColor White
Write-Host ""

# Open folder
Write-Host "Opening Release folder..." -ForegroundColor Yellow
Start-Process explorer.exe -ArgumentList "/select,`"$(Resolve-Path $zipPath)`""

Write-Host "Done!" -ForegroundColor Green
