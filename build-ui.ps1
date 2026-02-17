# Build script for Timekeeper.Web React application
# This script compiles the React app and outputs to Timekeeper.Api/wwwroot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Building Timekeeper React Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Navigate to the Web project directory
$webDir = Join-Path $PSScriptRoot "Timekeeper.Web"
$apiWwwroot = Join-Path $PSScriptRoot "Timekeeper.Api\wwwroot"

if (-not (Test-Path $webDir)) {
    Write-Host "[ERROR] Timekeeper.Web directory not found!" -ForegroundColor Red
    exit 1
}

# Check if node_modules exists
$nodeModules = Join-Path $webDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[INSTALL] Installing npm dependencies..." -ForegroundColor Yellow
    Push-Location $webDir
    npm install
    Pop-Location
    Write-Host "[SUCCESS] Dependencies installed" -ForegroundColor Green
}

# Build the React app
Write-Host "[BUILD] Building React application..." -ForegroundColor Yellow
Push-Location $webDir

try {
    npm run build
    Write-Host "[SUCCESS] Build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Verify output
if (Test-Path $apiWwwroot) {
    $files = Get-ChildItem $apiWwwroot -Recurse -File
    Write-Host ""
    Write-Host "[INFO] Build output:" -ForegroundColor Cyan
    Write-Host "   Location: $apiWwwroot" -ForegroundColor Gray
    Write-Host "   Files: $($files.Count)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[SUCCESS] Frontend ready to serve from API!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Warning: wwwroot folder not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Build Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
