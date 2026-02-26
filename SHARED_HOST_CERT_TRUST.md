# Shared Host Certificate Trust

This document provides a quick reference for administrators to share certificates with team members.

For **detailed end-user instructions**, see [CERTIFICATE_TRUST_GUIDE.md](CERTIFICATE_TRUST_GUIDE.md).

## 📦 Quick Distribution (Recommended)

### Create Trust Package
Generate a complete trust package with certificate, script, and instructions:

```powershell
.\package-cert-trust.ps1
```

This creates `Release\timekeeper-cert-trust-package.zip` containing:
- Certificate file (`.cer`)
- Trust installation script
- README with instructions

Share this ZIP file with your team members.

### Manual Package Creation
If you prefer to create the package manually:

```powershell
.\package-cert-trust.ps1 -CertificatePath ".\certs\timekeeper-https.cer" -OutputPath ".\my-package.zip"
```

## 🔒 What to Share

**Share with colleagues:**
- `timekeeper-https-fqdn.cer` (or use the ZIP package above)
- `trust-shared-https-cert.ps1` (optional, included in ZIP package)
- [CERTIFICATE_TRUST_GUIDE.md](CERTIFICATE_TRUST_GUIDE.md) (comprehensive guide)

**Do NOT share:**
- `.pfx` files (contains private key)
- password files
- Any files in the `certs` directory except `.cer` files

## 🚀 Quick Instructions for End Users

### Option 1: Using Trust Package (Easiest)
1. Extract the ZIP file
2. Right-click `trust-certificate.ps1` and select "Run with PowerShell"
3. Follow the prompts

### Option 2: Manual PowerShell Installation

**For Current User (No Admin):**
```powershell
.\trust-shared-https-cert.ps1 -CertificatePath ".\timekeeper-https-fqdn.cer"
```

**For All Users (Requires Admin):**
```powershell
.\trust-shared-https-cert.ps1 -CertificatePath ".\timekeeper-https-fqdn.cer" -TrustLocalMachine
```

### Option 3: Direct Import (Admin PowerShell)
```powershell
Import-Certificate -FilePath ".\timekeeper-https-fqdn.cer" -CertStoreLocation "Cert:\LocalMachine\Root"
```

## 🌐 Accessing the Application

After trusting the certificate, users can access:
```
https://your-server-name:5443/
```

Replace `your-server-name` with the actual server hostname or FQDN.

## 🔄 Certificate Updates

If the certificate changes (expires or is regenerated):

1. **Create new trust package:**
   ```powershell
   .\package-cert-trust.ps1 -Force
   ```

2. **Distribute to users**: Share the new ZIP file

3. **Users re-import**: Users should run the trust script again with the new certificate

## 📚 Additional Resources

For complete documentation and troubleshooting:
- [Certificate Trust Guide](CERTIFICATE_TRUST_GUIDE.md) - Comprehensive end-user guide
- [Shared Dataset Setup](SHARED_DATASET_SETUP.md) - Administrator setup guide
- [Setup Guide](SETUP_GUIDE.md) - General setup instructions
