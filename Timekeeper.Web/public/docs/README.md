# Timekeeper Documentation

This folder contains the **source documentation** for Timekeeper.

## Audience

- End users
- Team leads
- IT support

## Documents

- `manifest.json`
- `getting-started.md`
- `daily-workflow.md`
- `time-entries.md`
- `work-days.md`
- `reports.md`
- `settings.md`
- `support.md`
- `troubleshooting.md`
- `faq.md`

## In-App Docs

The in-app Documentation page loads files from `Timekeeper.Web/public/docs/`.

Sync is automated from `docs/` to `Timekeeper.Web/public/docs/` with:

- `npm run sync-docs` (from `Timekeeper.Web/`)
- `npm run build` (runs sync automatically via `prebuild`)
