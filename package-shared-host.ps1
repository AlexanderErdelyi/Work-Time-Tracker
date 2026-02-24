[CmdletBinding()]
param(
    [string]$Version,
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$versionFile = Join-Path $repoRoot 'version.json'

if ([string]::IsNullOrWhiteSpace($Version)) {
    if (Test-Path -LiteralPath $versionFile) {
        $versionJson = Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json
        $Version = $versionJson.version
    }
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = 'dev'
}

$releaseRoot = Join-Path $repoRoot 'Release'
$packageName = "Timekeeper-Shared-Host-v$Version"
$packageDir = Join-Path $releaseRoot $packageName
$zipPath = Join-Path $releaseRoot "$packageName.zip"

$apiProject = Join-Path $repoRoot 'Timekeeper.Api\Timekeeper.Api.csproj'
$apiBinDir = $null
$coreBinDir = $null

function Resolve-BinDirectory {
    param(
        [string]$ProjectName
    )

    $releasePath = Join-Path $repoRoot "$ProjectName\bin\Release\net8.0"
    if (Test-Path -LiteralPath $releasePath) {
        return $releasePath
    }

    $debugPath = Join-Path $repoRoot "$ProjectName\bin\Debug\net8.0"
    if (Test-Path -LiteralPath $debugPath) {
        Write-Host "Release output missing for $ProjectName, using Debug binaries." -ForegroundColor Yellow
        return $debugPath
    }

    return $null
}

$sharedRunScript = Join-Path $repoRoot 'run-api-shared.ps1'
$sharedStopScript = Join-Path $repoRoot 'stop-api-shared.ps1'
$sharedStatusScript = Join-Path $repoRoot 'status-api-shared.ps1'
$sharedGuide = Join-Path $repoRoot 'SHARED_DATASET_SETUP.md'

if (-not (Test-Path -LiteralPath $sharedRunScript)) {
    throw "Missing required file: $sharedRunScript"
}
if (-not (Test-Path -LiteralPath $sharedGuide)) {
    throw "Missing required file: $sharedGuide"
}
if (-not (Test-Path -LiteralPath $sharedStopScript)) {
    throw "Missing required file: $sharedStopScript"
}
if (-not (Test-Path -LiteralPath $sharedStatusScript)) {
    throw "Missing required file: $sharedStatusScript"
}

if (-not $SkipBuild) {
    Write-Host 'Building Timekeeper API (Release)...' -ForegroundColor Cyan
    dotnet build $apiProject -c Release | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw 'dotnet build failed.'
    }
}

$apiBinDir = Resolve-BinDirectory -ProjectName 'Timekeeper.Api'
$coreBinDir = Resolve-BinDirectory -ProjectName 'Timekeeper.Core'

if (-not $apiBinDir) {
    throw 'API binaries not found. Run dotnet build first or run this script without -SkipBuild.'
}
if (-not $coreBinDir) {
    throw 'Core binaries not found. Run dotnet build first or run this script without -SkipBuild.'
}

if (Test-Path -LiteralPath $packageDir) {
    Remove-Item -LiteralPath $packageDir -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir 'Timekeeper.Api\bin\Release\net8.0') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir 'Timekeeper.Core\bin\Release\net8.0') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $packageDir 'Timekeeper.Api\wwwroot') -Force | Out-Null

Copy-Item -LiteralPath $sharedRunScript -Destination (Join-Path $packageDir 'run-api-shared.ps1') -Force
Copy-Item -LiteralPath $sharedStopScript -Destination (Join-Path $packageDir 'stop-api-shared.ps1') -Force
Copy-Item -LiteralPath $sharedStatusScript -Destination (Join-Path $packageDir 'status-api-shared.ps1') -Force
Copy-Item -LiteralPath $sharedGuide -Destination (Join-Path $packageDir 'SHARED_DATASET_SETUP.md') -Force

Copy-Item -LiteralPath (Join-Path $repoRoot 'Timekeeper.Api\appsettings.json') -Destination (Join-Path $packageDir 'Timekeeper.Api\appsettings.json') -Force
if (Test-Path -LiteralPath (Join-Path $repoRoot 'Timekeeper.Api\appsettings.Development.json')) {
    Copy-Item -LiteralPath (Join-Path $repoRoot 'Timekeeper.Api\appsettings.Development.json') -Destination (Join-Path $packageDir 'Timekeeper.Api\appsettings.Development.json') -Force
}

