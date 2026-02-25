[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RunnerUrl,

    [string]$RunnerToken,

    [string]$InstallRoot = 'C:\actions-runner\timekeeper-shared',

    [string]$RunnerName = ("$env:COMPUTERNAME-timekeeper-shared"),

    [string]$RunnerLabels = 'timekeeper-shared',

    [switch]$ForceReconfigure
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

function Get-LatestRunnerAsset {
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/actions/runner/releases/latest' -Headers @{ 'User-Agent' = 'timekeeper-runner-bootstrap' }
    $asset = $release.assets | Where-Object { $_.name -match '^actions-runner-win-x64-.*\.zip$' } | Select-Object -First 1

    if (-not $asset) {
        throw 'Could not find latest Windows x64 runner asset from actions/runner releases.'
    }

    return $asset
}

function Install-RunnerFiles {
    param([string]$TargetDir)

    $configCmd = Join-Path $TargetDir 'config.cmd'
    if (Test-Path -LiteralPath $configCmd) {
        Write-Host 'Runner files already exist. Skipping download.' -ForegroundColor Yellow
        return
    }

    $asset = Get-LatestRunnerAsset
    $zipPath = Join-Path $env:TEMP $asset.name

    Write-Host "Downloading runner: $($asset.name)" -ForegroundColor Cyan
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -Headers @{ 'User-Agent' = 'timekeeper-runner-bootstrap' }

    Write-Host "Extracting runner to: $TargetDir" -ForegroundColor Cyan
    Expand-Archive -LiteralPath $zipPath -DestinationPath $TargetDir -Force
}

function Set-RunnerConfiguration {
    param(
        [string]$TargetDir,
        [string]$Url,
        [string]$Token,
        [string]$Name,
        [string]$Labels,
        [bool]$ShouldForce
    )

    $runnerMarker = Join-Path $TargetDir '.runner'
    $configCmd = Join-Path $TargetDir 'config.cmd'

    Push-Location $TargetDir
    try {
        if ((Test-Path -LiteralPath $runnerMarker) -and -not $ShouldForce) {
            Write-Host 'Runner already configured. Use -ForceReconfigure to re-register.' -ForegroundColor Yellow
            return
        }

        if ((Test-Path -LiteralPath $runnerMarker) -and $ShouldForce) {
            Write-Host 'Removing existing runner configuration...' -ForegroundColor Yellow
            & $configCmd remove --token $Token
        }

        Write-Host 'Configuring runner (unattended)...' -ForegroundColor Cyan
        & $configCmd --unattended --replace --url $Url --token $Token --name $Name --labels $Labels --work '_work'

        if ($LASTEXITCODE -ne 0) {
            throw "Runner configuration failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Start-RunnerService {
    param([string]$TargetDir)

    $svcCmd = Join-Path $TargetDir 'svc.cmd'

    Push-Location $TargetDir
    try {
        Write-Host 'Installing runner service (if not installed)...' -ForegroundColor Cyan
        & $svcCmd install | Out-Null

        Write-Host 'Starting runner service...' -ForegroundColor Cyan
        & $svcCmd start | Out-Null
    }
    finally {
        Pop-Location
    }

    $service = Get-Service | Where-Object { $_.Name -like 'actions.runner.*' -and $_.Status -eq 'Running' } | Select-Object -First 1
    if (-not $service) {
        Write-Warning 'Runner service was configured, but running service could not be confirmed automatically. Please check Services.msc.'
    } else {
        Write-Host "Runner service is running: $($service.Name)" -ForegroundColor Green
    }
}

Assert-Elevated

if ([string]::IsNullOrWhiteSpace($RunnerToken)) {
    $RunnerToken = Read-Host 'Enter runner registration token'
}

if ([string]::IsNullOrWhiteSpace($RunnerToken)) {
    throw 'Runner token is required.'
}

if (-not [System.IO.Path]::IsPathRooted($InstallRoot)) {
    $InstallRoot = Join-Path (Get-Location).Path $InstallRoot
}
$InstallRoot = [System.IO.Path]::GetFullPath($InstallRoot)

if (-not (Test-Path -LiteralPath $InstallRoot)) {
    New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
}

Install-RunnerFiles -TargetDir $InstallRoot
Set-RunnerConfiguration -TargetDir $InstallRoot -Url $RunnerUrl -Token $RunnerToken -Name $RunnerName -Labels $RunnerLabels -ShouldForce:$ForceReconfigure
Start-RunnerService -TargetDir $InstallRoot

Write-Host ''
Write-Host 'Self-hosted runner bootstrap completed.' -ForegroundColor Green
Write-Host "Runner URL: $RunnerUrl" -ForegroundColor Cyan
Write-Host "Runner Name: $RunnerName" -ForegroundColor Cyan
Write-Host "Runner Labels: $RunnerLabels" -ForegroundColor Cyan
Write-Host "Install Path: $InstallRoot" -ForegroundColor Cyan
