[CmdletBinding()]
param(
    [string]$InstallRoot = 'C:\actions-runner\timekeeper-shared',

    [string]$RunnerToken,

    [switch]$DeleteFiles
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Elevated {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        throw 'Run this script in an elevated PowerShell (Run as Administrator).'
    }
}

Assert-Elevated

if (-not [System.IO.Path]::IsPathRooted($InstallRoot)) {
    $InstallRoot = Join-Path (Get-Location).Path $InstallRoot
}
$InstallRoot = [System.IO.Path]::GetFullPath($InstallRoot)

if (-not (Test-Path -LiteralPath $InstallRoot)) {
    throw "Runner folder not found: $InstallRoot"
}

$configCmd = Join-Path $InstallRoot 'config.cmd'
$svcCmd = Join-Path $InstallRoot 'svc.cmd'
$runnerMarker = Join-Path $InstallRoot '.runner'

Push-Location $InstallRoot
try {
    if (Test-Path -LiteralPath $svcCmd) {
        Write-Host 'Stopping runner service...' -ForegroundColor Cyan
        & $svcCmd stop | Out-Null

        Write-Host 'Uninstalling runner service...' -ForegroundColor Cyan
        & $svcCmd uninstall | Out-Null
    } else {
        Write-Host 'No svc.cmd found, skipping service removal.' -ForegroundColor Yellow
    }

    if ((Test-Path -LiteralPath $runnerMarker) -and (Test-Path -LiteralPath $configCmd)) {
        if ([string]::IsNullOrWhiteSpace($RunnerToken)) {
            Write-Host 'Runner token not provided; skipping GitHub unregister step (service/files still removed).' -ForegroundColor Yellow
        } else {
            Write-Host 'Removing runner registration from GitHub...' -ForegroundColor Cyan
            & $configCmd remove --token $RunnerToken

            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Runner unregister returned exit code $LASTEXITCODE."
            }
        }
    }
}
finally {
    Pop-Location
}

if ($DeleteFiles) {
    Write-Host "Removing runner files at: $InstallRoot" -ForegroundColor Cyan
    Remove-Item -LiteralPath $InstallRoot -Recurse -Force
}

Write-Host 'Runner removal completed.' -ForegroundColor Green
if (-not $DeleteFiles) {
    Write-Host 'Files were kept. Use -DeleteFiles to remove the runner folder as well.' -ForegroundColor Yellow
}
