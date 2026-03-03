[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 5000,

    [switch]$UseHttps,

    [ValidateRange(1, 65535)]
    [int]$HttpsPort = 5443,

    [string]$CertificatePath,

    [string]$CertificatePassword,

    [string]$DataDirectory = (Join-Path $PSScriptRoot 'Data'),

    [string]$Environment = 'Production',

    [string]$BindAddress = '0.0.0.0',

    [switch]$Background,

    [switch]$ForceRestart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($DataDirectory)) {
    throw 'DataDirectory cannot be empty.'
}

if (-not [System.IO.Path]::IsPathRooted($DataDirectory)) {
    $DataDirectory = Join-Path $repoRoot $DataDirectory
}

$DataDirectory = [System.IO.Path]::GetFullPath($DataDirectory)

if (-not (Test-Path -LiteralPath $DataDirectory)) {
    New-Item -ItemType Directory -Path $DataDirectory -Force | Out-Null
}

$dbPath = Join-Path $DataDirectory 'timekeeper.db'
$pidFilePath = Join-Path $DataDirectory 'timekeeper-api.pid'
$apiUrl = 'http://{0}:{1}' -f $BindAddress, $Port
$httpsUrl = 'https://{0}:{1}' -f $BindAddress, $HttpsPort

function Get-ListeningConnection {
    param([int]$TargetPort)

    Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

function Get-ScriptPid {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $raw = (Get-Content -LiteralPath $Path -Raw).Trim()
    $parsedPid = 0
    if ([int]::TryParse($raw, [ref]$parsedPid)) {
        return $parsedPid
    }

    return $null
}

function Write-ScriptPid {
    param(
        [string]$Path,
        [int]$PidValue
    )

    Set-Content -LiteralPath $Path -Value $PidValue -Encoding ASCII
}

function Remove-ScriptPid {
    param([string]$Path)

    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    }
}

function Wait-ForPortListening {
    param(
        [int]$TargetPort,
        [int]$ProcessId,
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $connection = Get-ListeningConnection -TargetPort $TargetPort
        if ($connection) {
            return $true
        }

        $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if (-not $process) {
            return $false
        }

        Start-Sleep -Milliseconds 500
    }

    return $false
}

