# Certificate Trust Guide

When running Timekeeper on a shared host with HTTPS, you'll need to trust the self-signed certificate to avoid browser security warnings. This guide provides step-by-step instructions for trusting the certificate on Windows.

## 📦 Quick Start - Download Trust Package

The easiest way to trust the certificate is to use the pre-packaged trust bundle:

1. Download the `timekeeper-cert-trust-package.zip` from your administrator
2. Extract the ZIP file
3. Right-click `trust-certificate.ps1` and select "Run with PowerShell"
4. Follow the prompts

## 🔧 Manual Installation Methods

### Method 1: PowerShell Script (Recommended)

This method uses a PowerShell script to automatically install the certificate.

**For Current User (No Admin Required):**
```powershell
.\trust-shared-https-cert.ps1 -CertificatePath ".\timekeeper-https.cer"
```

**For All Users on Computer (Requires Admin):**
```powershell
.\trust-shared-https-cert.ps1 -CertificatePath ".\timekeeper-https.cer" -TrustLocalMachine
```

### Method 2: Windows Certificate Manager (Manual)

If you prefer to install the certificate manually using Windows Certificate Manager:

1. **Locate the certificate file** (e.g., `timekeeper-https.cer`)
2. **Double-click** the `.cer` file
3. Click **"Install Certificate..."**
4. Choose certificate store location:
   - **Current User**: Only you can access the application without warnings
   - **Local Machine**: All users on this computer can access without warnings (requires Administrator)
5. Click **"Next"**
6. Select **"Place all certificates in the following store"**
7. Click **"Browse..."** and select **"Trusted Root Certification Authorities"**
8. Click **"Next"** and then **"Finish"**
9. If prompted with a security warning, click **"Yes"**

### Method 3: Command Line (PowerShell)

**For Current User:**
```powershell
Import-Certificate -FilePath ".\timekeeper-https.cer" -CertStoreLocation "Cert:\CurrentUser\Root"
```

**For Local Machine (Requires Admin):**
```powershell
Import-Certificate -FilePath ".\timekeeper-https.cer" -CertStoreLocation "Cert:\LocalMachine\Root"
```

## 🌐 Browser-Specific Instructions

After installing the certificate in Windows, most browsers will automatically trust it. However, some browsers have additional requirements:

### Google Chrome / Microsoft Edge

Chrome and Edge use the Windows Certificate Store, so once you've installed the certificate using any method above, these browsers will automatically trust it.

**Verification:**
1. Navigate to your Timekeeper URL (e.g., `https://server-name:5443`)
2. You should see a padlock icon in the address bar
3. If you still see a warning, restart the browser

### Mozilla Firefox

Firefox uses its own certificate store and doesn't automatically trust Windows certificates.

**To trust in Firefox:**
1. Navigate to your Timekeeper URL (e.g., `https://server-name:5443`)
2. Click **"Advanced"** on the warning page
3. Click **"Accept the Risk and Continue"**

**OR use Firefox's certificate manager:**
1. Open Firefox and go to `about:preferences#privacy`
2. Scroll down to **"Certificates"**
3. Click **"View Certificates"**
4. Go to the **"Authorities"** tab
5. Click **"Import..."**
6. Select the `timekeeper-https.cer` file
7. Check **"Trust this CA to identify websites"**
8. Click **"OK"**

## 🔒 Security Notes

### Understanding Self-Signed Certificates

- **What they are**: Self-signed certificates are created by your administrator and not verified by a third-party Certificate Authority
- **Why trust them**: They provide the same encryption as commercial certificates, but lack third-party verification
- **When to trust them**: Only trust certificates from sources you control or administrators you trust

### Best Practices

1. **Verify the source**: Only install certificates provided by your system administrator
2. **Check the certificate details**: Before trusting, double-click the `.cer` file and verify:
   - The subject name matches your server name
   - The validity dates are current
   - The issuer is expected (e.g., your organization)
3. **Update when needed**: If the certificate expires or is replaced, you'll need to re-install the new certificate
4. **Remove old certificates**: When a certificate is replaced, consider removing the old one from your trusted store

## 🛠️ Troubleshooting

### Browser Still Shows Security Warning

**Solution:**
1. Verify the certificate is installed in the correct store
2. Check that the URL in the browser matches the DNS name in the certificate
3. Restart your browser
4. Clear browser cache and SSL state:
   - Chrome/Edge: Settings → Privacy and security → Clear browsing data → Cached images and files
   - Firefox: Settings → Privacy & Security → Cookies and Site Data → Clear Data

### "Certificate is not trusted" Error

**Possible causes:**
1. Certificate not installed in "Trusted Root Certification Authorities"
2. Certificate expired
3. DNS name mismatch

**Solution:**
- Re-run the trust script with `-TrustLocalMachine` flag (requires admin)
- Verify the certificate expiration date
- Ensure you're accessing the server using the exact DNS name in the certificate

### PowerShell Execution Policy Error

If you see "cannot be loaded because running scripts is disabled":

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then run the trust script again.

### Permission Denied Error

If you see "Access is denied" when running the script:

**For Current User:**
```powershell
.\trust-shared-https-cert.ps1 -CertificatePath ".\timekeeper-https.cer"
```
(Don't use `-TrustLocalMachine`)

**For All Users:**
- Right-click PowerShell and select "Run as Administrator"
- Then run the script with `-TrustLocalMachine`

## 📋 Verification Checklist

After installing the certificate, verify it's working:

- [ ] Open your Timekeeper URL in a browser
- [ ] Check for a padlock icon in the address bar
- [ ] No security warnings appear
- [ ] Certificate details show your organization/server name
- [ ] Connection is encrypted (HTTPS)

## 🔄 Certificate Renewal

Certificates expire and need to be renewed. When your administrator provides a new certificate:

1. **Remove the old certificate** (optional but recommended):
   - Open Certificate Manager: Press `Win+R`, type `certmgr.msc`, press Enter
   - Navigate to "Trusted Root Certification Authorities" → "Certificates"
   - Find the old Timekeeper certificate
   - Right-click and select "Delete"

2. **Install the new certificate** using any method above

3. **Restart your browser**

## 📞 Need Help?

If you're still having issues after following this guide:

1. Contact your system administrator
2. Check the [Troubleshooting Guide](troubleshooting.md)
3. Verify you have the correct certificate file from your administrator

## 🔗 Related Documentation

- [Shared Dataset Setup](SHARED_DATASET_SETUP.md) - For administrators setting up shared hosting
- [Shared Host Certificate Trust](SHARED_HOST_CERT_TRUST.md) - Quick reference for administrators
- [Setup Guide](SETUP_GUIDE.md) - General setup instructions
