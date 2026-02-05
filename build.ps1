# Build Timekeeper Solution
Write-Host "Building Timekeeper solution..." -ForegroundColor Cyan

# Ensure we're in the correct directory
Set-Location -Path $PSScriptRoot

dotnet build Work-Time-Tracker.sln

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild successful!" -ForegroundColor Green
} else {
    Write-Host "`nBuild failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
