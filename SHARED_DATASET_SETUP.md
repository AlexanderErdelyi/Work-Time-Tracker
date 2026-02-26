# Shared Dataset Setup (Single Host)

Use this setup when multiple colleagues should work on the same data.

## Architecture
- One host machine runs Timekeeper API
- One shared SQLite database file on that host
- All colleagues open the same URL in browser

## 1) Start shared server
From repository root:

```powershell
.\run-api-shared.ps1 -Port 5000 -Environment Production -BindAddress 0.0.0.0
```

Run in background (recommended for host machine):

```powershell
.\run-api-shared.ps1 -Port 5000 -Environment Production -BindAddress 0.0.0.0 -Background
```

What this does:
- Checks if port is already in use before starting
- Saves PID to `Data\timekeeper-api.pid`
- Starts API in background so you can close PowerShell
- Prints stop command

Optional custom database folder:

```powershell
.\run-api-shared.ps1 -DataDirectory "D:\TimekeeperData" -Port 5000
```

## Alternative: Create host bundle on your local machine

Create a host-ready ZIP (recommended when deploying to another machine):

```powershell
.\package-shared-host.ps1
```

Generated output:
- `Release/Timekeeper-Shared-Host-v<version>/`
- `Release/Timekeeper-Shared-Host-v<version>.zip`

Copy the ZIP to host machine, extract it, then run:

```powershell
.\START_SHARED_HOST.ps1
```

To stop the instance:

```powershell
.\STOP_SHARED_HOST.ps1
```

To check status (PID file + port listener):

```powershell
.\STATUS_SHARED_HOST.ps1
```

## 2) Open firewall on host
Run PowerShell as Administrator:

```powershell
New-NetFirewallRule -DisplayName "Timekeeper API 5000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5000
```

## 3) Share URL with colleagues
- Preferred: `http://<HOSTNAME>:5000`
- Fallback: `http://<HOST-IP>:5000`

Find host information:

```powershell
hostname
ipconfig
```

Test from another machine:

```powershell
Test-NetConnection <HOSTNAME> -Port 5000
```

## HTTPS setup (required for PWA install + system idle detection on host IP/hostname)

Browser features like PWA installation and `IdleDetector` require a secure context.
`localhost` is treated specially by browsers, but `http://<HOST-IP>` is not secure.

### 1) Create/export a PFX certificate on host

Easiest option (auto-generates certificate + strong password, with SAN support):

```powershell
.\create-shared-https-cert.ps1 -DnsNames "srvbc2506","srvbc2506.applabs.local"
```

This creates:
- `certs\timekeeper-https.pfx`
- `certs\timekeeper-https.cer`
- `certs\timekeeper-https.pfx.password.txt` (contains generated password)

Optional: trust certificate on host for current user:

```powershell
.\create-shared-https-cert.ps1 -DnsNames "srvbc2506","srvbc2506.applabs.local" -TrustCurrentUser
```

Optional: trust certificate machine-wide (run elevated):

```powershell
.\create-shared-https-cert.ps1 -DnsNames "srvbc2506","srvbc2506.applabs.local" -TrustLocalMachine
```

Notes:
- If no DNS names are provided, the script now auto-includes short hostname, detected FQDN, and `localhost`.
- For browser trust without hostname warnings, always include the exact URL hostname clients will use.

Example (self-signed cert for host DNS name):

```powershell
$cert = New-SelfSignedCertificate -DnsName "timekeeper.local" -CertStoreLocation "Cert:\LocalMachine\My"
$pwd = ConvertTo-SecureString "ChangeThisPassword!" -AsPlainText -Force
Export-PfxCertificate -Cert $cert -FilePath "C:\Timekeeper\certs\timekeeper.pfx" -Password $pwd
```

### 2) Start shared API with HTTPS + HTTP

```powershell
.\run-api-shared.ps1 -Port 5000 -UseHttps -HttpsPort 5443 -CertificatePath "C:\Timekeeper\certs\timekeeper.pfx" -CertificatePassword "ChangeThisPassword!" -Environment Production -BindAddress 0.0.0.0 -Background
```

If you used `create-shared-https-cert.ps1`, use values from `certs\timekeeper-https.pfx.password.txt`.

If using packaged host scripts:

