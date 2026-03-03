[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$PackageZipPath,

    [string]$DeployRoot = 'C:\Timekeeper-Shared-Host',

    [ValidateRange(1, 65535)]
    [int]$Port = 5000,

    [switch]$UseHttps,

    [ValidateRange(1, 65535)]
    [int]$HttpsPort = 5443,

    [string]$CertificatePath,

    [string]$CertificatePassword,

    # Optional: folder containing the cert (.pfx) and password file (.pfx.password.txt).
    # If provided and the cert is not yet in $DeployRoot\certs\, it will be copied there
    # so subsequent deployments work without this parameter.
    [string]$CertDirectory,

    [ValidateRange(1, 20)]
    [int]$KeepBackups = 3
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Trim any accidental leading/trailing whitespace from path parameters that
# come from environment variables or GitHub Actions variables.
$PackageZipPath   = $PackageZipPath.Trim()
$DeployRoot       = $DeployRoot.Trim()
$CertificatePath  = $CertificatePath.Trim()
$CertificatePassword = $CertificatePassword.Trim()
$CertDirectory    = $CertDirectory.Trim()

function Invoke-RoboCopy {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Source,
        [Parameter(Mandatory = $true)]
        [string]$Destination,
        [switch]$Mirror,
        [string[]]$ExcludeDirs = @()
    )

    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Robocopy source does not exist: $Source"
    }

    if (-not (Test-Path -LiteralPath $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    $arguments = @(
        $Source,
        $Destination,
        '/E',
        '/R:2',
        '/W:1',
        '/NFL',
        '/NDL',
        '/NP',
        '/NJH',
        '/NJS'
    )

    if ($Mirror) {
        $arguments += '/MIR'
    }

    if ($ExcludeDirs.Count -gt 0) {
        $arguments += '/XD'
        $arguments += $ExcludeDirs
    }

    & robocopy @arguments | Out-Null
    $exitCode = $LASTEXITCODE
    if ($exitCode -gt 7) {
        throw "Robocopy failed with exit code $exitCode (Source: $Source, Destination: $Destination)."
    }
}

function Get-CertificatePasswordFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PasswordFilePath
    )

    if (-not (Test-Path -LiteralPath $PasswordFilePath)) {
        return $null
    }

    $passwordLine = Get-Content -LiteralPath $PasswordFilePath | Where-Object { $_ -like 'Password:*' } | Select-Object -First 1
    if ([string]::IsNullOrWhiteSpace($passwordLine)) {
        return $null
    }

    return $passwordLine.Substring($passwordLine.IndexOf(':') + 1).Trim()
}

function Stop-CurrentInstance {
    param(
        [string]$Root,
        [int]$TargetPort
    )

    $stopWrapper = Join-Path $Root 'STOP_SHARED_HOST.ps1'
    $stopScript = Join-Path $Root 'stop-api-shared.ps1'

    if (Test-Path -LiteralPath $stopWrapper) {
        Write-Host "Stopping current shared host using $stopWrapper ..." -ForegroundColor Cyan
        & $stopWrapper -Port $TargetPort -KillPortOwner
        return
    }

    if (Test-Path -LiteralPath $stopScript) {
        Write-Host "Stopping current shared host using $stopScript ..." -ForegroundColor Cyan
        & $stopScript -Port $TargetPort -KillPortOwner
        return
    }

    Write-Host 'No stop script found in deploy root. Skipping stop step.' -ForegroundColor Yellow
}

function Start-Instance {
    param(
        [string]$Root,
        [int]$TargetPort,
        [switch]$EnableHttps,
        [int]$TargetHttpsPort,
        [string]$CertPath,
        [string]$CertPassword
    )

    $runScript = Join-Path $Root 'run-api-shared.ps1'
    if (-not (Test-Path -LiteralPath $runScript)) {
        throw "Start script not found: $runScript"
    }

    $runArgs = @{
        Port = $TargetPort
        Environment = 'Production'
        BindAddress = '0.0.0.0'
        Background = $true
        ForceRestart = $true
    }

    if ($EnableHttps) {
        $runArgs.UseHttps = $true
        $runArgs.HttpsPort = $TargetHttpsPort
        $runArgs.CertificatePath = $CertPath
        $runArgs.CertificatePassword = $CertPassword
    }

    Write-Host 'Starting shared host...' -ForegroundColor Cyan
    & $runScript @runArgs
}

