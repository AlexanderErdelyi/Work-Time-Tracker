# Release Preparation Script
# This script prepares the project for distribution

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

Write-Host "🚀 Preparing Release v$Version" -ForegroundColor Cyan
Write-Host ""

# Set location to script directory
Set-Location -Path $PSScriptRoot

# Update version in version.json
Write-Host "📝 Updating version.json..." -ForegroundColor Yellow
$versionFile = Get-Content "version.json" | ConvertFrom-Json
$versionFile.version = $Version
$versionFile.releaseDate = (Get-Date -Format "yyyy-MM-dd")
$versionFile | ConvertTo-Json -Depth 10 | Set-Content "version.json"

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path ".\Release") {
    Remove-Item -Path ".\Release" -Recurse -Force
}
New-Item -ItemType Directory -Path ".\Release" | Out-Null

# Build in Release mode
Write-Host "🔨 Building solution in Release mode..." -ForegroundColor Yellow
dotnet build Work-Time-Tracker.sln --configuration Release

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Create distribution folder
Write-Host "📦 Creating distribution package..." -ForegroundColor Yellow
$distFolder = ".\Release\Timekeeper-v$Version"
New-Item -ItemType Directory -Path $distFolder | Out-Null

# Copy necessary files
Copy-Item ".\Timekeeper.Api\bin\Release\net8.0\*" -Destination $distFolder -Recurse
Copy-Item ".\README.md" -Destination $distFolder
Copy-Item ".\SETUP_GUIDE.md" -Destination $distFolder
Copy-Item ".\version.json" -Destination $distFolder
Copy-Item ".\run-api.ps1" -Destination $distFolder
Copy-Item ".\build.ps1" -Destination $distFolder

# Create a simple start script for users
$startScript = @"
@echo off
echo Starting Timekeeper...
dotnet Timekeeper.Api.dll
pause
"@
$startScript | Out-File -FilePath "$distFolder\START.bat" -Encoding ASCII

Write-Host ""
Write-Host "✅ Release package created: $distFolder" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the application in the Release folder"
Write-Host "2. Create a ZIP file of the Release folder"
Write-Host "3. Commit version.json changes"
Write-Host "4. Create a Git tag: git tag v$Version"
Write-Host "5. Push to GitHub: git push origin v$Version"
Write-Host "6. Create a GitHub Release and upload the ZIP"
Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
