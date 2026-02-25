[CmdletBinding()]
param(
    [string]$DnsName,

    [string[]]$DnsNames,

    [string]$OutputDirectory = (Join-Path $PSScriptRoot 'certs'),

    [string]$PfxFileName = 'timekeeper-https.pfx',

    [string]$CerFileName = 'timekeeper-https.cer',

    [string]$Password,

    [int]$ValidYears = 3,

    [switch]$TrustCurrentUser,

    [switch]$TrustLocalMachine
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function New-RandomPassword {
    param([int]$Length = 24)

    $characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+[]{}'
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] ($Length)
    $rng.GetBytes($bytes)

    $builder = New-Object System.Text.StringBuilder
    for ($index = 0; $index -lt $Length; $index++) {
        $charIndex = $bytes[$index] % $characters.Length
        [void]$builder.Append($characters[$charIndex])
    }

    return $builder.ToString()
}

function Add-DnsNameIfValid {
    param(
        [System.Collections.Generic.List[string]]$Target,
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return
    }

    $trimmed = $Value.Trim()
    $alreadyExists = $false
    foreach ($existing in $Target) {
        if ($existing -ieq $trimmed) {
            $alreadyExists = $true
            break
        }
    }

    if (-not $alreadyExists) {
        [void]$Target.Add($trimmed)
    }
}

if ($DnsNames -and $DnsNames.Count -gt 0) {
    $DnsNames = $DnsNames | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.Trim() }
}

$effectiveDnsNames = [System.Collections.Generic.List[string]]::new()

foreach ($name in $DnsNames) {
    Add-DnsNameIfValid -Target $effectiveDnsNames -Value $name
}

Add-DnsNameIfValid -Target $effectiveDnsNames -Value $DnsName

if ($effectiveDnsNames.Count -eq 0) {
    $hostName = [System.Net.Dns]::GetHostName()
    Add-DnsNameIfValid -Target $effectiveDnsNames -Value $hostName

    try {
        $fqdn = [System.Net.Dns]::GetHostEntry($hostName).HostName
        Add-DnsNameIfValid -Target $effectiveDnsNames -Value $fqdn
    }
    catch {
    }

    Add-DnsNameIfValid -Target $effectiveDnsNames -Value 'localhost'
}

if ($effectiveDnsNames.Count -eq 0) {
    throw 'Could not resolve DNS names for certificate SAN entries.'
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = New-RandomPassword -Length 24
}

if (-not [System.IO.Path]::IsPathRooted($OutputDirectory)) {
    $OutputDirectory = Join-Path $PSScriptRoot $OutputDirectory
}

$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}

$pfxPath = Join-Path $OutputDirectory $PfxFileName
$cerPath = Join-Path $OutputDirectory $CerFileName
$passwordFilePath = Join-Path $OutputDirectory ($PfxFileName + '.password.txt')

$securePassword = ConvertTo-SecureString $Password -AsPlainText -Force

$primaryDnsName = $effectiveDnsNames[0]
$subjectName = "CN=$primaryDnsName"
$notAfter = (Get-Date).AddYears($ValidYears)

$cert = $null

try {
    $cert = New-SelfSignedCertificate `
        -DnsName $effectiveDnsNames.ToArray() `
        -Subject $subjectName `
        -Type 'SSLServerAuthentication' `
        -CertStoreLocation 'Cert:\LocalMachine\My' `
        -FriendlyName 'Timekeeper Shared Host HTTPS' `
        -NotAfter $notAfter `
        -KeyExportPolicy Exportable `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -HashAlgorithm 'SHA256'

    Write-Host 'Certificate created in LocalMachine store.' -ForegroundColor Green
}
catch {
    Write-Warning 'Could not create certificate in LocalMachine store (try elevated PowerShell). Falling back to CurrentUser store.'

    $cert = New-SelfSignedCertificate `
        -DnsName $effectiveDnsNames.ToArray() `
        -Subject $subjectName `
        -Type 'SSLServerAuthentication' `
        -CertStoreLocation 'Cert:\CurrentUser\My' `
        -FriendlyName 'Timekeeper Shared Host HTTPS' `
        -NotAfter $notAfter `
        -KeyExportPolicy Exportable `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -HashAlgorithm 'SHA256'

    Write-Host 'Certificate created in CurrentUser store.' -ForegroundColor Yellow
}

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null

$passwordFileContent = @(
    "Timekeeper HTTPS Certificate Password"
    "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    "Primary DNS Name: $primaryDnsName"
    "DNS Names (SAN): $($effectiveDnsNames -join ', ')"
    "PFX Path: $pfxPath"
    ""
    "Password: $Password"
)

Set-Content -LiteralPath $passwordFilePath -Value $passwordFileContent -Encoding UTF8

if ($TrustCurrentUser) {
    Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
    Write-Host 'Certificate imported to CurrentUser Trusted Root.' -ForegroundColor Green
}

if ($TrustLocalMachine) {
    Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
    Write-Host 'Certificate imported to LocalMachine Trusted Root.' -ForegroundColor Green
}

Write-Host ''
Write-Host 'HTTPS certificate generated successfully.' -ForegroundColor Green
Write-Host "Primary DNS Name: $primaryDnsName" -ForegroundColor Cyan
Write-Host "DNS Names (SAN): $($effectiveDnsNames -join ', ')" -ForegroundColor Cyan
Write-Host "PFX File: $pfxPath" -ForegroundColor Cyan
Write-Host "CER File: $cerPath" -ForegroundColor Cyan
Write-Host "Password File: $passwordFilePath" -ForegroundColor Cyan
Write-Host ''
Write-Host 'Suggested start command:' -ForegroundColor Yellow
Write-Host ".\run-api-shared.ps1 -Port 5000 -UseHttps -HttpsPort 5443 -CertificatePath \"$pfxPath\" -CertificatePassword \"$Password\" -Environment Production -BindAddress 0.0.0.0 -Background" -ForegroundColor White