function Assert-Healthy {
    param(
        [string]$Root,
        [int]$TargetPort,
        [switch]$EnableHttps,
        [int]$TargetHttpsPort
    )

    $statusScript = Join-Path $Root 'status-api-shared.ps1'
    if (Test-Path -LiteralPath $statusScript) {
        & $statusScript -Port $TargetPort
        if ($LASTEXITCODE -ne 0) {
            throw "Status script reported unhealthy state with exit code $LASTEXITCODE."
        }
    }

    $httpConnection = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $httpConnection) {
        throw "HTTP port $TargetPort is not listening after deployment."
    }

    if ($EnableHttps) {
        $httpsConnection = Get-NetTCPConnection -LocalPort $TargetHttpsPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $httpsConnection) {
            throw "HTTPS port $TargetHttpsPort is not listening after deployment."
        }
    }
}

if (-not [System.IO.Path]::IsPathRooted($PackageZipPath)) {
    $PackageZipPath = Join-Path (Get-Location).Path $PackageZipPath
}
$PackageZipPath = [System.IO.Path]::GetFullPath($PackageZipPath)
if (-not (Test-Path -LiteralPath $PackageZipPath)) {
    throw "Package ZIP not found: $PackageZipPath"
}

if (-not [System.IO.Path]::IsPathRooted($DeployRoot)) {
    $DeployRoot = Join-Path (Get-Location).Path $DeployRoot
}
$DeployRoot = [System.IO.Path]::GetFullPath($DeployRoot)

if (-not (Test-Path -LiteralPath $DeployRoot)) {
    New-Item -ItemType Directory -Path $DeployRoot -Force | Out-Null
}

$backupRoot = Join-Path $DeployRoot 'deploy-backups'
$excludeDirectories = @(
    (Join-Path $DeployRoot 'Data'),
    (Join-Path $DeployRoot 'certs'),
    $backupRoot
)

if (-not (Test-Path -LiteralPath $backupRoot)) {
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
}

$tempBase = if (-not [string]::IsNullOrWhiteSpace($env:RUNNER_TEMP)) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$tempExtractRoot = Join-Path $tempBase ("timekeeper-deploy-" + [Guid]::NewGuid().ToString('N'))
$backupDir = $null
$attemptedRestore = $false

