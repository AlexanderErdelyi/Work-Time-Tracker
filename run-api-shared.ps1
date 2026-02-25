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

function Start-DetachedProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList,

        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,

        [Parameter(Mandatory = $true)]
        [string]$StandardOutputPath,

        [Parameter(Mandatory = $true)]
        [string]$StandardErrorPath
    )

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FilePath
    foreach ($arg in $ArgumentList) {
        [void]$startInfo.ArgumentList.Add($arg)
    }

    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.RedirectStandardInput = $false

    foreach ($entry in [System.Environment]::GetEnvironmentVariables().GetEnumerator()) {
        $key = [string]$entry.Key
        $value = [string]$entry.Value
        if ($key -ieq 'RUNNER_TRACKING_ID') {
            continue
        }
        $startInfo.Environment[$key] = $value
    }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo

    $null = $process.Start()

    $stdOutWriter = New-Object System.IO.StreamWriter($StandardOutputPath, $false)
    $stdErrWriter = New-Object System.IO.StreamWriter($StandardErrorPath, $false)
    $stdOutWriter.AutoFlush = $true
    $stdErrWriter.AutoFlush = $true

    $process.add_OutputDataReceived({
        param($sender, $eventArgs)
        if ($eventArgs.Data -ne $null) {
            $stdOutWriter.WriteLine($eventArgs.Data)
        }
    })

    $process.add_ErrorDataReceived({
        param($sender, $eventArgs)
        if ($eventArgs.Data -ne $null) {
            $stdErrWriter.WriteLine($eventArgs.Data)
        }
    })

    $process.add_Exited({
        $stdOutWriter.Dispose()
        $stdErrWriter.Dispose()
    })

    $process.EnableRaisingEvents = $true
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()

    return $process
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
        $process = Start-DetachedProcess -FilePath 'dotnet' -ArgumentList @($apiDllPath) -WorkingDirectory (Join-Path $repoRoot 'Timekeeper.Api') -StandardOutputPath $stdoutLog -StandardErrorPath $stderrLog
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
    $process = Start-DetachedProcess -FilePath 'dotnet' -ArgumentList @('run', '--project', $apiProjectPath, '--no-launch-profile') -WorkingDirectory (Join-Path $repoRoot 'Timekeeper.Api') -StandardOutputPath $stdoutLog -StandardErrorPath $stderrLog
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
