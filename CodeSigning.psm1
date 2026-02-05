# Code Signing Module
# Shared function for signing Windows executables
# Used by both local builds (publish-standalone.ps1) and GitHub Actions

function Sign-File {
    <#
    .SYNOPSIS
    Signs a Windows executable or installer with a code signing certificate.
    
    .DESCRIPTION
    This function signs executable files using signtool.exe from the Windows SDK.
    It requires the following environment variables to be set:
    - SIGN_ENABLED: Set to "true" to enable signing
    - CERTIFICATE_PATH: Path to the .pfx or .p12 certificate file
    - CERTIFICATE_PASSWORD: (Optional) Certificate password
    - TIMESTAMP_SERVER: (Optional) Timestamp server URL (defaults to DigiCert)
    
    .PARAMETER FilePath
    The path to the file to sign.
    
    .EXAMPLE
    $env:SIGN_ENABLED = "true"
    $env:CERTIFICATE_PATH = "C:\Certificates\codesign.pfx"
    $env:CERTIFICATE_PASSWORD = "mypassword"
    Sign-File -FilePath "Release\MyApp.exe"
    
    .NOTES
    Requires signtool.exe from Windows SDK to be installed.
    #>
    
    param(
        [Parameter(Mandatory=$true)]
        [string]$FilePath
    )
    
    # Check if signing is enabled
    if ($env:SIGN_ENABLED -ne "true") {
        return $false
    }
    
    if (-not $env:CERTIFICATE_PATH) {
        Write-Host "   WARNING: SIGN_ENABLED is true but CERTIFICATE_PATH not set" -ForegroundColor Yellow
        return $false
    }
    
    if (-not (Test-Path $env:CERTIFICATE_PATH)) {
        Write-Host "   WARNING: Certificate file not found: $env:CERTIFICATE_PATH" -ForegroundColor Yellow
        return $false
    }
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "   WARNING: File to sign not found: $FilePath" -ForegroundColor Yellow
        return $false
    }
    
    # Find signtool.exe from Windows SDK
    $signtool = $null
    $possiblePaths = @(
        "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe",
        "${env:ProgramFiles}\Windows Kits\10\bin\*\x64\signtool.exe",
        "${env:ProgramFiles(x86)}\Windows Kits\10\App Certification Kit\signtool.exe",
        "${env:ProgramFiles}\Windows Kits\10\App Certification Kit\signtool.exe"
    )
    
    foreach ($pattern in $possiblePaths) {
        $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | 
                 Sort-Object -Property FullName -Descending | 
                 Select-Object -First 1
        if ($found) {
            $signtool = $found.FullName
            break
        }
    }
    
    if (-not $signtool) {
        Write-Host "   WARNING: signtool.exe not found. Install Windows SDK." -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "   Signing: $(Split-Path -Leaf $FilePath)..." -ForegroundColor Cyan
    
    # Prepare signtool arguments
    $timestampServer = if ($env:TIMESTAMP_SERVER) { $env:TIMESTAMP_SERVER } else { "http://timestamp.digicert.com" }
    
    $signArgs = @(
        "sign",
        "/f", $env:CERTIFICATE_PATH,
        "/tr", $timestampServer,
        "/td", "SHA256",
        "/fd", "SHA256"
    )
    
    # Add password if provided
    if ($env:CERTIFICATE_PASSWORD) {
        $signArgs += "/p"
        $signArgs += $env:CERTIFICATE_PASSWORD
    }
    
    # Add file to sign
    $signArgs += $FilePath
    
    # Execute signtool
    try {
        & $signtool $signArgs 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Signed successfully: $(Split-Path -Leaf $FilePath)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ✗ Signing failed for: $(Split-Path -Leaf $FilePath)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ✗ Signing error: $_" -ForegroundColor Red
        return $false
    }
}

# Export the function
Export-ModuleMember -Function Sign-File
