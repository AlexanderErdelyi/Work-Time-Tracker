# 📋 Timekeeper Setup Guide for End Users

This guide will help you get Timekeeper running on your machine in just a few minutes.

> **💡 Looking for the easiest way?** If you received a standalone ZIP package (like `Timekeeper-v1.0.0-win-x64.zip`), see [SIMPLE_USER_GUIDE.md](SIMPLE_USER_GUIDE.md) instead. This guide is for running from source code.

## 📥 Initial Setup

### Step 1: Install .NET 8.0 Runtime (One-Time Setup)

1. Go to https://dotnet.microsoft.com/download/dotnet/8.0
2. Download the **".NET Runtime 8.0"** (not SDK) for your operating system
3. Run the installer
4. Restart your computer if prompted

### Step 2: Get the Application

#### Option A: Download ZIP (Easier for non-technical users)
1. Go to the GitHub repository
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file to a folder (e.g., `C:\Apps\Timekeeper`)

#### Option B: Clone with Git (Better for updates)
1. Install Git from https://git-scm.com/download/win
2. Open Command Prompt or PowerShell
3. Run:
```bash
git clone https://github.com/AlexanderErdelyi/Work-Time-Tracker.git
cd Work-Time-Tracker
```

## 🚀 Running the Application

### Windows Users (Easiest Method)

1. Open the `Work-Time-Tracker` folder
2. **Right-click** on `run-api.ps1`
3. Select **"Run with PowerShell"**
4. If you see a security warning, type `Y` and press Enter
5. Wait for "Now listening on: http://localhost:5000" message
6. Open your browser to: **http://localhost:5000**

### Alternative Method (All Platforms)

1. Open Command Prompt/PowerShell/Terminal
2. Navigate to the `Work-Time-Tracker` folder:
```bash
cd C:\path\to\Work-Time-Tracker
```
3. Run:
```bash
dotnet run --project Timekeeper.Api/Timekeeper.Api.csproj
```
4. Open your browser to: **http://localhost:5000**

## 🔄 Getting Updates

When you receive notification of a new version:

### If You Used Git Clone:
1. Open Command Prompt/PowerShell in the project folder
2. Run:
```bash
git pull
.\build.ps1
```
3. Restart the application with `.\run-api.ps1`

### If You Downloaded ZIP:
1. **Backup your database**: Copy `Timekeeper.Api/timekeeper.db` to a safe location
2. Download the new ZIP file
3. Extract to the same location (overwrite files)
4. **Restore your database**: Copy your backed-up `timekeeper.db` back to `Timekeeper.Api/`
5. Run the application as usual

## 📊 Your Data

All your data is stored in `Timekeeper.Api/timekeeper.db`

**Important**: 
- This file contains all your customers, projects, tasks, and time entries
- Back it up regularly to avoid data loss
- When updating, DO NOT delete this file

## ❓ Troubleshooting

### "Access Denied" Error
**Solution**: The application uses the DLL instead of EXE. The `run-api.ps1` script handles this automatically.

### Port 5000 Already in Use
**Solution**: 
1. Stop any other application using port 5000, or
2. Edit `Timekeeper.Api/Properties/launchSettings.json` to use a different port

### PowerShell Script Won't Run
**Solution**: Run this command in PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Browser Shows "This site can't be reached"
**Solution**: 
1. Make sure the application is running (check the console window)
2. Verify the URL is exactly `http://localhost:5000`
3. Try `http://127.0.0.1:5000` instead

## 🆘 Getting Help

If you encounter issues:
1. Check the console window for error messages
2. Create an issue on GitHub with:
   - Description of the problem
   - Error messages from the console
   - Your operating system and .NET version

## ✅ Features

Once running, you can:
- ⏱️ Start/Stop timers for tasks
- 📝 Manually enter time entries
- 📊 View daily and weekly reports
- 📁 Export data to Excel or CSV
- 🎨 Toggle dark mode
- 📋 Manage customers, projects, and tasks
- 📥 Import tasks from Excel
- 🔧 Customize billing increments and rounding

Enjoy tracking your time! 🎉
