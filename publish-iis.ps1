# Publish for IIS Deployment
# This creates a framework-dependent deployment suitable for IIS hosting

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [string]$Runtime = "win-x64"
)

Write-Host "Creating IIS Deployment Package v$Version" -ForegroundColor Cyan
Write-Host ""

# Set location to script directory
Set-Location -Path $PSScriptRoot

# Update version in version.json
Write-Host "Updating version.json..." -ForegroundColor Yellow
$versionFile = Get-Content "version.json" | ConvertFrom-Json
$versionFile.version = $Version
$versionFile.releaseDate = (Get-Date -Format "yyyy-MM-dd")
$versionFile | ConvertTo-Json -Depth 10 | Set-Content "version.json"

# Clean previous builds
Write-Host "Cleaning previous IIS builds..." -ForegroundColor Yellow
$iisFolder = ".\Release\IIS"
if (Test-Path $iisFolder) {
    Remove-Item -Path $iisFolder -Recurse -Force
}
New-Item -ItemType Directory -Path $iisFolder | Out-Null

# Publish for IIS (framework-dependent deployment)
Write-Host "Publishing for IIS deployment..." -ForegroundColor Yellow
Write-Host "   Framework-dependent deployment (requires .NET 8.0 Runtime on server)" -ForegroundColor Gray

$publishFolder = "$iisFolder\Timekeeper-IIS-v$Version"

dotnet publish Timekeeper.Api/Timekeeper.Api.csproj `
    --configuration Release `
    --runtime $Runtime `
    --output $publishFolder `
    /p:PublishSingleFile=false `
    /p:EnvironmentName=Production

if ($LASTEXITCODE -ne 0) {
    Write-Host "IIS publish failed!" -ForegroundColor Red
    exit 1
}

Write-Host "IIS deployment package created successfully!" -ForegroundColor Green

# Copy web.config if it exists (should be included automatically)
Write-Host "Ensuring web.config is present..." -ForegroundColor Yellow
if (-not (Test-Path "$publishFolder\web.config")) {
    if (Test-Path "Timekeeper.Api\web.config") {
        Copy-Item "Timekeeper.Api\web.config" -Destination $publishFolder
        Write-Host "   Copied web.config to deployment folder" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: web.config not found!" -ForegroundColor Red
    }
} else {
    Write-Host "   web.config is present" -ForegroundColor Green
}

# Create logs directory for IIS stdout logging
New-Item -ItemType Directory -Path "$publishFolder\logs" -Force | Out-Null
Write-Host "Created logs directory for IIS stdout logging" -ForegroundColor Green

# Copy documentation
Write-Host "Copying documentation..." -ForegroundColor Yellow
Copy-Item ".\README.md" -Destination $publishFolder
Copy-Item ".\IIS_DEPLOYMENT.md" -Destination $publishFolder -ErrorAction SilentlyContinue
Copy-Item ".\IIS_QUICK_START.md" -Destination $publishFolder -ErrorAction SilentlyContinue
Copy-Item ".\version.json" -Destination $publishFolder

# Create IIS deployment guide
$iisGuide = @"
# Timekeeper v$Version - IIS Deployment Guide

## Prerequisites

1. **Windows Server with IIS** (Windows Server 2016+ or Windows 10/11 with IIS enabled)
2. **.NET 8.0 Runtime or ASP.NET Core 8.0 Runtime** installed on the server
   - Download from: https://dotnet.microsoft.com/download/dotnet/8.0
   - Install either:
     - ASP.NET Core Runtime (Hosting Bundle) - Recommended
     - .NET Runtime 8.0

3. **IIS with ASP.NET Core Module V2**
   - Included in ASP.NET Core Hosting Bundle
   - Download: https://dotnet.microsoft.com/permalink/dotnetcore-current-windows-runtime-bundle-installer

## Installation Steps

### 1. Prepare IIS

1. Open **IIS Manager**
2. Create a new **Application Pool**:
   - Name: `TimekeeperAppPool`
   - .NET CLR Version: **No Managed Code**
   - Managed Pipeline Mode: **Integrated**
   - Identity: **ApplicationPoolIdentity** (default) or custom account

### 2. Deploy Application Files

1. Copy all files from this folder to your server
   - Recommended location: `C:\inetpub\wwwroot\Timekeeper`
   - Or any folder of your choice

2. Set folder permissions:
   - Right-click the folder → Properties → Security
   - Add `IIS AppPool\TimekeeperAppPool` with **Modify** permissions
   - This allows the app to create/modify the SQLite database

### 3. Create IIS Site

1. In IIS Manager, right-click **Sites** → **Add Website**
2. Configure:
   - **Site name**: `Timekeeper`
   - **Application pool**: `TimekeeperAppPool`
   - **Physical path**: Path where you copied the files
   - **Binding**:
     - Type: **http**
     - IP address: **All Unassigned**
     - Port: **80** (or any available port)
     - Host name: (leave empty or specify a hostname)

### 4. Configure for Remote Access

#### Option A: HTTP Only (Insecure but Simple)

If using port 80:
- Access from browser: `http://your-server-ip`
- No additional configuration needed

