# Code Signing Guide for Timekeeper

This guide explains how to sign your Timekeeper releases to eliminate Windows security warnings.

## What is Code Signing?

Code signing digitally signs your executable files with a certificate, proving that:
- The software comes from a verified publisher (you)
- The software hasn't been tampered with since it was signed
- Windows will not show "Windows protected your PC" warnings

## Benefits of Signing

✅ **No Security Warnings**: Users won't see scary warnings when running your app  
✅ **Professional**: Builds trust with your users  
✅ **SmartScreen Filter**: Bypasses Windows SmartScreen warnings  
✅ **Enterprise Ready**: Many companies require signed executables

## Getting a Code Signing Certificate

### Option 1: Commercial Certificate (Recommended for Distribution)

**Best for:** Public releases, enterprise use, professional distribution

1. **Purchase a Code Signing Certificate**
   - Certificate Authorities (CAs):
     - [DigiCert](https://www.digicert.com/code-signing/) - $474/year
     - [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing) - $474/year  
     - [SSL.com](https://www.ssl.com/certificates/code-signing/) - $199/year
     - [GlobalSign](https://www.globalsign.com/en/code-signing-certificate) - $299/year
   
2. **Certificate Formats**
   - **Standard Certificate (.pfx/.p12)**: File-based certificate with password
   - **EV Certificate (Hardware Token)**: USB token, higher trust level, expensive ($400+/year)
   
3. **Requirements**
   - Business or individual validation
   - Valid email address and phone number
   - Business documents (for business certificates)
   - Processing time: 1-7 days

### Option 2: Self-Signed Certificate (For Testing Only)

**Best for:** Testing, internal use, development

⚠️ **Warning**: Self-signed certificates will still show security warnings to end users but can be useful for:
- Testing the signing process
- Internal corporate distribution (if added to company certificate store)
- Personal/development use

## Setting Up Code Signing

### Prerequisites

1. **signtool.exe** (Windows SDK)
   - Included with Visual Studio
   - Or download [Windows SDK](https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/)
   - Usually located at: `C:\Program Files (x86)\Windows Kits\10\bin\10.0.xxxxx.0\x64\signtool.exe`

### Step 1: Store Your Certificate

#### For Commercial Certificate (.pfx):

1. **Save Certificate File**
   - Place your .pfx file in a secure location
   - **Never commit this to Git!**
   - Example location: `C:\Certificates\timekeeper-codesign.pfx`

2. **For GitHub Actions (Automated Builds)**
   - Convert to Base64:
     ```powershell
     $cert = Get-Content "C:\Certificates\timekeeper-codesign.pfx" -Encoding Byte
     [System.Convert]::ToBase64String($cert) | Out-File cert-base64.txt
     ```
   - Add to GitHub Secrets:
     1. Go to your repository → Settings → Secrets and variables → Actions
     2. Click "New repository secret"
     3. Name: `CERTIFICATE_BASE64`
     4. Value: (paste the Base64 content)
     5. Add another secret:
        - Name: `CERTIFICATE_PASSWORD`
        - Value: (your certificate password)

### Step 2: Configure Signing

#### Option A: Local Build Signing

1. **Set Environment Variables**
   
   Create a file `signing-config.ps1` in your project root (add to .gitignore):
   
   ```powershell
   # Code Signing Configuration
   # Add this file to .gitignore - it contains sensitive paths
   
   $env:SIGN_ENABLED = "true"
   $env:CERTIFICATE_PATH = "C:\Certificates\timekeeper-codesign.pfx"
   $env:CERTIFICATE_PASSWORD = "your-certificate-password"
   $env:TIMESTAMP_SERVER = "http://timestamp.digicert.com"
   ```

2. **Load Configuration Before Building**
   ```powershell
   # Load signing configuration
   . .\signing-config.ps1
   
   # Build with signing
   .\publish-standalone.ps1 -Version "1.0.0" -BuildInstaller
   ```

#### Option B: GitHub Actions Signing

The workflow is already configured to use certificates from GitHub Secrets.

1. Add secrets as described above
2. Push a tag to trigger release:
   ```bash
   git tag -a v1.0.0 -m "Signed release v1.0.0"
   git push origin v1.0.0
   ```

## Creating a Self-Signed Certificate (Testing Only)

For testing the signing process:

```powershell
# Create self-signed certificate for testing
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=Timekeeper Test Certificate" `
    -KeyUsage DigitalSignature `
    -FriendlyName "Timekeeper Code Signing (Test)" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -NotAfter (Get-Date).AddYears(5)

# Export to PFX file
$password = ConvertTo-SecureString -String "test-password-123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "test-certificate.pfx" -Password $password

Write-Host "Test certificate created: test-certificate.pfx"
Write-Host "Password: test-password-123"
Write-Host ""
Write-Host "To use this certificate:"
Write-Host '  $env:SIGN_ENABLED = "true"'
Write-Host '  $env:CERTIFICATE_PATH = "test-certificate.pfx"'
Write-Host '  $env:CERTIFICATE_PASSWORD = "test-password-123"'
```

## Signing Files

The build scripts will automatically sign these files when signing is enabled:

1. **Timekeeper.Api.exe** - Main API executable
2. **Timekeeper.TrayApp.exe** - System tray launcher
3. **Installer EXE** - The Windows installer itself

## Verifying Signatures

After signing, verify the signatures:

```powershell
# Check signature
Get-AuthenticodeSignature "Release\Timekeeper-v1.0.0-win-x64\Timekeeper.Api.exe"

# Or use signtool
signtool verify /pa "Release\Timekeeper-v1.0.0-win-x64\Timekeeper.Api.exe"
```

## Troubleshooting

### "Certificate not found"
- Check that CERTIFICATE_PATH is correct
- Verify the certificate file exists
- For GitHub Actions, check that the secret is properly configured

### "Invalid password"
- Verify CERTIFICATE_PASSWORD is correct
- Check for special characters that might need escaping

### "Timestamp server unavailable"
- Timestamp servers can be temporarily unavailable
- Alternative timestamp servers:
  - `http://timestamp.digicert.com`
  - `http://timestamp.sectigo.com`
  - `http://timestamp.comodoca.com`

### "SignTool.exe not found"
- Install Windows SDK
- Or specify full path to signtool in environment variable

### "Still showing security warnings"
- Self-signed certificates will always show warnings
- Commercial certificates need time to build reputation (can take weeks)
- EV certificates work immediately with no warnings

## Security Best Practices

1. **Never commit certificates to Git**
   - Add `*.pfx` and `*.p12` to .gitignore
   - Add `signing-config.ps1` to .gitignore

2. **Protect certificate files**
   - Store in secure location
   - Use strong passwords
   - Back up securely

3. **Use GitHub Secrets for CI/CD**
   - Never hardcode passwords
   - Use repository or organization secrets
   - Rotate secrets periodically

4. **Use timestamping**
   - Always use timestamp servers
   - Signatures remain valid after certificate expires
   - Users can verify authenticity even years later

## Cost Considerations

| Certificate Type | Cost/Year | Trust Level | Use Case |
|-----------------|-----------|-------------|----------|
| Self-Signed | Free | None | Testing only |
| Standard OV | $199-474 | Medium | Small teams, internal |
| EV Certificate | $400-600 | Highest | Public releases, enterprise |

## For Internal/Corporate Use

If you're only distributing within your organization:

1. **Use Self-Signed Certificate**
2. **Add to Company Certificate Store**
   - Deploy certificate to all company computers via Group Policy
   - No warnings for internal users
   - Free solution for internal apps

3. **Steps:**
   - Create self-signed certificate (see above)
   - Export public key (.cer file):
     ```powershell
     Export-Certificate -Cert $cert -FilePath "timekeeper-public.cer"
     ```
   - IT admin adds to "Trusted Publishers" via GPO

## Summary

### For Testing/Development:
```powershell
# Create test certificate
# (see "Creating a Self-Signed Certificate" section)

# Set environment variables
$env:SIGN_ENABLED = "true"
$env:CERTIFICATE_PATH = "test-certificate.pfx"
$env:CERTIFICATE_PASSWORD = "test-password-123"

# Build with signing
.\publish-standalone.ps1 -Version "1.0.0" -BuildInstaller
```

### For Production/Public Distribution:
1. Purchase commercial certificate ($199-600/year)
2. Add to GitHub Secrets
3. Push tag to create signed release
4. Distribute with confidence - no security warnings!

---

**Need Help?**
- Check [DigiCert's Guide](https://www.digicert.com/kb/code-signing/signcode-signtool-command-line.htm)
- See [Microsoft's Documentation](https://docs.microsoft.com/en-us/windows/win32/seccrypto/signtool)
- Open an issue on GitHub
