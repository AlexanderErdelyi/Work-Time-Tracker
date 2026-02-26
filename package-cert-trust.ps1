[CmdletBinding()]
param(
    [string]$CertificatePath = (Join-Path $PSScriptRoot 'certs\timekeeper-https.cer'),
    
    [string]$OutputPath = (Join-Path $PSScriptRoot 'Release\timekeeper-cert-trust-package.zip'),
    
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "Timekeeper Certificate Trust Package Creator" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Resolve certificate path
if (-not [System.IO.Path]::IsPathRooted($CertificatePath)) {
    $CertificatePath = Join-Path $PSScriptRoot $CertificatePath
}
$CertificatePath = [System.IO.Path]::GetFullPath($CertificatePath)

# Check if certificate exists
if (-not (Test-Path -LiteralPath $CertificatePath)) {
    Write-Host "Error: Certificate file not found at: $CertificatePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a certificate first using:" -ForegroundColor Yellow
    Write-Host "  .\create-shared-https-cert.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Resolve output path
if (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath = Join-Path $PSScriptRoot $OutputPath
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)

# Check if output file already exists
if ((Test-Path -LiteralPath $OutputPath) -and -not $Force) {
    Write-Host "Error: Output file already exists: $OutputPath" -ForegroundColor Red
    Write-Host "Use -Force to overwrite" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Create output directory if it doesn't exist
$outputDir = [System.IO.Path]::GetDirectoryName($OutputPath)
if (-not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Create temporary directory for package contents
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("timekeeper-cert-" + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    Write-Host "Creating certificate trust package..." -ForegroundColor Green
    Write-Host ""

    # Copy certificate file
    $certFileName = [System.IO.Path]::GetFileName($CertificatePath)
    $destCertPath = Join-Path $tempDir $certFileName
    Copy-Item -LiteralPath $CertificatePath -Destination $destCertPath -Force
    Write-Host "  ✓ Copied certificate: $certFileName" -ForegroundColor Gray

    # Copy trust script
    $trustScriptSource = Join-Path $PSScriptRoot 'trust-shared-https-cert.ps1'
    if (Test-Path -LiteralPath $trustScriptSource) {
        $destScriptPath = Join-Path $tempDir 'trust-certificate.ps1'
        Copy-Item -LiteralPath $trustScriptSource -Destination $destScriptPath -Force
        Write-Host "  ✓ Copied trust script: trust-certificate.ps1" -ForegroundColor Gray
    } else {
        Write-Warning "Trust script not found, skipping"
    }

    # Create README file
    $readmeContent = @"
# Timekeeper Certificate Trust Package

This package contains everything you need to trust the Timekeeper HTTPS certificate on your Windows computer.

## Quick Start

1. **Run the PowerShell script** (Recommended):
   - Right-click ``trust-certificate.ps1``
   - Select "Run with PowerShell"
   - Follow the prompts

2. **Or install manually**:
   - Double-click the ``.cer`` file
   - Click "Install Certificate..."
   - Choose "Current User" or "Local Machine"
   - Select "Place all certificates in the following store"
   - Choose "Trusted Root Certification Authorities"
   - Click "Next" and "Finish"

## What's Included

- **$certFileName** - The HTTPS certificate file
- **trust-certificate.ps1** - PowerShell script for automated installation
- **README.txt** - This file

## Installation Methods

### Method 1: PowerShell Script (Recommended)

**For Current User Only (No Admin Required):**
``````powershell
.\trust-certificate.ps1 -CertificatePath ".\$certFileName"
``````

**For All Users on Computer (Requires Admin):**
``````powershell
.\trust-certificate.ps1 -CertificatePath ".\$certFileName" -TrustLocalMachine
``````

### Method 2: Manual Installation

1. Double-click the ``$certFileName`` file
2. Click "Install Certificate..."
3. Choose store location:
   - **Current User**: Only for your account
   - **Local Machine**: For all users (requires admin)
4. Click "Next"
5. Select "Place all certificates in the following store"
6. Click "Browse" and select "Trusted Root Certification Authorities"
7. Click "Next" then "Finish"
8. Confirm the security warning

### Method 3: Command Line

**Current User:**
``````powershell
Import-Certificate -FilePath ".\$certFileName" -CertStoreLocation "Cert:\CurrentUser\Root"
``````

**Local Machine (Admin):**
``````powershell
Import-Certificate -FilePath ".\$certFileName" -CertStoreLocation "Cert:\LocalMachine\Root"
``````

## Browser-Specific Notes

### Chrome / Edge
These browsers use the Windows certificate store, so they will automatically trust the certificate after installation.

### Firefox
Firefox uses its own certificate store. You may need to:
1. Visit the Timekeeper URL
2. Click "Advanced" on the security warning
3. Click "Accept the Risk and Continue"

OR import manually via Firefox's certificate manager (about:preferences#privacy).

## Troubleshooting

### PowerShell Execution Policy Error
If you see "scripts is disabled on this system":
``````powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
``````

### Permission Denied
- Try running without ``-TrustLocalMachine`` flag (installs for current user only)
- OR run PowerShell as Administrator

### Browser Still Shows Warning
1. Verify certificate is installed (run ``certmgr.msc``)
2. Restart your browser
3. Clear browser cache
4. Ensure the URL matches the certificate's DNS name

## Security Notes

- Only trust certificates from your organization's administrators
- Self-signed certificates provide encryption but lack third-party verification
- Verify the certificate details before trusting
- Keep certificates up-to-date when they expire

## Need Help?

Contact your system administrator or refer to the complete documentation at:
https://github.com/AlexanderErdelyi/Work-Time-Tracker

---

Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

    $readmePath = Join-Path $tempDir 'README.txt'
    Set-Content -LiteralPath $readmePath -Value $readmeContent -Encoding UTF8
    Write-Host "  ✓ Created README.txt" -ForegroundColor Gray

    # Create the ZIP file
    Write-Host ""
    Write-Host "Creating ZIP archive..." -ForegroundColor Green
    
    # Remove existing ZIP if Force flag is set
    if ((Test-Path -LiteralPath $OutputPath) -and $Force) {
        Remove-Item -LiteralPath $OutputPath -Force
    }

    # Create ZIP using .NET compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $OutputPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

    Write-Host ""
    Write-Host "Certificate trust package created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Package location:" -ForegroundColor Cyan
    Write-Host "  $OutputPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Package contents:" -ForegroundColor Cyan
    Write-Host "  - $certFileName (certificate file)" -ForegroundColor White
    Write-Host "  - trust-certificate.ps1 (installation script)" -ForegroundColor White
    Write-Host "  - README.txt (instructions)" -ForegroundColor White
    Write-Host ""
    Write-Host "Distribution:" -ForegroundColor Yellow
    Write-Host "  Share this ZIP file with users who need to access your Timekeeper instance via HTTPS." -ForegroundColor Gray
    Write-Host "  Users should extract the ZIP and run trust-certificate.ps1" -ForegroundColor Gray
    Write-Host ""
}
finally {
    # Cleanup temporary directory
    if (Test-Path -LiteralPath $tempDir) {
        Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
