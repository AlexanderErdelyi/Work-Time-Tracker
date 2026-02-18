# Run Timekeeper API with optional custom port
param(
    [int]$Port = 5000
)

Write-Host "Starting Timekeeper API on port $Port..." -ForegroundColor Cyan

$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:$Port"

Set-Location -Path "$PSScriptRoot\Timekeeper.Api"
dotnet "$PSScriptRoot\Timekeeper.Api\bin\Debug\net8.0\Timekeeper.Api.dll"
