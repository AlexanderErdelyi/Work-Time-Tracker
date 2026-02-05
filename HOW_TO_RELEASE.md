# 🚀 How to Create Your First Release

This guide will walk you through creating the first release of Timekeeper that your colleagues can easily download and use.

## 📋 Prerequisites

✅ You have the latest code committed to your repository  
✅ All features are tested and working  
✅ You're ready to share with others

## 🎯 Two Ways to Create a Release

### Option 1: Automatic via GitHub (Recommended) ⭐

This is the **easiest and most professional** way. GitHub will automatically build the application and create a release page where your colleagues can download it.

#### Step 1: Prepare the Release

1. Make sure all your changes are committed:
   ```bash
   git status
   git add .
   git commit -m "Prepare for v1.0.0 release"
   git push
   ```

#### Step 2: Create and Push a Version Tag

2. Create a version tag (this triggers the automated build):
   ```bash
   git tag -a v1.0.0 -m "First release - v1.0.0"
   git push origin v1.0.0
   ```

   💡 **That's it!** GitHub Actions will automatically:
   - Build the self-contained application
   - Create the ZIP file
   - Generate release notes
   - Publish everything to GitHub Releases

#### Step 3: Wait for Build to Complete

3. Go to your GitHub repository and click on "Actions"
4. You'll see the "Create Release" workflow running
5. Wait for it to complete (usually 5-10 minutes)
6. A green checkmark ✅ means success!

#### Step 4: Check Your Release

7. Go to your repository on GitHub
8. Click "Releases" on the right side
9. You'll see "Timekeeper v1.0.0" with the ZIP file ready to download!

#### Step 5: Share with Colleagues

10. Copy the release URL (looks like: `https://github.com/YourUsername/Work-Time-Tracker/releases/tag/v1.0.0`)
11. Send them this email:

```
Subject: Timekeeper - Time Tracking App is Ready!

Hi everyone,

I'm excited to share Timekeeper v1.0.0 - our new time tracking application!

📥 Download here:
https://github.com/YourUsername/Work-Time-Tracker/releases/tag/v1.0.0

✅ Super Easy Setup (No technical knowledge needed):
1. Click the link above
2. Download "Timekeeper-v1.0.0-win-x64.zip"
3. Extract the ZIP file to any folder
4. Double-click "START_TIMEKEEPER.bat"
5. Your browser opens automatically - start tracking!

🎯 No installation required! Everything is included!

📖 Full instructions are in the "SIMPLE_USER_GUIDE.md" file in the ZIP.

💾 Important: Your data is saved in "timekeeper.db" - back it up regularly!

Questions? Just reply to this email!

Best regards
```

---

### Option 2: Manual Build (Alternative)

If you prefer to build locally or GitHub Actions doesn't work:

#### Step 1: Run the Build Script

1. Open PowerShell in your project folder
2. Run:
   ```powershell
   .\publish-standalone.ps1 -Version "1.0.0"
   ```

3. Wait for the build to complete (2-5 minutes)
4. The ZIP will be created at: `Release\Timekeeper-v1.0.0-win-x64.zip`

#### Step 2: Test the Build

5. Go to `Release\Timekeeper-v1.0.0-win-x64\`
6. Double-click `START_TIMEKEEPER.bat`
7. Verify everything works
8. Close the console window

#### Step 3: Create GitHub Release Manually

9. Go to your GitHub repository
10. Click "Releases" → "Create a new release"
11. Click "Choose a tag" and type `v1.0.0`, then "Create new tag: v1.0.0"
12. Set title: "Timekeeper v1.0.0"
13. In description, paste:

```markdown
# Timekeeper v1.0.0

Released: February 5, 2026

## ✨ What's New

- Initial release
- Core time tracking functionality
- Customer, Project, and Task management
- Excel and CSV export
- Dark mode support
- Advanced table features

## 📥 Download & Installation

### For Non-Technical Users (Recommended) 🌟

1. Download **Timekeeper-v1.0.0-win-x64.zip** below
2. Extract the ZIP file to any folder
3. Double-click **START_TIMEKEEPER.bat**
4. Your browser opens automatically - start tracking time!

