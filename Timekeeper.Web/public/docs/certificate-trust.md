# Certificate Trust Guide

When accessing Timekeeper via HTTPS, you may need to trust the self-signed certificate to avoid browser security warnings. This guide provides step-by-step instructions for Windows users.

## 📦 Quick Start - Download Trust Package

Ask your administrator for the `timekeeper-cert-trust-package.zip` file, which contains:
- The certificate file
- PowerShell installation script
- Complete instructions

**Installation:**
1. Extract the ZIP file
2. Right-click `trust-certificate.ps1`
3. Select "Run with PowerShell"
4. Follow the prompts

## 🔧 Manual Installation Methods

### Method 1: Windows Certificate Manager (Easiest)

1. **Get the certificate file** (`.cer`) from your administrator
2. **Double-click** the certificate file
3. Click **"Install Certificate..."**
4. Choose **"Current User"** (no admin required) or **"Local Machine"** (requires admin)
5. Select **"Place all certificates in the following store"**
6. Click **"Browse..."** → **"Trusted Root Certification Authorities"**
7. Click **"Next"** → **"Finish"**
8. Click **"Yes"** on the security warning

### Method 2: PowerShell Command

**Current User (No Admin Required):**
```powershell
Import-Certificate -FilePath ".\certificate.cer" -CertStoreLocation "Cert:\CurrentUser\Root"
```

**All Users (Requires Admin):**
```powershell
Import-Certificate -FilePath ".\certificate.cer" -CertStoreLocation "Cert:\LocalMachine\Root"
```

## 🌐 Browser-Specific Instructions

### Chrome / Edge
These browsers automatically trust Windows certificates. After installation:
1. Restart your browser
2. Navigate to Timekeeper
3. Look for the padlock icon 🔒

### Firefox
Firefox uses its own certificate store:

**Option 1 - Accept Risk:**
1. Visit the Timekeeper URL
2. Click **"Advanced"**
3. Click **"Accept the Risk and Continue"**

**Option 2 - Import Certificate:**
1. Go to `about:preferences#privacy`
2. Scroll to **"Certificates"**
3. Click **"View Certificates"**
4. Select **"Authorities"** tab
5. Click **"Import..."**
6. Select the certificate file
7. Check **"Trust this CA to identify websites"**

## 🛠️ Troubleshooting

### PowerShell Script Won't Run

**Error:** "Cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Browser Still Shows Warning

1. **Verify certificate is installed:**
   - Press `Win+R`, type `certmgr.msc`, press Enter
   - Check "Trusted Root Certification Authorities" → "Certificates"
   
2. **Restart browser completely**

3. **Clear browser cache:**
   - Chrome/Edge: Settings → Clear browsing data
   - Firefox: Settings → Privacy & Security → Clear Data

4. **Check URL matches certificate:**
   - Ensure you're using the exact server name from the certificate

### Permission Denied

- Use **"Current User"** option (no admin needed)
- OR run PowerShell as Administrator for **"Local Machine"**

## 🔒 Security Notes

### What Are Self-Signed Certificates?

Self-signed certificates:
- ✅ Provide the same encryption as commercial certificates
- ✅ Protect data in transit
- ⚠️ Are not verified by a third-party Certificate Authority
- ⚠️ Should only be trusted when from your organization

### When to Trust

**ONLY** trust certificates from:
- Your IT administrator
- Your organization's systems
- Sources you control

**NEVER** trust certificates from:
- Unknown sources
- Public websites
- Email attachments from unknown senders

### Certificate Verification

Before trusting, verify:
- **Subject name** matches your server
- **Validity dates** are current
- **Issuer** is your organization

To check certificate details:
- Double-click the `.cer` file
- Click the "Details" tab
- Review subject and expiration date

## 📋 Verification Checklist

After installation, confirm:

- [ ] Open Timekeeper URL in browser
- [ ] Padlock icon 🔒 appears in address bar
- [ ] No security warnings displayed
- [ ] Connection shows as "Secure"

## 🔄 Certificate Updates

Certificates expire and need renewal. When your administrator provides a new certificate:

1. **Install new certificate** (using any method above)
2. **Restart browser**
3. **Optional:** Remove old certificate:
   - Press `Win+R`, type `certmgr.msc`, press Enter
   - Find old certificate under "Trusted Root Certification Authorities"
   - Right-click → Delete

## 📞 Need Help?

Still having issues?

1. **Contact your IT administrator**
2. **Check [Troubleshooting](troubleshooting.md)**
3. **Verify you have the correct certificate file**

## 📚 Additional Resources

- [Getting Started Guide](getting-started.md)
- [Troubleshooting Guide](troubleshooting.md)
- [FAQ](faq.md)