try {
    New-Item -ItemType Directory -Path $tempExtractRoot -Force | Out-Null

    Write-Host "Extracting package: $PackageZipPath" -ForegroundColor Cyan
    Expand-Archive -LiteralPath $PackageZipPath -DestinationPath $tempExtractRoot -Force

    $backupDir = Join-Path $backupRoot (Get-Date -Format 'yyyyMMdd-HHmmss')

    $isExistingInstall = Test-Path -LiteralPath (Join-Path $DeployRoot 'run-api-shared.ps1')
    if ($isExistingInstall) {
        Write-Host "Creating deployment backup at: $backupDir" -ForegroundColor Cyan
        Invoke-RoboCopy -Source $DeployRoot -Destination $backupDir -ExcludeDirs $excludeDirectories
    }

    Stop-CurrentInstance -Root $DeployRoot -TargetPort $Port

    Write-Host 'Applying package to deploy root...' -ForegroundColor Cyan
    Invoke-RoboCopy -Source $tempExtractRoot -Destination $DeployRoot -Mirror -ExcludeDirs $excludeDirectories

    if ($UseHttps) {
        # --- Cert directory seeding ---
        # If the caller pointed us at an external CertDirectory (e.g. from a previous
        # installation or a manual cert-generation run), copy the cert and its password
        # file into $DeployRoot\certs\ so the standard auto-detect works now and on
        # future deployments (certs\ is excluded from backup/overwrite by design).
        if (-not [string]::IsNullOrWhiteSpace($CertDirectory)) {
            $certDirectory = [System.IO.Path]::GetFullPath($CertDirectory)
            if (-not (Test-Path -LiteralPath $certDirectory)) {
                throw "CertDirectory does not exist: $certDirectory"
            }

            $deployedCertsDir = Join-Path $DeployRoot 'certs'
            if (-not (Test-Path -LiteralPath $deployedCertsDir)) {
                New-Item -ItemType Directory -Path $deployedCertsDir -Force | Out-Null
            }

            # Copy every .pfx and matching .password.txt from the provided directory.
            Get-ChildItem -LiteralPath $certDirectory -Filter '*.pfx' -File | ForEach-Object {
                $destPfx = Join-Path $deployedCertsDir $_.Name
                Copy-Item -LiteralPath $_.FullName -Destination $destPfx -Force
                Write-Host "Seeded cert: $($_.Name) -> $deployedCertsDir" -ForegroundColor Cyan

                $srcPassword = "$($_.FullName).password.txt"
                if (Test-Path -LiteralPath $srcPassword) {
                    Copy-Item -LiteralPath $srcPassword -Destination "$destPfx.password.txt" -Force
                    Write-Host "Seeded password file: $($_.Name).password.txt -> $deployedCertsDir" -ForegroundColor Cyan
                }
            }
        }

        # --- Cert path resolution ---
        if ([string]::IsNullOrWhiteSpace($CertificatePath)) {
            $candidatePaths = @(
                (Join-Path $DeployRoot 'certs\timekeeper-https-fqdn.pfx'),
                (Join-Path $DeployRoot 'certs\timekeeper-https.pfx')
            )
            $CertificatePath = $candidatePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        }

        if ([string]::IsNullOrWhiteSpace($CertificatePath)) {
            throw @"
UseHttps is enabled but no certificate could be found.
Looked in:
  $DeployRoot\certs\timekeeper-https-fqdn.pfx
  $DeployRoot\certs\timekeeper-https.pfx

To fix this, either:
  a) Run create-shared-https-cert.ps1 on the host first, then re-run this
     script with -CertDirectory pointing to the folder containing the .pfx file.
  b) Pass -CertificatePath with the explicit path to your .pfx file.
"@
        }

        if (-not [System.IO.Path]::IsPathRooted($CertificatePath)) {
            $CertificatePath = Join-Path $DeployRoot $CertificatePath
        }
        $CertificatePath = [System.IO.Path]::GetFullPath($CertificatePath)

        if ([string]::IsNullOrWhiteSpace($CertificatePassword)) {
            $passwordFilePath = "$CertificatePath.password.txt"
            $CertificatePassword = Get-CertificatePasswordFromFile -PasswordFilePath $passwordFilePath
        }

        if ([string]::IsNullOrWhiteSpace($CertificatePassword)) {
            throw @"
UseHttps is enabled but the certificate password is missing.
Expected password file: $CertificatePath.password.txt (line format: 'Password: <value>')
Alternatively pass -CertificatePassword explicitly or set the SHARED_HOST_CERT_PASSWORD secret.
"@
        }
    }

    Start-Instance -Root $DeployRoot -TargetPort $Port -EnableHttps:$UseHttps -TargetHttpsPort $HttpsPort -CertPath $CertificatePath -CertPassword $CertificatePassword
    Assert-Healthy -Root $DeployRoot -TargetPort $Port -EnableHttps:$UseHttps -TargetHttpsPort $HttpsPort

    if (Test-Path -LiteralPath $backupRoot) {
        $oldBackups = Get-ChildItem -LiteralPath $backupRoot -Directory | Sort-Object CreationTime -Descending | Select-Object -Skip $KeepBackups
        foreach ($backup in $oldBackups) {
            Remove-Item -LiteralPath $backup.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host 'Deployment completed successfully.' -ForegroundColor Green
}
catch {
    $errorMessage = $_.Exception.Message
    Write-Error "Deployment failed: $errorMessage"

    if ($backupDir -and (Test-Path -LiteralPath $backupDir)) {
        Write-Host "Attempting rollback from backup: $backupDir" -ForegroundColor Yellow
        $attemptedRestore = $true

        try {
            Stop-CurrentInstance -Root $DeployRoot -TargetPort $Port
            Invoke-RoboCopy -Source $backupDir -Destination $DeployRoot -Mirror -ExcludeDirs $excludeDirectories
            Start-Instance -Root $DeployRoot -TargetPort $Port -EnableHttps:$UseHttps -TargetHttpsPort $HttpsPort -CertPath $CertificatePath -CertPassword $CertificatePassword
            Assert-Healthy -Root $DeployRoot -TargetPort $Port -EnableHttps:$UseHttps -TargetHttpsPort $HttpsPort
            Write-Host 'Rollback completed successfully.' -ForegroundColor Green
        }
        catch {
            Write-Error "Rollback failed: $($_.Exception.Message)"
        }
    }

    if (-not $attemptedRestore) {
        Write-Warning 'No backup was available for rollback.'
    }

    throw
}
finally {
    if (Test-Path -LiteralPath $tempExtractRoot) {
        Remove-Item -LiteralPath $tempExtractRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
