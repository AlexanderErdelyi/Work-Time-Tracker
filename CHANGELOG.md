# Changelog

All notable changes to this project are documented in this file.

> **Format note:** Each version heading may be followed by an optional one-line title.
> This title is automatically picked up by the in-app "What's New" changelog drawer.

## [3.1.0] - 2026-04-26
Activity Sync, Timezone Fix & UX Improvements

### Added
- Multi-ADO connector support: connect multiple Azure DevOps organizations simultaneously.
- Smart activity suggestion chain: ADO project name token matching, connector label matching, AI fallback.
- Granular confidence badges on activity suggestions: Exact match, Rule match, Likely, Uncertain, AI.
- AI search tab and Polish for invoice button on the Activity edit panel.
- Language-aware AI note polishing based on the user's configured output language.
- Notification sound selection with preview playback in Settings.
- Custom notification sounds served from wwwroot/sounds on hosted deployments.
- Microsoft Graph PKCE (public client) OAuth flow — no client secret required.

### Fixed
- Check-in and check-out times showing 2 hours ahead after DST (daylight saving time) change.
- Break timer stuck at 00:00 after DST change — now counts up correctly.
- Activity suggestion cross-customer contamination: org-level inheritance now requires same ADO project.
- Notification sounds not loading on shared-host deployments (server was looking in the wrong directory).
- Polish button clipped inside the notes textarea on the Activity edit panel.

## [3.0.0] - 2026-03-03
AI Assistant & Smart Workflow Tools

### Added
- AI Assistant chat with streaming responses and full tool-calling support.
- ERP import via AI: create customers, projects, and tasks from natural language with preview-before-create workflow.
- AI Task Picker on Dashboard: describe your work in plain language and let AI resolve the matching task.
- Polish Note button on all note fields: rewrites raw notes into professional invoice-ready language.
- Configurable AI output language (11 languages: English, German, French, Hungarian, and more).
- Chat history persisted across navigation sessions.
- In-app "What's New" changelog drawer with release notification badge.

### Changed
- Settings page now includes AI configuration section for admins (API token, enable/disable, connection test).
- Settings page now includes AI Output Language preference for all users.

## [3.0.0-rc1] - 2026-02-23
Multi-User Workspace Foundation

### Added
- Workspace and user domain foundation for multi-user/self-hosted deployments.
- Role-based access control policies for Admin and Manager capabilities.
- Time entry lifecycle states: Draft, Submitted, Approved, Rejected, Locked.
- Time entry lifecycle transition endpoints (`submit`, `approve`, `reject`, `lock`, `reopen`).
- Workspace context and membership management APIs.
- Reports page chart-section lazy loading and improved empty-state actions.
- Development login screen with role/workspace options and sign-out support.
- Admin user maintenance UI in Settings (create user, role update, activate/deactivate).

### Changed
- Core entity access patterns now use tenant-safe query paths under workspace scoping.
- Mutating API endpoints now enforce role-aware authorization rules.
- Frontend routing/chunk strategy refined to reduce initial bundle cost.
- Timer pause/resume duration tests made deterministic (no `Task.Delay` dependence).
- Time entries, work days, breaks, and reports are now filtered to the current logged-in user.

### Validation
- Backend tests: 19 passed, 0 failed.
- Frontend production build: successful.

## [1.0.0] - 2026-02-05
Initial Release

### Added
- Initial release with core time tracking, CRUD operations, filtering/search, import/export, and reporting.
