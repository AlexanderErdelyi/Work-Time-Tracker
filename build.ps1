# Build Timekeeper Solution
Write-Host "Building Timekeeper solution..." -ForegroundColor Cyan

# Ensure we're in the correct directory
Set-Location -Path $PSScriptRoot

# Step 1: Build React UI
Write-Host "`n=== Building React Frontend ===" -ForegroundColor Yellow
& "$PSScriptRoot\build-ui.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nUI Build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Step 2: Build .NET Solution
Write-Host "`n=== Building .NET Solution ===" -ForegroundColor Yellow
dotnet build Work-Time-Tracker.sln

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild successful!" -ForegroundColor Green
} else {
    Write-Host "`nBuild failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