If using custom port (e.g., 8080):
- In IIS, change binding port to 8080
- Access from browser: `http://your-server-ip:8080`
- Open firewall port: `netsh advfirewall firewall add rule name="Timekeeper HTTP" dir=in action=allow protocol=TCP localport=8080`

#### Option B: HTTPS with Self-Signed Certificate (Recommended)

1. **Create Self-Signed Certificate** (run in PowerShell as Administrator):
   ```powershell
   $cert = New-SelfSignedCertificate -DnsName "timekeeper.local" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(5)
   $certThumbprint = $cert.Thumbprint
   Write-Host "Certificate created with thumbprint: $certThumbprint"
   ```

2. **Add HTTPS binding in IIS**:
   - Open IIS Manager → Select your site
   - Click **Bindings** → **Add**
   - Type: **https**
   - Port: **443**
   - SSL certificate: Select the certificate you just created
   - Click **OK**

3. **Configure Firewall**:
   ```powershell
   netsh advfirewall firewall add rule name="Timekeeper HTTPS" dir=in action=allow protocol=TCP localport=443
   ```

4. **Access from browser**:
   - Navigate to: `https://your-server-ip`
   - You'll get a certificate warning (expected with self-signed cert)
   - Click "Advanced" → "Continue to site" (wording varies by browser)
   - Or add exception for this certificate

5. **Optional: Add certificate to client computers** (eliminates warnings):
   - Export certificate from server:
     ```powershell
     $cert = Get-ChildItem -Path "cert:\LocalMachine\My" | Where-Object {$_.Thumbprint -eq "$certThumbprint"}
     Export-Certificate -Cert $cert -FilePath "C:\timekeeper-cert.cer"
     ```
   - Copy `timekeeper-cert.cer` to client computers
   - Double-click → Install Certificate
   - Store Location: **Local Machine**
   - Place in: **Trusted Root Certification Authorities**

### 5. Configure Hostname (Optional)

If you want to use a friendly name instead of IP:

