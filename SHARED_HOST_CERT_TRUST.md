# Shared Host Certificate Trust

Share with colleagues:
- `timekeeper-https-fqdn.cer`
- `trust-shared-https-cert.ps1` (optional)

Do **not** share:
- `.pfx`
- password file

## Client trust (recommended, Admin PowerShell)
```powershell
Import-Certificate -FilePath ".\timekeeper-https-fqdn.cer" -CertStoreLocation "Cert:\LocalMachine\Root"
```

Optional helper script:
```powershell
.\trust-shared-https-cert.ps1 -CertificatePath ".\timekeeper-https-fqdn.cer" -TrustLocalMachine
```

Use this URL:
`https://srvbc2506.applabs.local:5443/`

If cert changes, re-share new `.cer` and re-import.