Copy-Item -Path (Join-Path $apiBinDir '*') -Destination (Join-Path $packageDir 'Timekeeper.Api\bin\Release\net8.0') -Recurse -Force
Copy-Item -Path (Join-Path $coreBinDir '*') -Destination (Join-Path $packageDir 'Timekeeper.Core\bin\Release\net8.0') -Recurse -Force
Copy-Item -Path (Join-Path $repoRoot 'Timekeeper.Api\wwwroot\*') -Destination (Join-Path $packageDir 'Timekeeper.Api\wwwroot') -Recurse -Force

$startScriptPath = Join-Path $packageDir 'START_SHARED_HOST.ps1'
$startScriptContent = @'
param(
    [int]$Port = 5000
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-ListeningConnection {
    param([int]$TargetPort)
    Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Get-NextFreePort {
    param(
        [int]$StartPort,
        [int]$MaxAttempts = 20
    )

    for ($offset = 1; $offset -le $MaxAttempts; $offset++) {
        $candidate = $StartPort + $offset
        if ($candidate -gt 65535) { break }
        if (-not (Get-ListeningConnection -TargetPort $candidate)) {
            return $candidate
        }
    }

    return $null
}

function Ensure-FirewallRule {
    param([int]$TargetPort)

    $ruleName = "Timekeeper API $TargetPort"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existing) {
        return
    }

    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        Write-Host "Firewall rule '$ruleName' not found. Run this script as Administrator once to auto-create it." -ForegroundColor Yellow
        return
    }

    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $TargetPort | Out-Null
    Write-Host "Firewall rule created: $ruleName" -ForegroundColor Green
}

$selectedPort = $Port
$inUse = Get-ListeningConnection -TargetPort $selectedPort

if ($inUse) {
    $ownerPid = [int]$inUse.OwningProcess
    $name = (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue).ProcessName
    if ([string]::IsNullOrWhiteSpace($name)) { $name = 'unknown' }

    Write-Host "Port $selectedPort is currently in use by PID $ownerPid ($name)." -ForegroundColor Yellow
    $recommended = Get-NextFreePort -StartPort $selectedPort
    if (-not $recommended) {
        throw "No free port found in the next 20 ports after $selectedPort."
    }

    $selectedPort = $recommended
    Write-Host "Recommended next free port: $selectedPort" -ForegroundColor Cyan
} else {
    Write-Host "Port $selectedPort is free." -ForegroundColor Green
}

$confirmation = Read-Host "Type $selectedPort to confirm startup on this port"
if ($confirmation -ne "$selectedPort") {
    Write-Host "Confirmation failed. Startup cancelled." -ForegroundColor Red
    exit 1
}

Ensure-FirewallRule -TargetPort $selectedPort

& (Join-Path $scriptRoot 'run-api-shared.ps1') -Port $selectedPort -Environment Production -BindAddress 0.0.0.0 -Background
'@
Set-Content -LiteralPath $startScriptPath -Value $startScriptContent -Encoding UTF8

$stopScriptPath = Join-Path $packageDir 'STOP_SHARED_HOST.ps1'
$stopScriptContent = @'
param(
    [int]$Port = 5000,
    [switch]$KillPortOwner
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $scriptRoot 'stop-api-shared.ps1') -Port $Port -KillPortOwner:$KillPortOwner
'@
Set-Content -LiteralPath $stopScriptPath -Value $stopScriptContent -Encoding UTF8

$statusScriptPath = Join-Path $packageDir 'STATUS_SHARED_HOST.ps1'
$statusScriptContent = @'
param(
    [int]$Port = 5000
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $scriptRoot 'status-api-shared.ps1') -Port $Port
'@
Set-Content -LiteralPath $statusScriptPath -Value $statusScriptContent -Encoding UTF8

Compress-Archive -Path (Join-Path $packageDir '*') -DestinationPath $zipPath -Force

Write-Host "Shared host package created: $packageDir" -ForegroundColor Green
Write-Host "Shared host ZIP created: $zipPath" -ForegroundColor Green
Write-Host "Copy the extracted folder to host machine and run START_SHARED_HOST.ps1" -ForegroundColor Yellow
