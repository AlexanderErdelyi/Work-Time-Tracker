[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 5000,

    [string]$DataDirectory = (Join-Path $PSScriptRoot 'Data')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($DataDirectory)) {
    throw 'DataDirectory cannot be empty.'
}

if (-not [System.IO.Path]::IsPathRooted($DataDirectory)) {
    $DataDirectory = Join-Path $PSScriptRoot $DataDirectory
}

$DataDirectory = [System.IO.Path]::GetFullPath($DataDirectory)
$pidFilePath = Join-Path $DataDirectory 'timekeeper-api.pid'

function Get-ListeningConnection {
    param([int]$TargetPort)

    Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

$pidFromFile = $null
if (Test-Path -LiteralPath $pidFilePath) {
    $raw = (Get-Content -LiteralPath $pidFilePath -Raw).Trim()
    $parsed = 0
    if ([int]::TryParse($raw, [ref]$parsed)) {
        $pidFromFile = $parsed
    }
}

$connection = Get-ListeningConnection -TargetPort $Port
$ownerPid = $null
$ownerName = $null
if ($connection) {
    $ownerPid = [int]$connection.OwningProcess
    $ownerName = (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue).ProcessName
    if ([string]::IsNullOrWhiteSpace($ownerName)) {
        $ownerName = 'unknown'
    }
}

Write-Host 'Timekeeper Shared API Status' -ForegroundColor Cyan
Write-Host "Port: $Port"
Write-Host "Data directory: $DataDirectory"
Write-Host "PID file: $pidFilePath"

if ($pidFromFile) {
    $pidProc = Get-Process -Id $pidFromFile -ErrorAction SilentlyContinue
    if ($pidProc) {
        Write-Host "PID file process: RUNNING (PID $pidFromFile, $($pidProc.ProcessName))" -ForegroundColor Green
    } else {
        Write-Host "PID file process: NOT RUNNING (stale PID $pidFromFile)" -ForegroundColor Yellow
    }
} else {
    Write-Host 'PID file process: NOT FOUND' -ForegroundColor Yellow
}

if ($ownerPid) {
    Write-Host "Port listener: IN USE by PID $ownerPid ($ownerName)" -ForegroundColor Green
} else {
    Write-Host 'Port listener: FREE' -ForegroundColor Yellow
}

if ($pidFromFile -and $ownerPid -and $pidFromFile -eq $ownerPid) {
    Write-Host 'Overall: Shared API is running and matches PID file.' -ForegroundColor Green
    exit 0
}

if (-not $pidFromFile -and -not $ownerPid) {
    Write-Host 'Overall: Shared API is stopped.' -ForegroundColor Yellow
    exit 1
}

Write-Host 'Overall: Partial state detected (PID/port mismatch). Consider STOP then START.' -ForegroundColor Yellow
exit 2
