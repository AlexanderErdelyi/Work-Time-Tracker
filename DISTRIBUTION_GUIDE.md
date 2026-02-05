# 📤 Distribution Guide - How to Share Timekeeper

This guide explains how to distribute Timekeeper to others and provide updates.

## 🎯 Distribution Options

### Option 1: Self-Contained Build (Recommended for Non-Technical Users) ⭐

**Perfect for**: Users without IT knowledge, no installation required, just double-click to run!

This creates a standalone executable with everything included:
- ✅ No .NET installation needed
- ✅ No command line required
- ✅ Just extract and double-click to run
- ✅ Works offline
- ❌ Larger file size (~80-100 MB)

#### Create Self-Contained Release:
```powershell
.\publish-standalone.ps1 -Version "1.0.0"
```

This creates:
- Complete application with bundled .NET runtime
- `Timekeeper.TrayApp.exe` - System tray application (recommended)
- `START_TIMEKEEPER.bat` - Console window option
- `START_HERE.txt` - Simple instructions
- All documentation

**Share with users:**
1. Upload the ZIP to cloud storage or GitHub Releases
2. Send users the `SIMPLE_USER_GUIDE.md`
3. They just: Download → Extract → Double-click `Timekeeper.TrayApp.exe` (or `START_TIMEKEEPER.bat`)

---

### Option 2: Regular Build (For Technical Users)

**Perfect for**: Developers, IT professionals, users who already have .NET

- ✅ Smaller file size (~5-10 MB)
- ✅ Faster updates
- ❌ Requires .NET 8.0 Runtime installation
- ❌ Some command-line knowledge helpful

#### Create Regular Release:
```powershell
.\prepare-release.ps1 -Version "1.0.0"
```

---

## 🚀 Recommended Distribution Strategy

**For most users**: Use Option 1 (Self-Contained)  
**For technical teams**: Use Option 2 (Regular Build)  
**For mixed audience**: Provide both options!

---

## 📤 Step-by-Step: Sharing with Non-Technical Users

### Step 1: Create the Self-Contained Build
```powershell
.\publish-standalone.ps1 -Version "1.0.0"
```

Wait for the build to complete (~2-5 minutes).
The ZIP will be created at: `Release\Timekeeper-v1.0.0-win-x64.zip`

### Step 2: Test It
1. Go to `Release\Timekeeper-v1.0.0-win-x64\`
2. **Option A**: Double-click `Timekeeper.TrayApp.exe` - runs in system tray
3. **Option B**: Double-click `START_TIMEKEEPER.bat` - runs with console window
4. Verify everything works
5. **System Tray**: Right-click tray icon > Exit
6. **Console**: Close the console window to stop

### Step 3: Share the ZIP

**Upload to:**
- Google Drive / OneDrive / Dropbox
- Company network share
- GitHub Releases (see GitHub section below)
- Email (if under 25 MB - use WeTransfer for larger files)

### Step 4: Send Instructions to Users

Email template:

```
Subject: Timekeeper - Time Tracking Application

Hi,

I'm sharing Timekeeper v1.0.0 - a simple time tracking application.

📥 Download: [LINK TO ZIP FILE]

✅ No installation needed - just extract and run!

Quick Start (3 steps):
1. Download and extract the ZIP file
2. Double-click START_TIMEKEEPER.bat
3. Your browser will open automatically - start tracking!

📖 Full instructions: Open SIMPLE_USER_GUIDE.md in the folder

💾 Your data: Everything is saved in the "timekeeper.db" file - back it up regularly!

Questions? Reply to this email.

Best regards
```

---

## 🔄 Providing Updates

### For Non-Technical Users:

**Step 1: Create New Version**
```powershell
.\publish-standalone.ps1 -Version "1.1.0"
```

**Step 2: Send Update Email**

```
Subject: Timekeeper Update - v1.1.0 Available

Hi,

A new version of Timekeeper is available!

What's New in v1.1.0:
- [List your changes]
- [New features]
- [Bug fixes]

📥 Download: [LINK TO NEW ZIP FILE]

⚠️ IMPORTANT - Keep Your Data:
Before updating:
1. Find your current Timekeeper folder
2. Copy the file "timekeeper.db" to a safe place (Desktop or Documents)

To Update:
1. Download the new ZIP file
2. Extract to a NEW folder (or replace the old one)
3. Copy your saved "timekeeper.db" file into the new folder
4. Double-click START_TIMEKEEPER.bat

Your data will be preserved! ✅

Questions? Reply to this email.

Best regards
```

---

## 📦 GitHub Releases Setup

### Create GitHub Release

**Step 1: Build and commit**
```bash
git add version.json
git commit -m "Release v1.0.0"
git push
```

2. Create and push tag:
```bash
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

3. On GitHub:
   - Go to your repository
   - Click "Releases" → "Create a new release"
   - Select the tag you created (v1.0.0)
   - Add release title: "Timekeeper v1.0.0"
   - Add release notes (see template below)
   - Attach the ZIP file
   - Click "Publish release"

