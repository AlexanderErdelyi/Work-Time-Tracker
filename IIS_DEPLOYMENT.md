# IIS Deployment Guide for Work Time Tracker

This guide shows you how to deploy the Work Time Tracker to a Windows Server with IIS (Internet Information Services), enabling remote access from any computer on your network or the internet.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup Instructions](#detailed-setup-instructions)
- [HTTPS Configuration](#https-configuration)
- [Remote Access](#remote-access)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Overview

### What You'll Get

After following this guide, you'll have:
- ✅ Work Time Tracker running on a Windows Server with IIS
- ✅ Access from any computer via web browser
- ✅ Optional HTTPS with self-signed certificate
- ✅ Professional server deployment

### Deployment Options

1. **Local Network Only**: Access from computers on the same network
2. **Internet Access**: Access from anywhere (requires port forwarding)
3. **HTTP**: Simple setup, no certificate needed (recommended for internal use)
4. **HTTPS**: Encrypted connection with self-signed certificate

## Prerequisites

### On the Server

1. **Windows Server** (2016+ recommended) or Windows 10/11 Pro
2. **IIS (Internet Information Services)** installed with:
   - Web Server (IIS) role
   - ASP.NET Core Module V2
3. **.NET 8.0 Runtime** or ASP.NET Core 8.0 Runtime
   - Download: https://dotnet.microsoft.com/download/dotnet/8.0
   - Install the **ASP.NET Core Runtime (Hosting Bundle)**

### Installing IIS on Windows Server

```powershell
# Run in PowerShell as Administrator
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
```

### Installing ASP.NET Core Hosting Bundle

1. Download the **ASP.NET Core 8.0 Hosting Bundle** from Microsoft
2. Run the installer
3. Restart IIS after installation:
   ```cmd
   iisreset
   ```

## Quick Start

### Step 1: Download and Extract

1. Download `Timekeeper-IIS-v{version}.zip` from the latest release
2. Extract to a folder on your server, e.g., `C:\inetpub\wwwroot\Timekeeper`

### Step 2: Create Application Pool

1. Open **IIS Manager** (run `inetmgr`)
2. Expand server node → Right-click **Application Pools** → **Add Application Pool**
3. Settings:
   - Name: `TimekeeperAppPool`
   - .NET CLR version: **No Managed Code**
   - Managed pipeline mode: **Integrated**
4. Click **OK**

### Step 3: Set Permissions

The application needs to create and write to the SQLite database file.

```powershell
# Run in PowerShell as Administrator
# Replace with your actual deployment path
$path = "C:\inetpub\wwwroot\Timekeeper"
$appPoolIdentity = "IIS AppPool\TimekeeperAppPool"

# Grant modify permissions
icacls $path /grant "${appPoolIdentity}:(OI)(CI)M" /T
```

### Step 4: Create Website

1. In IIS Manager, right-click **Sites** → **Add Website**
2. Configure:
   - **Site name**: `Timekeeper`
   - **Application pool**: `TimekeeperAppPool`
   - **Physical path**: `C:\inetpub\wwwroot\Timekeeper` (your deployment path)
   - **Binding**:
     - Type: `http`
     - IP address: `All Unassigned`
     - Port: `80`
     - Host name: (leave empty)
3. Click **OK**

### Step 5: Configure Firewall

```powershell
# Allow HTTP traffic on port 80
netsh advfirewall firewall add rule name="Timekeeper HTTP" dir=in action=allow protocol=TCP localport=80
```

### Step 6: Start the Site

1. In IIS Manager, select the **Timekeeper** site
2. Click **Start** in the Actions panel
3. Test by opening a browser and navigating to `http://localhost`

## Detailed Setup Instructions

### Choosing a Port

#### Using Port 80 (Default HTTP)
- Simplest option
- Access via `http://server-ip` (no port needed)
- May conflict with Default Web Site in IIS (stop or remove it)

#### Using a Custom Port (e.g., 8080)
- Change binding port to `8080` when creating the site
- Access via `http://server-ip:8080`
- Update firewall rule to allow port 8080
- No conflict with other IIS sites

```powershell
# Firewall rule for custom port
netsh advfirewall firewall add rule name="Timekeeper HTTP 8080" dir=in action=allow protocol=TCP localport=8080
```

### Database Configuration

The application uses SQLite, which creates a `timekeeper.db` file in the deployment folder.

**Important**: The IIS Application Pool identity must have write access to the deployment folder!

#### Verify Database Creation

After starting the site:
1. Check that `timekeeper.db` exists in your deployment folder
2. If missing, check:
   - IIS Application Pool identity has Modify permissions
   - Check logs folder for errors
   - View Windows Event Viewer → Windows Logs → Application

### Logging

The application logs to the `logs` folder in the deployment directory.

To view logs:
1. Navigate to `C:\inetpub\wwwroot\Timekeeper\logs` (your path)
2. Open the most recent log file
3. Look for errors or startup messages

**Troubleshooting Only**: Enable detailed logging temporarily by editing `web.config`:
```xml
<environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Development" />
```

**⚠️ SECURITY WARNING**: Development mode exposes detailed error messages that could reveal sensitive information. **ONLY use this temporarily for troubleshooting**, then change it back to "Production" immediately after debugging!

## HTTPS Configuration

### Why Use HTTPS?

- **Encryption**: Data is encrypted in transit
- **Professional**: More trustworthy for users
- **Modern Browsers**: Some features require HTTPS

### Option 1: Self-Signed Certificate (Quick & Easy)

Perfect for internal network use.

#### Create Certificate

```powershell
# Run in PowerShell as Administrator
$cert = New-SelfSignedCertificate `
    -DnsName "timekeeper.local", "your-server-name" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -NotAfter (Get-Date).AddYears(5) `
    -KeyExportPolicy Exportable `
    -KeySpec Signature `
    -KeyLength 2048 `
    -KeyAlgorithm RSA `
    -HashAlgorithm SHA256

# Display thumbprint (you'll need this)
Write-Host "Certificate Thumbprint: $($cert.Thumbprint)"
```

#### Add HTTPS Binding in IIS

1. Open IIS Manager
2. Select your **Timekeeper** site
3. Click **Bindings** in Actions panel
4. Click **Add**
5. Configure:
   - Type: `https`
   - IP address: `All Unassigned`
   - Port: `443`
   - SSL certificate: Select the certificate you just created
6. Click **OK**

#### Configure Firewall

```powershell
# Allow HTTPS traffic
netsh advfirewall firewall add rule name="Timekeeper HTTPS" dir=in action=allow protocol=TCP localport=443
```

#### Test HTTPS

1. Open browser and navigate to `https://server-ip`
2. You'll see a certificate warning (expected with self-signed cert)
3. Click "Advanced" → "Proceed to site" (wording varies by browser)

### Option 2: Install Certificate on Client Computers (Remove Warnings)

To eliminate certificate warnings, install the certificate on each client computer.

#### Export Certificate from Server

```powershell
# Find your certificate
$cert = Get-ChildItem -Path "cert:\LocalMachine\My" | Where-Object { $_.Subject -like "*timekeeper*" }

# Export to file
$exportPath = "C:\Temp\timekeeper-cert.cer"
Export-Certificate -Cert $cert -FilePath $exportPath
```

#### Install on Client Computers

1. Copy `timekeeper-cert.cer` to the client computer
2. Double-click the certificate file
3. Click **Install Certificate**
4. Store Location: **Local Machine** (requires admin)
5. Certificate Store: **Trusted Root Certification Authorities**
6. Click **Next** → **Finish**
7. Restart browser

Now HTTPS will work without warnings!

### Option 3: Use a Real Certificate (Advanced)

For production or internet-facing deployments:

1. Purchase an SSL certificate from a Certificate Authority
2. Or use Let's Encrypt (free, requires public domain)
3. Install the certificate in IIS
4. Configure HTTPS binding

## Remote Access

### Access from Local Network

After deploying to IIS, access from any computer on your network:

1. Find your server's IP address:
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address"

2. From any computer on the network, open browser:
   - HTTP: `http://server-ip`
   - HTTPS: `https://server-ip`
   - Custom port: `http://server-ip:8080`

### Use a Friendly Hostname

Instead of remembering IP addresses, use a hostname.

#### Option A: Edit hosts file (Per-client)

On each client computer, edit `C:\Windows\System32\drivers\etc\hosts`:

```
192.168.1.100    timekeeper.local
```

Access via: `http://timekeeper.local`

#### Option B: DNS Server (Network-wide)

If you have a DNS server on your network:
1. Create an A record: `timekeeper` → `server-ip`
2. Access via: `http://timekeeper.yourdomain.local`

### Access from Internet

To access from outside your network:

#### 1. Configure Router Port Forwarding

Forward external port to your server:
- External port: `80` (HTTP) or `443` (HTTPS)
- Internal IP: Your server's local IP
- Internal port: `80` or `443`

Example:
```
External Port 80 → 192.168.1.100:80
External Port 443 → 192.168.1.100:443
```

#### 2. Find Your Public IP

```powershell
Invoke-RestMethod -Uri "https://api.ipify.org"
```

#### 3. Access from Anywhere

- HTTP: `http://your-public-ip`
- HTTPS: `https://your-public-ip`

**Security Note**: When exposing to the internet, HTTPS is strongly recommended!

## Troubleshooting

### Site Shows "503 Service Unavailable"

**Cause**: Application Pool is stopped or crashed

**Solution**:
1. Open IIS Manager
2. Check if `TimekeeperAppPool` is running
3. If stopped, start it
4. Check Event Viewer for errors
5. Check permissions on deployment folder

### Site Shows "500 Internal Server Error"

**Cause**: Application error or configuration issue

**Solution**:
1. Check `logs\stdout` folder for error messages
2. **Temporary Troubleshooting**: Enable detailed errors in `web.config`:
   ```xml
   <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Development" />
   ```
   **⚠️ IMPORTANT**: After troubleshooting, change it back to `Production`:
   ```xml
   <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
   ```
   Development mode exposes sensitive error information!
3. Restart site and try again
4. Check Windows Event Viewer → Application logs

### Database Errors

**Cause**: IIS AppPool can't write to deployment folder

**Solution**:
```powershell
# Grant permissions
$path = "C:\inetpub\wwwroot\Timekeeper"
icacls $path /grant "IIS AppPool\TimekeeperAppPool:(OI)(CI)M" /T
```

### Can't Access from Network

**Cause**: Firewall blocking port

**Solution**:
```powershell
# Check firewall rule exists
netsh advfirewall firewall show rule name="Timekeeper HTTP"

# Add if missing
netsh advfirewall firewall add rule name="Timekeeper HTTP" dir=in action=allow protocol=TCP localport=80
```

### ASP.NET Core Module Not Found

**Cause**: Hosting Bundle not installed

**Solution**:
1. Download ASP.NET Core 8.0 Hosting Bundle
2. Install it
3. Run `iisreset` in admin command prompt

## Maintenance

### Updating to a New Version

1. **Backup database**:
   ```powershell
   Copy-Item "C:\inetpub\wwwroot\Timekeeper\timekeeper.db" -Destination "C:\Backups\timekeeper-$(Get-Date -Format 'yyyy-MM-dd').db"
   ```

2. **Stop IIS site**:
   - IIS Manager → Select site → Stop

3. **Replace files**:
   - Delete all files except `timekeeper.db` and `logs` folder
   - Extract new version files

4. **Start site**:
   - IIS Manager → Select site → Start

### Regular Backups

Create a scheduled task to backup the database:

```powershell
# Save as backup-timekeeper.ps1
$sourcePath = "C:\inetpub\wwwroot\Timekeeper\timekeeper.db"
$backupPath = "C:\Backups\Timekeeper"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"

New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
Copy-Item $sourcePath -Destination "$backupPath\timekeeper-$timestamp.db"

# Keep only last 30 days
Get-ChildItem $backupPath -Filter "timekeeper-*.db" | 
    Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-30) } | 
    Remove-Item
```

Schedule in Task Scheduler:
- Trigger: Daily at 2:00 AM
- Action: Run PowerShell script
- Run whether user is logged on or not

### Monitoring

Check application health:

1. **IIS Manager**: Ensure Application Pool is running
2. **Logs**: Review `logs\stdout` for errors
3. **Event Viewer**: Check Windows Application logs
4. **Browser**: Test accessing the application

### Restart Application

If the application becomes unresponsive:

```powershell
# Restart application pool
Restart-WebAppPool -Name "TimekeeperAppPool"

# Or restart entire IIS
iisreset
```

## Summary

You now have Work Time Tracker deployed on IIS! Key points:

✅ Access from any browser on your network
✅ Optional HTTPS with self-signed certificate  
✅ Professional server deployment
✅ Automatic database creation
✅ Logging for troubleshooting
✅ Easy to maintain and update

## Need Help?

- Check the logs folder for error messages
- Review Windows Event Viewer
- See the main README.md for application features
- Open an issue on GitHub

---

**For more information about the application itself, see the main [README.md](README.md)**
