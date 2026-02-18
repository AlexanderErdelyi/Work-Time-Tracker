# PowerShell script to start Timekeeper services
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('api','frontend')]
    [string]$Service,
    
    [Parameter(Mandatory=$false)]
    [int]$Port = 0
)

$workspaceRoot = $PSScriptRoot

if ($Service -eq 'api') {
    if ($Port -eq 0) {
        $Port = 5000
    }
    
    Write-Host "Starting API on port $Port..." -ForegroundColor Green
    
    $apiPath = Join-Path $workspaceRoot "Timekeeper.Api"
    
    # Start in new PowerShell window
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$apiPath'; `$env:ASPNETCORE_ENVIRONMENT='Development'; `$env:ASPNETCORE_URLS='http://localhost:$Port'; Write-Host 'Starting Timekeeper API on port $Port...' -ForegroundColor Cyan; dotnet run"
    ) -WindowStyle Normal
    
    Write-Host "API start command executed. Check the new terminal window." -ForegroundColor Yellow
}
elseif ($Service -eq 'frontend') {
    if ($Port -eq 0) {
        $Port = 5173
    }
    
    Write-Host "Starting Frontend on port $Port..." -ForegroundColor Green
    
    $webPath = Join-Path $workspaceRoot "Timekeeper.Web"
    
    # Start in new PowerShell window
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$webPath'; Write-Host 'Starting Timekeeper Frontend on port $Port...' -ForegroundColor Cyan; npm run dev"
    ) -WindowStyle Normal
    
    Write-Host "Frontend start command executed. Check the new terminal window." -ForegroundColor Yellow
}

Write-Host "`nService manager: $Service service starting on port $Port" -ForegroundColor Green
