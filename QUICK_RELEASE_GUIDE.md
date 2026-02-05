# 🚀 Quick Release Reference Card

## Create a New Release (2 Commands)

```bash
# Step 1: Create and push a version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# That's it! GitHub Actions will build and publish automatically.
```

### What Happens Automatically?
✅ Application is built (self-contained, no .NET needed)  
✅ ZIP file is created with all documentation  
✅ GitHub Release page is created  
✅ Release notes are generated from version.json  
✅ Ready-to-share download link is created  

---

## Where to Find Your Release

**Release Page:** `https://github.com/YourUsername/Work-Time-Tracker/releases`

**Check Build Status:** `https://github.com/YourUsername/Work-Time-Tracker/actions`

---

## Share with Colleagues

**Email Template:**

```
Subject: Timekeeper v1.0.0 - Time Tracking App

Hi team,

Timekeeper v1.0.0 is ready! Download here:
https://github.com/YourUsername/Work-Time-Tracker/releases/tag/v1.0.0

Quick Start (3 steps):
1. Download "Timekeeper-v1.0.0-win-x64.zip"
2. Extract to any folder
3. Double-click "START_TIMEKEEPER.bat"

No installation needed! Works offline!

Full guide is in SIMPLE_USER_GUIDE.md (included in ZIP).

Your data saves to "timekeeper.db" - remember to back it up!
```

---

## Version Numbers

Follow Semantic Versioning:

- **Major (v2.0.0)**: Breaking changes, major redesign
- **Minor (v1.1.0)**: New features, improvements  
- **Patch (v1.0.1)**: Bug fixes only

Examples:
- `v1.0.0` → First release
- `v1.1.0` → Added new feature
- `v1.0.1` → Fixed a bug
- `v2.0.0` → Major rewrite

---

## Pre-Release Checklist

Before creating a release:

- [ ] All changes committed and pushed
- [ ] Features tested and working
- [ ] Documentation updated
- [ ] version.json updated (optional - auto-updates on release)
- [ ] No build errors: `dotnet build`
- [ ] Tests pass: `dotnet test`

---

## Common Commands

### Check What You're Releasing
```bash
git status                    # See uncommitted changes
git log --oneline -5         # See recent commits
git tag                      # List existing tags
```

### Create Release Tag
```bash
git tag -a v1.0.0 -m "First release - v1.0.0"
git push origin v1.0.0
```

### Delete a Tag (if you made a mistake)
```bash
# Delete locally
git tag -d v1.0.0

# Delete remotely  
git push origin --delete v1.0.0
```

### View Build Logs
```bash
# Or go to: GitHub → Your Repo → Actions → Click on workflow run
```

---

## Manual Build (Alternative)

If you prefer to build locally instead of using GitHub Actions:

```powershell
# Windows PowerShell
.\publish-standalone.ps1 -Version "1.0.0"

# Output: Release\Timekeeper-v1.0.0-win-x64.zip
```

Then upload the ZIP to GitHub Releases manually.

---

## Troubleshooting

### "Workflow didn't trigger"
- Verify tag was pushed: `git push origin v1.0.0`
- Check Actions are enabled: GitHub → Settings → Actions
- Verify workflow file exists: `.github/workflows/release.yml`

### "Build failed"
- Click on failed workflow in Actions tab
- Read error logs
- Common fixes:
  - Make sure code builds: `dotnet build`
  - Check for syntax errors
  - Ensure all dependencies are available

### "Can't create tag - already exists"
```bash
# Delete and recreate
git tag -d v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0 --force
```

---

## Need More Help?

📖 **Full Guide:** [HOW_TO_RELEASE.md](HOW_TO_RELEASE.md)  
📖 **Distribution Guide:** [DISTRIBUTION_GUIDE.md](DISTRIBUTION_GUIDE.md)  
📖 **User Guide for Colleagues:** [SIMPLE_USER_GUIDE.md](SIMPLE_USER_GUIDE.md)

---

## Quick Reference URLs

Replace `YourUsername` with your actual GitHub username:

- **Releases:** `https://github.com/YourUsername/Work-Time-Tracker/releases`
- **Actions:** `https://github.com/YourUsername/Work-Time-Tracker/actions`
- **Repository:** `https://github.com/YourUsername/Work-Time-Tracker`

---

**Remember:** Just 2 commands to release! 🎉

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```
