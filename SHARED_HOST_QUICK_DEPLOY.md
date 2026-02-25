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

## Automated deploy (GitHub self-hosted runner)
1. Install a self-hosted Windows runner on the host and label it: `timekeeper-shared`.

	One-command bootstrap (run as Administrator on host):

	```powershell
	.\install-github-runner-service.ps1 -RunnerUrl "https://github.com/<owner>/<repo>" -RunnerToken "<registration-token>"
	```

	Get the token in GitHub: **Settings → Actions → Runners → New self-hosted runner**.
2. Create GitHub Environment `production` with required approval.
3. Add secret `SHARED_HOST_CERT_PASSWORD` (optional if password file exists on host).
4. Merge your feature branch into `main`.
5. Push to `main` automatically starts `.github/workflows/release.yml`.
6. Release workflow auto-increments **patch** version from latest tag (for example `v3.0.2` → `v3.0.3`), creates release, then deploys automatically.
7. For manual workflow runs, you can choose `release_type` = `patch` / `minor` / `major` (ignored if `tag` is explicitly provided).
8. Keep `auto_deploy = true` (default) for manual runs; set `auto_deploy = false` to create release only, then run `.github/workflows/deploy-shared-host.yml` manually.

Deploy uses `deploy-shared-host-release.ps1` for stop → backup → deploy → start → verify (auto rollback on failure).

## Reset / remove runner (host)
Run as Administrator:

```powershell
.\remove-github-runner-service.ps1 -InstallRoot "C:\actions-runner\timekeeper-shared" -RunnerToken "<registration-token>" -DeleteFiles
```

If you do not have a token, omit `-RunnerToken` (service is still removed).