```powershell
.\START_SHARED_HOST.ps1 -UseHttps -HttpsPort 5443 -CertificatePath "C:\Timekeeper\certs\timekeeper.pfx" -CertificatePassword "ChangeThisPassword!"
```

If auto-generating the cert from `START_SHARED_HOST.ps1`, you can pass SAN names directly:

```powershell
.\START_SHARED_HOST.ps1 -UseHttps -HttpsPort 5443 -CertificateDnsNames "srvbc2506","srvbc2506.applabs.local" -AutoTrustCurrentUser
```

Quick mode (auto-generate cert + password if not provided):

```powershell
.\START_SHARED_HOST.ps1 -UseHttps -HttpsPort 5443
```

This creates certificate files under `certs\` and uses them automatically.

If you also want the host user to trust the generated certificate automatically:

```powershell
.\START_SHARED_HOST.ps1 -UseHttps -HttpsPort 5443 -AutoTrustCurrentUser
```

Machine-wide trust (admin required):

```powershell
.\START_SHARED_HOST.ps1 -UseHttps -HttpsPort 5443 -AutoTrustLocalMachine
```

### 3) Open firewall for HTTPS port

```powershell
New-NetFirewallRule -DisplayName "Timekeeper API 5443" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5443
```

### 4) Use HTTPS URL in browser

- `https://<HOSTNAME>:5443`
- or `https://<HOST-IP>:5443`

For self-signed certificates, clients must trust the certificate chain to avoid browser warnings.

### 5) Certificate trust setup for client PCs

For users accessing the shared Timekeeper instance via HTTPS, they need to trust the certificate to avoid browser warnings.

**📦 Option 1: Use the Trust Package (Easiest for Distribution)**

Create a complete trust package with certificate, script, and instructions:

```powershell
.\package-cert-trust.ps1
```

This creates `Release\timekeeper-cert-trust-package.zip` containing everything users need.

Share this ZIP file with your team - they just extract and run the included script.

**📋 Option 2: Manual Distribution**

Copy `certs\timekeeper-https.cer` and `trust-shared-https-cert.ps1` to each client machine,
then run:

```powershell
.\trust-shared-https-cert.ps1
```

This imports the cert to `CurrentUser\Root` (no admin required).

Machine-wide trust (admin required):

```powershell
.\trust-shared-https-cert.ps1 -TrustLocalMachine
```

**📚 Complete Documentation**

For detailed browser-specific instructions and troubleshooting, see:
- [Certificate Trust Guide](CERTIFICATE_TRUST_GUIDE.md) - Comprehensive guide for end users
- [Shared Host Certificate Trust](SHARED_HOST_CERT_TRUST.md) - Quick reference for administrators

## 4) User onboarding
- Log in as admin on the shared URL
- Open Users management in the app
- Create users and assign roles (`Admin`, `Manager`, `User`)

## 5) Backup strategy (recommended daily)
1. Stop API briefly
2. Backup database files:
   - `timekeeper.db`
   - `timekeeper.db-wal` (if present)
   - `timekeeper.db-shm` (if present)

Example:

```powershell
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Path ".\backups\$ts" -Force | Out-Null
Copy-Item ".\Data\timekeeper.db*" ".\backups\$ts\" -Force
```

## 6) Update procedure
1. Notify users about short downtime
2. Stop API
3. Backup DB files
4. Pull/copy new app version
5. Start server again with `run-api-shared.ps1`
6. Validate from host and one client

## Troubleshooting
- **Port already in use**
  ```powershell
  Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
  Stop-Process -Id <PID> -Force
  ```
- **Stop by PID file**
  ```powershell
  .\stop-api-shared.ps1 -Port 5000
  ```
- **Status shows partial/mismatch state**
  - Run `STOP_SHARED_HOST.ps1 -KillPortOwner`
  - Then run `START_SHARED_HOST.ps1` again
- **Force stop current port owner**
  ```powershell
  .\stop-api-shared.ps1 -Port 5000 -KillPortOwner
  ```
- **Clients cannot connect**
  - Confirm firewall rule exists
  - Confirm API is started with `BindAddress 0.0.0.0`
  - Try host IP URL instead of hostname
- **Database locked errors**
  - Ensure only one API process is running against the same DB file
