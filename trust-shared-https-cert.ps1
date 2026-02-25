[CmdletBinding()]
param(
    [string]$CertificatePath = (Join-Path $PSScriptRoot 'certs\timekeeper-https.cer'),

    [switch]$TrustLocalMachine
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not [System.IO.Path]::IsPathRooted($CertificatePath)) {
    $CertificatePath = Join-Path $PSScriptRoot $CertificatePath
}

$CertificatePath = [System.IO.Path]::GetFullPath($CertificatePath)

if (-not (Test-Path -LiteralPath $CertificatePath)) {
    throw "Certificate file not found: $CertificatePath"
}

$targetStore = if ($TrustLocalMachine) { 'Cert:\LocalMachine\Root' } else { 'Cert:\CurrentUser\Root' }

if ($TrustLocalMachine) {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        throw 'TrustLocalMachine requires running PowerShell as Administrator.'
    }
}

Import-Certificate -FilePath $CertificatePath -CertStoreLocation $targetStore | Out-Null

Write-Host "Certificate imported successfully." -ForegroundColor Green
Write-Host "Certificate: $CertificatePath" -ForegroundColor Cyan
Write-Host "Store: $targetStore" -ForegroundColor Cyan
