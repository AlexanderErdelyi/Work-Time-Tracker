# Changelog

All notable changes to this project are documented in this file.

## [3.0.0-rc1] - 2026-02-23

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

### Added
- Initial release with core time tracking, CRUD operations, filtering/search, import/export, and reporting.
