# Shared Host Quick Deploy

## Build package (dev machine)
```powershell
.\package-shared-host.ps1
```

Output:
- `Release/Timekeeper-Shared-Host-v<version>.zip`

## Deploy update (server)
```powershell
.\STOP_SHARED_HOST.ps1 -Port 5000 -KillPortOwner
```

1. Keep `Data\` and `certs\`.
2. Replace app files with the new package files.
3. Start again:

```powershell
.\START_SHARED_HOST.ps1 -UseHttps -HttpsPort 5443 -CertificatePath ".\certs\timekeeper-https-fqdn.pfx" -CertificatePassword "<password>"
```

## Check
```powershell
.\STATUS_SHARED_HOST.ps1 -Port 5000
```
Open: `https://srvbc2506.applabs.local:5443/`