function Start-ScheduledBackgroundProcess {
    # Launches the process via the Windows Task Scheduler service (running as SYSTEM).
    # Because the Task Scheduler's svchost.exe is NOT inside the GitHub Actions runner's
    # Windows Job Object, the spawned dotnet process is fully independent and survives
    # when the Actions step / job ends.
    param(
        [Parameter(Mandatory = $true)] [string]   $FilePath,
        [Parameter(Mandatory = $true)] [string[]] $ArgumentList,
        [Parameter(Mandatory = $true)] [string]   $WorkingDirectory,
        [hashtable] $EnvironmentVariables = @{},
        [Parameter(Mandatory = $true)] [string]   $StandardOutputPath,
        [Parameter(Mandatory = $true)] [string]   $StandardErrorPath
    )

    $taskName       = 'Timekeeper-API-' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
    $tempDir        = [System.IO.Path]::GetTempPath()
    $launcherScript = Join-Path $tempDir "$taskName.ps1"
    $pidWaitFile    = Join-Path $tempDir "$taskName.pid"

    # Build the single-use launcher script:
    #   1. Set environment variables
    #   2. Spawn dotnet (or whatever $FilePath is)
    #   3. Write the spawned PID to $pidWaitFile so the caller can read it
    $sb = [System.Text.StringBuilder]::new()
    foreach ($kvp in $EnvironmentVariables.GetEnumerator()) {
        $escapedVal = $kvp.Value -replace "'", "''"
        [void]$sb.AppendLine("`$env:$($kvp.Key) = '$escapedVal'")
    }
    $eFile    = $FilePath           -replace "'", "''"
    $eWorkDir = $WorkingDirectory   -replace "'", "''"
    $eStdout  = $StandardOutputPath -replace "'", "''"
    $eStderr  = $StandardErrorPath  -replace "'", "''"
    $ePidFile = $pidWaitFile        -replace "'", "''"
    $argParts    = $ArgumentList | ForEach-Object { "'" + ($_ -replace "'", "''") + "'" }
    $argArrayStr = '@(' + ($argParts -join ', ') + ')'
    [void]$sb.AppendLine("`$proc = Start-Process -FilePath '$eFile' ``")
    [void]$sb.AppendLine("    -ArgumentList $argArrayStr ``")
    [void]$sb.AppendLine("    -WorkingDirectory '$eWorkDir' ``")
    [void]$sb.AppendLine("    -PassThru -WindowStyle Hidden ``")
    [void]$sb.AppendLine("    -RedirectStandardOutput '$eStdout' ``")
    [void]$sb.AppendLine("    -RedirectStandardError  '$eStderr'")
    [void]$sb.AppendLine("Set-Content -LiteralPath '$ePidFile' -Value `$proc.Id -Encoding ASCII")
    Set-Content -LiteralPath $launcherScript -Value $sb.ToString() -Encoding UTF8

    Write-Host "Registering one-shot scheduler task: $taskName" -ForegroundColor Cyan
    $action    = New-ScheduledTaskAction `
                     -Execute 'powershell.exe' `
                     -Argument "-NonInteractive -NoProfile -ExecutionPolicy Bypass -File `"$launcherScript`"" `
                     -WorkingDirectory $WorkingDirectory
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $settings  = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -MultipleInstances IgnoreNew
    $trigger   = New-ScheduledTaskTrigger -Once -At (Get-Date).AddYears(10)  # never auto-fires; started manually below
    Register-ScheduledTask -TaskName $taskName -Action $action `
        -Principal $principal -Settings $settings -Trigger $trigger -Force | Out-Null

    try {
        Start-ScheduledTask -TaskName $taskName

        # Wait up to 20 s for the launcher script to write the dotnet PID
        $deadline = (Get-Date).AddSeconds(20)
        while (-not (Test-Path -LiteralPath $pidWaitFile) -and (Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 300
        }

        if (-not (Test-Path -LiteralPath $pidWaitFile)) {
            throw ("Launcher did not produce a PID file within 20 seconds. " +
                   "The scheduled task may have failed. Check Windows Event Viewer " +
                   "(Applications and Services Logs > Microsoft > Windows > TaskScheduler > Operational).")
        }

        $parsedPid = 0
        $rawPid    = (Get-Content -LiteralPath $pidWaitFile -Raw -ErrorAction SilentlyContinue).Trim()
        if (-not [int]::TryParse($rawPid, [ref]$parsedPid)) {
            throw "Launcher PID file contained an invalid value: '$rawPid'"
        }

        Write-Host "Process started by Task Scheduler (survives runner job end), PID: $parsedPid" -ForegroundColor Green
        return [pscustomobject]@{ Id = $parsedPid }
    }
    finally {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
        Start-Sleep -Milliseconds 300
        Remove-Item -LiteralPath $launcherScript -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $pidWaitFile    -Force -ErrorAction SilentlyContinue
    }
}

function Start-BackgroundProcess {
    # In GitHub Actions the runner places every child of Start-Process into a Windows
    # Job Object. The OS kills them all when the job step ends -- even if RUNNER_TRACKING_ID
    # is removed. Use the Task Scheduler path in CI so the process is fully independent.
    # Outside CI, plain Start-Process is used (child inherits parent env vars as usual).
    param(
        [Parameter(Mandatory = $true)] [string]   $FilePath,
        [Parameter(Mandatory = $true)] [string[]] $ArgumentList,
        [Parameter(Mandatory = $true)] [string]   $WorkingDirectory,
        [hashtable] $EnvironmentVariables = @{},
        [Parameter(Mandatory = $true)] [string]   $StandardOutputPath,
        [Parameter(Mandatory = $true)] [string]   $StandardErrorPath
    )

    $inCi = ($env:GITHUB_ACTIONS -eq 'true') -or
            (-not [string]::IsNullOrWhiteSpace($env:RUNNER_TRACKING_ID))

    if ($inCi) {
        return Start-ScheduledBackgroundProcess `
            -FilePath             $FilePath `
            -ArgumentList         $ArgumentList `
            -WorkingDirectory     $WorkingDirectory `
            -EnvironmentVariables $EnvironmentVariables `
            -StandardOutputPath   $StandardOutputPath `
            -StandardErrorPath    $StandardErrorPath
    }

    # Local / interactive: process inherits current env vars automatically.
    return Start-Process -FilePath $FilePath -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput $StandardOutputPath `
        -RedirectStandardError  $StandardErrorPath
}

$existingConnection = Get-ListeningConnection -TargetPort $Port
$knownPid = Get-ScriptPid -Path $pidFilePath

