# Quick Start - IIS Deployment

Deploy Work Time Tracker to Windows Server with IIS in 10 minutes!

## Prerequisites Checklist

✅ Windows Server with IIS installed
✅ .NET 8.0 Runtime (ASP.NET Core Hosting Bundle)
✅ Administrator access to the server

## Step 1: Download Package (2 min)

1. Download `Timekeeper-IIS-v{version}.zip` from GitHub releases
2. Extract to a folder on your server: `C:\inetpub\wwwroot\Timekeeper`

## Step 2: Install .NET Runtime (3 min - skip if already installed)

1. Download ASP.NET Core 8.0 Hosting Bundle from Microsoft
2. Run installer
3. After installation, restart IIS:
   ```cmd
   iisreset
   ```

## Step 3: Create Application Pool (1 min)

1. Open **IIS Manager** (run `inetmgr`)
2. Right-click **Application Pools** → **Add Application Pool**
3. Name: `TimekeeperAppPool`
4. .NET CLR version: **No Managed Code**
5. Click **OK**

## Step 4: Set Permissions (1 min)

Run in PowerShell as Administrator:

```powershell
$path = "C:\inetpub\wwwroot\Timekeeper"
icacls $path /grant "IIS AppPool\TimekeeperAppPool:(OI)(CI)M" /T
```

## Step 5: Create Website (2 min)

1. In IIS Manager, right-click **Sites** → **Add Website**
2. Configure:
   - Site name: `Timekeeper`
   - Application pool: `TimekeeperAppPool`
   - Physical path: `C:\inetpub\wwwroot\Timekeeper`
   - Port: `80` (or 8080 if 80 is taken)
3. Click **OK**

## Step 6: Configure Firewall (1 min)

```powershell
# For port 80
netsh advfirewall firewall add rule name="Timekeeper HTTP" dir=in action=allow protocol=TCP localport=80

# Or for custom port (e.g., 8080)
netsh advfirewall firewall add rule name="Timekeeper HTTP" dir=in action=allow protocol=TCP localport=8080
```

## Step 7: Test! (30 seconds)

1. Open browser on server: `http://localhost`
2. From another computer: `http://server-ip` or `http://server-ip:8080`
3. You should see the Timekeeper interface!

## 🎉 Done!

You can now access Work Time Tracker from any computer on your network!

---

## Optional: HTTPS Setup (5 min)

For encrypted connections:

```powershell
# Create self-signed certificate
$cert = New-SelfSignedCertificate -DnsName "timekeeper.local" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(5)

# Note the thumbprint for IIS configuration
Write-Host "Thumbprint: $($cert.Thumbprint)"
```

Then in IIS:
1. Select your site → **Bindings** → **Add**
2. Type: `https`, Port: `443`
3. Select your certificate
4. Open firewall port 443:
   ```powershell
   netsh advfirewall firewall add rule name="Timekeeper HTTPS" dir=in action=allow protocol=TCP localport=443
   ```

Access via: `https://server-ip`

---

## Troubleshooting

### 503 Error
- Application pool stopped → Start it in IIS Manager
- Check permissions on deployment folder

### 500 Error
- Check `logs\stdout` folder for errors
- Verify .NET 8.0 Runtime is installed

### Can't Access from Network
- Check firewall rule exists
- Verify Windows Firewall is not blocking

---

## Full Documentation

For complete details, see **IIS_DEPLOYMENT.md** included in the package.

## Security Notes

- This setup is suitable for internal network use
- For internet-facing deployments:
  - ✅ Use HTTPS (not HTTP)
  - ✅ Consider using a real SSL certificate
  - ✅ Implement authentication if needed
  - ✅ Keep .NET Runtime updated
  - ✅ Regular database backups

## Need Help?

1. Check `logs\stdout` folder for errors
2. Review IIS_DEPLOYMENT.md for detailed troubleshooting
3. Open an issue on GitHub
