# Support

## Purpose

Use the Support page to submit issues directly from the application to GitHub Issues.

## Who can submit

Any authenticated user can create a support ticket.

## Before first use

An admin must configure the target repository in **Settings → Support Repository**:

- GitHub Owner
- GitHub Repository
- GitHub Token (can be added, rotated, or removed in the UI)

If these values are not set, users can open the Support page but cannot submit tickets.

## Ticket fields

Required fields:

- Title
- Category
- Severity
- Description
- Steps to Reproduce
- Expected Behavior
- Actual Behavior

Optional fields:

- Browser / User Agent
- Operating System
- App Version
- Contact Email

## What happens after submit

- The backend creates a GitHub issue using server-side credentials.
- The app returns the created issue number and URL.
- Users can open the issue directly from the success link.

## Notes

- Repository credentials are stored server-side in encrypted form and are not exposed in the browser.
- Admins can use **Test GitHub Connection** in Settings to validate owner/repo/token before saving changes.
- If GitHub integration is unavailable, the app shows a submit error and the ticket is not created.
