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