1. On client computers, edit `C:\Windows\System32\drivers\etc\hosts` (requires admin):
   ```
   192.168.1.100    timekeeper.local
   ```
   (Replace with your server's IP)

2. Access via: `http://timekeeper.local` or `https://timekeeper.local`

### 6. Start the Site

1. In IIS Manager, select your site
2. Click **Start** in the Actions pane
3. Open browser and navigate to your configured URL

## Troubleshooting

### Check Application Pool
- Ensure `TimekeeperAppPool` is started
- Check pool identity has permissions to the deployment folder

### View Logs
- Check `logs\stdout` folder in your deployment directory
- Enable detailed errors in web.config:
  ```xml
  <aspNetCore processPath="dotnet" arguments=".\Timekeeper.Api.dll" stdoutLogEnabled="true" stdoutLogFile=".\logs\stdout" hostingModel="inprocess">
    <environmentVariables>
      <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Development" />
    </environmentVariables>
  </aspNetCore>
  ```

### Database Issues
- Ensure IIS AppPool identity has **Modify** permissions on deployment folder
- Database file `timekeeper.db` will be created automatically
- Check permissions if database errors occur

### Port Already in Use
- Use `netstat -ano | findstr :80` to check what's using port 80
- Choose a different port in IIS bindings

### Firewall Blocking
- Check Windows Firewall: `wf.msc`
- Add inbound rule for your chosen port

### .NET Runtime Not Found
- Install ASP.NET Core Runtime 8.0 Hosting Bundle
- Restart IIS: `iisreset` in admin command prompt

## Remote Access Checklist

✅ IIS site configured and started
✅ Firewall port opened (80 for HTTP or 443 for HTTPS)
✅ Router port forwarding configured (if accessing from internet)
✅ Self-signed certificate installed on client computers (for HTTPS without warnings)

## Default Access

After successful deployment:
- **Local**: `http://localhost` or `https://localhost`
- **Network**: `http://server-ip` or `https://server-ip`
- **Internet** (if port forwarded): `http://your-public-ip` or `https://your-public-ip`

## Data Backup

**IMPORTANT**: Your time tracking data is stored in `timekeeper.db` in the deployment folder.

Backup regularly:
- Copy `timekeeper.db` to a safe location
- Consider automated backups via scheduled tasks

## Support

For issues or questions, see the main README.md or visit the project repository.
"@

Set-Content -Path "$publishFolder\IIS_DEPLOYMENT_GUIDE.txt" -Value $iisGuide -Encoding UTF8
Write-Host "Created IIS deployment guide" -ForegroundColor Green

# Create a quick reference batch file for common IIS commands
$iisCommands = @"
@echo off
REM Quick IIS Management Commands for Timekeeper

echo ========================================
echo Timekeeper IIS Management Commands
echo ========================================
echo.
echo To restart the site:
echo    - Open IIS Manager
echo    - Select Timekeeper site
echo    - Click Restart in Actions pane
echo.
echo OR from command line (as Administrator):
echo    iisreset
echo.
echo To view logs:
echo    - Open logs\stdout folder in deployment directory
echo    - View most recent log file
echo.
echo To stop/start site from command line:
echo    appcmd stop site "Timekeeper"
echo    appcmd start site "Timekeeper"
echo.
echo To recycle application pool:
echo    appcmd recycle apppool "TimekeeperAppPool"
echo.
echo ========================================
pause
"@

Set-Content -Path "$publishFolder\IIS_COMMANDS.bat" -Value $iisCommands -Encoding ASCII
Write-Host "Created IIS commands reference" -ForegroundColor Green

# Create ZIP package
Write-Host ""
Write-Host "Creating ZIP package..." -ForegroundColor Yellow
$zipPath = "$iisFolder\Timekeeper-IIS-v$Version.zip"
Compress-Archive -Path "$publishFolder\*" -DestinationPath $zipPath -Force
Write-Host "ZIP package created: $zipPath" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IIS Deployment Package Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package location:" -ForegroundColor Yellow
Write-Host "   Folder: $publishFolder" -ForegroundColor White
Write-Host "   ZIP:    $zipPath" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "   1. Copy the ZIP file to your IIS server" -ForegroundColor White
Write-Host "   2. Extract to C:\inetpub\wwwroot\Timekeeper (or your preferred location)" -ForegroundColor White
Write-Host "   3. Follow the instructions in IIS_DEPLOYMENT_GUIDE.txt" -ForegroundColor White
Write-Host "   4. Set up IIS site and application pool" -ForegroundColor White
Write-Host "   5. Configure firewall and access" -ForegroundColor White
Write-Host ""
Write-Host "For HTTPS with self-signed certificate, see the guide's Option B section." -ForegroundColor Cyan
Write-Host ""