**No installation required! No .NET needed!**

📖 See **SIMPLE_USER_GUIDE.md** (included in ZIP) for detailed instructions.

### ⚙️ Requirements

- Windows 10 or 11 (64-bit)
- No other software needed!

### 📝 Important Notes

- **Your data**: Stored in `timekeeper.db` file - backup regularly!
- **Offline**: Works without internet connection
- **Privacy**: All data stays on your computer

## 🆘 Need Help?

- Read **SIMPLE_USER_GUIDE.md** for instructions
- Check **SETUP_GUIDE.md** for troubleshooting
- Open an issue on GitHub
```

14. Drag and drop your `Timekeeper-v1.0.0-win-x64.zip` file to attach it
15. Click "Publish release"

#### Step 4: Share with Colleagues

16. Copy the release URL
17. Send the email template from Option 1 above

---

## 🔄 Creating Future Releases

When you want to release v1.1.0, v1.2.0, etc.:

### Using GitHub (Automatic):
```bash
# Update version.json if needed (or it will auto-update)
git add .
git commit -m "Prepare for v1.1.0 release"
git push

# Create and push tag
git tag -a v1.1.0 -m "Version 1.1.0"
git push origin v1.1.0
```

### Manual Build:
```powershell
.\publish-standalone.ps1 -Version "1.1.0"
```

Then follow the same steps as above!

---

## 📊 Version Numbering Guide

Use Semantic Versioning (MAJOR.MINOR.PATCH):

- **1.0.0 → 2.0.0** (MAJOR): Breaking changes, major redesign
- **1.0.0 → 1.1.0** (MINOR): New features, improvements
- **1.0.0 → 1.0.1** (PATCH): Bug fixes only

Examples:
- `v1.0.0` - First release
- `v1.1.0` - Added new export feature
- `v1.0.1` - Fixed timer bug
- `v2.0.0` - Complete UI redesign

---

## ✅ Pre-Release Checklist

Before creating a release, make sure:

- [ ] Application builds successfully
- [ ] All features tested and working
- [ ] No console errors
- [ ] Documentation is up to date
- [ ] version.json has correct version and features listed
- [ ] Database migrations work
- [ ] Test the self-contained build works

---

## 🎯 Quick Reference

### Create Release (GitHub - Automatic):
```bash
git tag -a v1.0.0 -m "First release"
git push origin v1.0.0
```

### Create Release (Manual):
```powershell
.\publish-standalone.ps1 -Version "1.0.0"
```

### Check Release Status:
Go to: `https://github.com/YourUsername/Work-Time-Tracker/actions`

### View Releases:
Go to: `https://github.com/YourUsername/Work-Time-Tracker/releases`

---

## 🆘 Troubleshooting

### "GitHub Actions workflow didn't run"
- Make sure you pushed the tag: `git push origin v1.0.0`
- Check that the workflow file exists: `.github/workflows/release.yml`
- Go to Settings → Actions → General, ensure workflows are enabled

### "Build failed in GitHub Actions"
- Click on the failed workflow in the Actions tab
- Check the error logs
- Common issues:
  - .NET version mismatch (we use .NET 8)
  - Missing dependencies
  - Code syntax errors

### "Can't push tags"
```bash
# Make sure you're on the right branch
git checkout main

# Pull latest changes
git pull

# Try pushing tag again
git push origin v1.0.0
```

### "Manual build script fails"
- Make sure you have .NET 8 SDK installed
- Run from project root directory
- Try: `dotnet --version` to check .NET installation
- Try building first: `dotnet build`

---

## 🎉 You're Ready!

You now have everything you need to create and share your first release!

**Next step:** Just run one of these commands:

```bash
# Automatic via GitHub (recommended)
git tag -a v1.0.0 -m "First release - v1.0.0"
git push origin v1.0.0
```

or

```powershell
# Manual build
.\publish-standalone.ps1 -Version "1.0.0"
```

Then share the download link with your colleagues! 🚀