**Step 5: Share the Link**
Users can download from: `https://github.com/YourUsername/Work-Time-Tracker/releases`

---

### Option 2: Direct File Sharing

**Best for**: Small teams, controlled distribution

1. Run the release preparation:
```powershell
.\prepare-release.ps1 -Version "1.0.0"
```

2. Create a ZIP:
```powershell
Compress-Archive -Path ".\Release\Timekeeper-v1.0.0" -DestinationPath ".\Timekeeper-v1.0.0.zip"
```

3. Share via:
   - Email attachment
   - Network share
   - Cloud storage (OneDrive, Google Drive, Dropbox)
   - Internal company server

**Include this message:**
```
Hi,

I'm sharing Timekeeper v1.0.0 - a time tracking application.

Setup Instructions:
1. Install .NET 8.0 Runtime: https://dotnet.microsoft.com/download/dotnet/8.0
2. Extract the ZIP file
3. Read SETUP_GUIDE.md for detailed instructions
4. Run START.bat (Windows) or use the run-api.ps1 script

Your data is stored locally in timekeeper.db - back it up regularly!

Questions? See SETUP_GUIDE.md or contact me.
```

---

### Option 3: Docker Distribution (Advanced)

**Best for**: IT departments, server deployment

Create a `Dockerfile` (optional, for future consideration):
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY ./Timekeeper.Api/bin/Release/net8.0/ .
EXPOSE 5000
ENTRYPOINT ["dotnet", "Timekeeper.Api.dll"]
```

---

## 🔄 Providing Updates

### When You Make Changes

1. **Make your changes** and test them
2. **Update version.json** - increment version (e.g., 1.0.0 → 1.1.0)
3. **Add to changelog** in version.json
4. **Create new release** using the process above
5. **Notify users** about the update

### User Update Process

Users have two options:

**If they use Git:**
```bash
git pull
.\build.ps1
.\run-api.ps1
```

**If they downloaded ZIP:**
1. Backup their `timekeeper.db` file
2. Download new version
3. Extract and replace files
4. Copy their `timekeeper.db` back
5. Run the application

---

## 📋 Release Notes Template

```markdown
# Timekeeper v1.0.0

Released: February 5, 2026

## ✨ New Features
- Time tracking with start/stop timer
- Customer, Project, and Task management
- Resizable and reorderable table columns
- Excel import/export functionality
- Dark mode support

## 🐛 Bug Fixes
- Fixed settings modal not opening
- Fixed column resize visibility
- Improved horizontal scrolling

## 📥 Download
Download the ZIP file below and follow SETUP_GUIDE.md for installation.

## ⚙️ Requirements
- .NET 8.0 Runtime or later
- Windows, macOS, or Linux

## 📖 Documentation
- [Setup Guide](SETUP_GUIDE.md)
- [README](README.md)
```

---

## 🎯 Version Numbering

Use Semantic Versioning (MAJOR.MINOR.PATCH):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, major redesigns
- **MINOR** (1.0.0 → 1.1.0): New features, non-breaking changes
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, small improvements

Examples:
- `1.0.0` - Initial release
- `1.1.0` - Added new report feature
- `1.0.1` - Fixed minor bug
- `2.0.0` - Complete UI redesign

---

## 📧 Notifying Users

Create a notification email template:

```
Subject: Timekeeper Update Available - v1.1.0

Hello,

A new version of Timekeeper is available!

Version 1.1.0 includes:
- New feature X
- Improved Y
- Bug fix for Z

To Update:
1. Visit: https://github.com/YourUsername/Work-Time-Tracker/releases
2. Download Timekeeper-v1.1.0.zip
3. Follow the update instructions in SETUP_GUIDE.md

Your data will be preserved during the update.

Questions? Reply to this email.

Best regards
```

---

## ✅ Pre-Release Checklist

Before each release:

- [ ] All features tested and working
- [ ] No console errors in browser
- [ ] Build succeeds without warnings
- [ ] Database migrations work correctly
- [ ] README and SETUP_GUIDE are updated
- [ ] version.json is updated with new version
- [ ] Changelog entries are added
- [ ] Release package tested from ZIP
- [ ] Git tag created and pushed
- [ ] GitHub Release created with notes
- [ ] Users notified of new version

---

## 🆘 Support Strategy

**For Issues:**
1. Direct users to GitHub Issues page
2. Ask for:
   - Version number (from version.json)
   - Operating system
   - Error messages
   - Steps to reproduce

**For Questions:**
1. Point to SETUP_GUIDE.md
2. Point to README.md
3. Create FAQ.md if common questions arise

---

## 🎉 You're Ready!

You now have everything needed to distribute and update Timekeeper professionally.

Next step: Run `.\prepare-release.ps1 -Version "1.0.0"` to create your first release!
