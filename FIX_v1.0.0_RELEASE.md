# How to Fix the v1.0.0 Release and Add the Missing ZIP File

## Problem
The v1.0.0 release exists but doesn't have the downloadable ZIP file with the application.

## Why This Happened
The release was likely created via the GitHub UI, which creates a tag but doesn't trigger the automated workflow. The workflow only triggers when you push a tag using git commands.

## Solution: Add the ZIP File to v1.0.0

You have **two options**:

### Option 1: Manually Trigger the Workflow (Recommended ✨)

This is the easiest way! The workflow now supports manual triggering:

1. Go to your repository on GitHub
2. Click **"Actions"** at the top
3. Click **"Create Release"** in the left sidebar
4. Click the **"Run workflow"** button (right side)
5. Enter `v1.0.0` in the "Tag to release" field
6. Click **"Run workflow"**

The workflow will:
- Build the application
- Create the ZIP file  
- Attach it to your existing v1.0.0 release

**That's it!** ✅

---

### Option 2: Build Locally and Upload Manually

If you prefer to build locally:

1. **Build the release locally:**
   ```powershell
   # Run from project root
   .\publish-standalone.ps1 -Version "1.0.0"
   ```

2. **Locate the ZIP file:**
   - Path: `Release\Timekeeper-v1.0.0-win-x64.zip`

3. **Upload to GitHub Release:**
   - Go to: https://github.com/AlexanderErdelyi/Work-Time-Tracker/releases/tag/v1.0.0
   - Click **"Edit"** (pencil icon)
   - Drag and drop the ZIP file into the assets area
   - Click **"Update release"**

---

## For Future Releases

To ensure the workflow runs automatically, **always push tags using git**:

```bash
# Create a new version tag
git tag -a v1.0.1 -m "Release v1.0.1"

# Push the tag (this triggers the workflow!)
git push origin v1.0.1
```

**Don't create releases via the GitHub UI!** Always push tags via git to trigger the automated workflow.

---

## Alternative: Manual Trigger for Any Release

You can now manually trigger the workflow for any tag:

1. Create/push your tag first:
   ```bash
   git tag -a v1.0.1 -m "Release v1.0.1"
   git push origin v1.0.1
   ```

2. If the workflow doesn't run automatically, trigger it manually:
   - GitHub → Actions → Create Release → Run workflow
   - Enter the tag name (e.g., `v1.0.1`)

---

## Quick Reference

### Automatic (Recommended)
```bash
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
# Workflow runs automatically ✓
```

### Manual Trigger
- GitHub UI: Actions → Create Release → Run workflow
- Enter tag name: `v1.0.0` (or any existing tag)

### Local Build
```powershell
.\publish-standalone.ps1 -Version "1.0.1"
# Upload ZIP from Release\ folder
```

---

## Verify Your Release

After the workflow completes (or after manual upload):

1. Go to: https://github.com/AlexanderErdelyi/Work-Time-Tracker/releases
2. Click on your release (e.g., v1.0.0)
3. Verify the ZIP file is listed under "Assets"
4. Download and test it!

---

## Need Help?

- **Workflow failed?** Check Actions tab for error logs
- **Tag already exists?** You can retrigger the workflow manually
- **Want to rebuild?** Use manual trigger option

Your colleagues will thank you! 🎉
