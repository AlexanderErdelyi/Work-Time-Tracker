# 🔐 Code Signing is Now Available!

Great news! Your Timekeeper releases can now be signed to eliminate Windows security warnings.

## 🆕 NEW: Automatic Self-Signing in GitHub Actions!

**No certificate needed to get started!** The release workflow now automatically creates and uses a self-signed certificate if you don't have a commercial certificate configured. Just push a tag and your releases will be signed!

⚠️ **Important Notes**:
- Self-signed certificates will still show security warnings to end users
- Each release is signed with a **different** self-signed certificate (generated fresh for each build)
- For production releases without warnings, you'll need a **commercial certificate** (see Option 2 below)
- Commercial certificates sign all releases with the **same trusted certificate**, building trust over time

## What Changed?

✅ **Automated Code Signing Support**: The build scripts and GitHub Actions workflow now support code signing  
✅ **Comprehensive Guide**: See [CODE_SIGNING_GUIDE.md](CODE_SIGNING_GUIDE.md) for complete instructions  
✅ **Local & CI/CD**: Works for both local builds and automated GitHub releases  
✅ **Easy Setup**: Just add your certificate and it works automatically

## Quick Start

### Option 1: For Testing (Free, Self-Signed)

Perfect for trying it out or internal use:

```powershell
# Create a test certificate
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

# Export it
$password = ConvertTo-SecureString -String "test-password-123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "test-certificate.pfx" -Password $password

# Configure and build
Copy-Item "signing-config.ps1.example" -Destination "signing-config.ps1"
# Edit signing-config.ps1 and set:
#   $env:CERTIFICATE_PATH = "test-certificate.pfx"
#   $env:CERTIFICATE_PASSWORD = "test-password-123"

# Load config and build
. .\signing-config.ps1
.\publish-standalone.ps1 -Version "1.0.0" -BuildInstaller
```

⚠️ **Note**: Self-signed certificates will still show warnings to end users, but are great for:
- Testing the signing process
- Internal corporate use (if deployed to company computers)
- Development and debugging

### Option 2: For Production (Commercial Certificate)

For public releases without any warnings:

1. **Purchase a Certificate** ($199-600/year)
   - [SSL.com](https://www.ssl.com/certificates/code-signing/) - $199/year
   - [DigiCert](https://www.digicert.com/code-signing/) - $474/year
   - [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing) - $474/year

2. **For Local Builds**:
   ```powershell
   # Copy template
   Copy-Item "signing-config.ps1.example" -Destination "signing-config.ps1"
   
   # Edit signing-config.ps1 with your certificate details
   # Then build:
   . .\signing-config.ps1
   .\publish-standalone.ps1 -Version "1.0.0" -BuildInstaller
   ```

3. **For GitHub Actions (Automated Releases)**:
   
   **Easy Mode (Automatic Self-Signed)**:
   - Just push a tag - releases are automatically signed with a self-signed certificate!
     ```bash
     git tag -a v1.0.0 -m "Release v1.0.0"
     git push origin v1.0.0
     ```
   - ⚠️ Note: Self-signed certificates still show warnings to end users
   
   **Production Mode (Commercial Certificate)**:
   - Convert certificate to Base64:
     ```powershell
     $cert = Get-Content "your-certificate.pfx" -Encoding Byte
     [System.Convert]::ToBase64String($cert) | Out-File cert-base64.txt
     ```
   - Add to GitHub Secrets:
     - Go to: Repository → Settings → Secrets and variables → Actions
     - Add `CERTIFICATE_BASE64` (paste Base64 content)
     - Add `CERTIFICATE_PASSWORD` (your certificate password)
   - Push a tag - automatic signing with your commercial certificate!
     ```bash
     git tag -a v1.0.0 -m "Signed release v1.0.0"
     git push origin v1.0.0
     ```

## What Gets Signed?

When signing is enabled, these files are automatically signed:

1. ✅ **Timekeeper.Api.exe** - Main API server
2. ✅ **Timekeeper.TrayApp.exe** - System tray app
3. ✅ **Installer .exe** - Windows installer

## Benefits

### Without Code Signing:
❌ Users see "Windows protected your PC" warning  
❌ Must click "More info" → "Run anyway"  
❌ SmartScreen blocks downloads  
❌ Not suitable for enterprise deployment  

### With Code Signing:
✅ No security warnings  
✅ Double-click to install  
✅ Professional appearance  
✅ Enterprise ready  
✅ Builds user trust  

## Cost Comparison

| Solution | Cost | Trust Level | Use Case |
|----------|------|-------------|----------|
| Self-Signed | Free | None (still shows warnings) | Testing, internal use |
| Standard Certificate | $199-474/year | Medium | Small teams, public use |
| EV Certificate | $400-600/year | Highest | Professional, enterprise |

## Need Help?

📖 **Full Documentation**: [CODE_SIGNING_GUIDE.md](CODE_SIGNING_GUIDE.md)

This guide includes:
- Step-by-step certificate setup
- Troubleshooting common issues
- Best practices for security
- How to verify signatures
- Detailed explanations of all options

## Summary

**To get started right now:**

```powershell
# 1. Create a test certificate (run the PowerShell commands from "Option 1" above)
# 2. Configure signing
Copy-Item "signing-config.ps1.example" -Destination "signing-config.ps1"
# Edit signing-config.ps1 with your certificate path and password

# 3. Build with signing!
. .\signing-config.ps1
.\publish-standalone.ps1 -Version "1.0.0" -BuildInstaller
```

**For production use:**
- Purchase a commercial certificate
- Add to GitHub Secrets
- Your releases will be signed automatically! 🎉

---

**Questions?** Open an issue or check [CODE_SIGNING_GUIDE.md](CODE_SIGNING_GUIDE.md) for detailed help.