if ($UseHttps -and $HttpsPort -eq $Port) {
    throw 'HttpsPort must be different from Port.'
}

if ($UseHttps) {
    if ([string]::IsNullOrWhiteSpace($CertificatePath)) {
        throw 'UseHttps requires -CertificatePath to a .pfx file.'
    }

    if (-not [System.IO.Path]::IsPathRooted($CertificatePath)) {
        $CertificatePath = Join-Path $repoRoot $CertificatePath
    }

    $CertificatePath = [System.IO.Path]::GetFullPath($CertificatePath)
    if (-not (Test-Path -LiteralPath $CertificatePath)) {
        throw "Certificate file not found: $CertificatePath"
    }

    if ([string]::IsNullOrWhiteSpace($CertificatePassword)) {
        throw 'UseHttps requires -CertificatePassword for the .pfx file.'
    }

    $httpsInUse = Get-ListeningConnection -TargetPort $HttpsPort
    if ($httpsInUse) {
        $ownerPid = [int]$httpsInUse.OwningProcess
        if (-not $ForceRestart) {
            $ownerProcessName = (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue).ProcessName
            if ([string]::IsNullOrWhiteSpace($ownerProcessName)) {
                $ownerProcessName = 'unknown'
            }
            throw "HTTPS port $HttpsPort is already in use by PID $ownerPid ($ownerProcessName). Stop that process or rerun with -ForceRestart."
        }

        Write-Host "HTTPS port $HttpsPort is in use by PID $ownerPid. ForceRestart enabled, stopping process..." -ForegroundColor Yellow
        Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

if ($existingConnection) {
    $ownerPid = [int]$existingConnection.OwningProcess

    if ($knownPid -and $ownerPid -eq $knownPid) {
        $runningProcess = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        if ($runningProcess) {
            Write-Host "Timekeeper shared API is already running on port $Port (PID $ownerPid)." -ForegroundColor Yellow
            Write-Host "Use stop-api-shared.ps1 to stop it first." -ForegroundColor Yellow
            exit 0
        }
        Remove-ScriptPid -Path $pidFilePath
    }

    if (-not $ForceRestart) {
        $ownerProcessName = (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue).ProcessName
        if ([string]::IsNullOrWhiteSpace($ownerProcessName)) {
            $ownerProcessName = 'unknown'
        }
        throw "Port $Port is already in use by PID $ownerPid ($ownerProcessName). Stop that process or rerun with -ForceRestart."
    }

    Write-Host "Port $Port is in use by PID $ownerPid. ForceRestart enabled, stopping process..." -ForegroundColor Yellow
    Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

$env:ConnectionStrings__DefaultConnection = "Data Source=$dbPath"
$env:ASPNETCORE_ENVIRONMENT = $Environment
$env:ASPNETCORE_URLS = if ($UseHttps) { "$apiUrl;$httpsUrl" } else { $apiUrl }

if ($UseHttps) {
    $env:ASPNETCORE_Kestrel__Certificates__Default__Path = $CertificatePath
    $env:ASPNETCORE_Kestrel__Certificates__Default__Password = $CertificatePassword
} else {
    Remove-Item Env:ASPNETCORE_Kestrel__Certificates__Default__Path -ErrorAction SilentlyContinue
    Remove-Item Env:ASPNETCORE_Kestrel__Certificates__Default__Password -ErrorAction SilentlyContinue
}

# Build the env-var dictionary passed to Start-ScheduledBackgroundProcess.
# When running inside GitHub Actions the scheduled task launches under SYSTEM
# in a separate session, so environment variables cannot be inherited from the
# runner's process -- they must be written explicitly into the launcher script.
$processEnv = @{
    'ConnectionStrings__DefaultConnection' = $env:ConnectionStrings__DefaultConnection
    'ASPNETCORE_ENVIRONMENT'               = $env:ASPNETCORE_ENVIRONMENT
    'ASPNETCORE_URLS'                      = $env:ASPNETCORE_URLS
}
if ($UseHttps) {
    $processEnv['ASPNETCORE_Kestrel__Certificates__Default__Path']     = $env:ASPNETCORE_Kestrel__Certificates__Default__Path
    $processEnv['ASPNETCORE_Kestrel__Certificates__Default__Password'] = $env:ASPNETCORE_Kestrel__Certificates__Default__Password
}

Write-Host "Effective URL: $apiUrl" -ForegroundColor Cyan
if ($UseHttps) {
    Write-Host "Effective HTTPS URL: $httpsUrl" -ForegroundColor Cyan
}
Write-Host "Database Path: $dbPath" -ForegroundColor Cyan
Write-Host "PID File: $pidFilePath" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan

$apiDllCandidates = @(
    (Join-Path $repoRoot 'Timekeeper.Api\bin\Release\net8.0\Timekeeper.Api.dll'),
    (Join-Path $repoRoot 'Timekeeper.Api\bin\Debug\net8.0\Timekeeper.Api.dll')
)

$apiDllPath = $null
foreach ($candidate in $apiDllCandidates) {
    if (Test-Path -LiteralPath $candidate) {
        $apiDllPath = $candidate
        break
    }
}

if ($apiDllPath) {
    if ($Background) {
        Write-Host "Starting in background from compiled DLL: $apiDllPath" -ForegroundColor Green
        $logDirectory = Join-Path $DataDirectory 'logs'
        if (-not (Test-Path -LiteralPath $logDirectory)) {
            New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        }
        $stdoutLog = Join-Path $logDirectory 'timekeeper-api.stdout.log'
        $stderrLog = Join-Path $logDirectory 'timekeeper-api.stderr.log'
        $process = Start-BackgroundProcess -FilePath 'dotnet' -ArgumentList @($apiDllPath) -WorkingDirectory (Join-Path $repoRoot 'Timekeeper.Api') -EnvironmentVariables $processEnv -StandardOutputPath $stdoutLog -StandardErrorPath $stderrLog
        Write-ScriptPid -Path $pidFilePath -PidValue $process.Id

        $isReady = Wait-ForPortListening -TargetPort $Port -ProcessId $process.Id -TimeoutSeconds 45
        if (-not $isReady) {
            Remove-ScriptPid -Path $pidFilePath
            throw "Background process started (PID $($process.Id)) but port $Port is not listening after timeout. Check logs: $stdoutLog and $stderrLog"
        }

        Write-Host "Timekeeper shared API started in background. PID: $($process.Id)" -ForegroundColor Green
        Write-Host "Logs: $stdoutLog" -ForegroundColor Cyan
        Write-Host "To stop it: .\stop-api-shared.ps1 -Port $Port -DataDirectory \"$DataDirectory\"" -ForegroundColor Yellow
        exit 0
    }

    Write-Host "Starting from compiled DLL: $apiDllPath" -ForegroundColor Green
    & dotnet $apiDllPath
    exit $LASTEXITCODE
}

$apiProjectPath = Join-Path $repoRoot 'Timekeeper.Api\Timekeeper.Api.csproj'
if (-not (Test-Path -LiteralPath $apiProjectPath)) {
    throw "Project file not found: $apiProjectPath"
}

Write-Host 'Compiled DLL not found. Falling back to dotnet run...' -ForegroundColor Yellow
if ($Background) {
    $logDirectory = Join-Path $DataDirectory 'logs'
    if (-not (Test-Path -LiteralPath $logDirectory)) {
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    }
    $stdoutLog = Join-Path $logDirectory 'timekeeper-api.stdout.log'
    $stderrLog = Join-Path $logDirectory 'timekeeper-api.stderr.log'
    $process = Start-BackgroundProcess -FilePath 'dotnet' -ArgumentList @('run', '--project', $apiProjectPath, '--no-launch-profile') -WorkingDirectory (Join-Path $repoRoot 'Timekeeper.Api') -EnvironmentVariables $processEnv -StandardOutputPath $stdoutLog -StandardErrorPath $stderrLog
    Write-ScriptPid -Path $pidFilePath -PidValue $process.Id

    $isReady = Wait-ForPortListening -TargetPort $Port -ProcessId $process.Id -TimeoutSeconds 45
    if (-not $isReady) {
        Remove-ScriptPid -Path $pidFilePath
        throw "Background process started (PID $($process.Id)) but port $Port is not listening after timeout. Check logs: $stdoutLog and $stderrLog"
    }

    Write-Host "Timekeeper shared API started in background. PID: $($process.Id)" -ForegroundColor Green
    Write-Host "Logs: $stdoutLog" -ForegroundColor Cyan
    Write-Host "To stop it: .\stop-api-shared.ps1 -Port $Port -DataDirectory \"$DataDirectory\"" -ForegroundColor Yellow
    exit 0
}

& dotnet run --project $apiProjectPath
exit $LASTEXITCODE
