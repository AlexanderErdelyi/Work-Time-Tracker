[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 5000,

    [string]$DataDirectory = (Join-Path $PSScriptRoot 'Data'),

    [switch]$KillPortOwner
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

function Remove-ScriptPid {
    param([string]$Path)

    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    }
}

$stopped = $false

if (Test-Path -LiteralPath $pidFilePath) {
    $raw = (Get-Content -LiteralPath $pidFilePath -Raw).Trim()
    $parsedPid = 0
    if ([int]::TryParse($raw, [ref]$parsedPid)) {
        $savedPid = $parsedPid
        $proc = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Stopping Timekeeper shared API process PID $savedPid..." -ForegroundColor Cyan
            Stop-Process -Id $savedPid -Force
            $stopped = $true
        }
    }
    Remove-ScriptPid -Path $pidFilePath
}

$connection = Get-ListeningConnection -TargetPort $Port
if ($connection) {
    $ownerPid = [int]$connection.OwningProcess
    if ($KillPortOwner) {
        Write-Host "Stopping process PID $ownerPid currently listening on port $Port..." -ForegroundColor Yellow
        Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
        $stopped = $true
    } else {
        $name = (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue).ProcessName
        if ([string]::IsNullOrWhiteSpace($name)) { $name = 'unknown' }
        Write-Warning "Port $Port is still in use by PID $ownerPid ($name)."
        Write-Host "If this is your shared instance, run again with -KillPortOwner." -ForegroundColor Yellow
    }
}

if ($stopped) {
    Start-Sleep -Seconds 1
}

$after = Get-ListeningConnection -TargetPort $Port
if ($after) {
    Write-Warning "Port $Port is still in use."
    exit 1
}

Write-Host "Shared API stopped. Port $Port is free." -ForegroundColor Green
