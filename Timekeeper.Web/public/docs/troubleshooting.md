# Troubleshooting

## Login issues

- Verify selected sign-in provider is configured
- For Windows auth, verify domain connectivity and credentials
- If external login fails, retry and check callback URL config

## Timer looks incorrect

- Refresh and confirm system time is correct
- Ensure a running timer is not paused unexpectedly
- Verify entry status and timestamps in Time Entries

## Service/API connection problems

- Confirm backend is running
- Confirm frontend is running on expected port
- Check browser console/network errors

## HTTPS certificate warnings

If you see security warnings when accessing via HTTPS:

- **Follow the [Certificate Trust Guide](certificate-trust.md)** to install the certificate
- Verify the certificate is installed correctly (see guide for details)
- Ensure you're using the correct server name/URL
- Restart your browser after installing the certificate

For detailed instructions, see: **[Certificate Trust Guide](certificate-trust.md)**

## Export failures

- Retry with smaller date range
- Check popup blockers (exports open new tab/window)
