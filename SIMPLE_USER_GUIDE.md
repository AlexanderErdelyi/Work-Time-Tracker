# 🎯 SIMPLE USER GUIDE - No Technical Knowledge Required!

## What You Need
- A Windows computer (Windows 10 or 11)
- That's it! Everything else is included.

---

## ⚡ Quick Start (3 Steps)

### Step 1: Download
Download the ZIP file:
- **Timekeeper-v1.0.0-win-x64.zip** (from the link provided to you)

### Step 2: Extract
1. Find the downloaded ZIP file (usually in your Downloads folder)
2. Right-click on it
3. Choose "Extract All..."
4. Click "Extract"

### Step 3: Run
You have three options:

#### Option A: System Tray (Recommended) ⭐
1. Open the extracted folder
2. **Double-click** on **`Timekeeper.TrayApp.exe`**
3. Look for the Timekeeper icon in your system tray (bottom-right, near the clock)
4. Your browser will open automatically
5. Start using Timekeeper! 🎉

**Benefits:**
- No console window!
- Runs in the background
- Right-click the tray icon to stop/start or exit

#### Option B: Console Window
1. Open the extracted folder
2. **Double-click** on **`START_TIMEKEEPER.bat`**
3. A black window will appear (don't close it!)
4. Your browser will open automatically
5. Start using Timekeeper! 🎉

#### Option C: For Security-Restricted Systems (Company Laptops) 🔒
If Option A or B gives you "Access Denied" errors:
1. Open the extracted folder
2. **Double-click** on **`RUN_WITH_DOTNET.bat`**
   - OR **Right-click** on **`RUN_WITH_DOTNET.ps1`** and select **"Run with PowerShell"**
3. A window will appear (don't close it!)
4. Your browser will open automatically
5. Start using Timekeeper! 🎉

**Why this works:**
- Company laptops often block .exe files for security
- These launchers use the 'dotnet' command instead
- This bypasses most security restrictions

---

## 🖱️ Using the Application

Once it's open in your browser:

### Track Your Time
1. Click the **"Time Entries"** tab
2. Click **"▶ Start Timer"**
3. Select customer, project, and task
4. Click **"Start"**
5. When done, click **"Stop Timer"**

### Add Customers/Projects/Tasks
- Use the tabs at the top
- Click the **"+ New"** buttons
- Fill in the forms
- Click **"Save"**

### View Reports
- Go to the **"Time Entries"** tab
- Use the filters at the top
- Click **"Export to Excel"** for reports

### Change Settings
- Click the **⚙️ gear icon** in the top right
- Toggle dark mode
- Adjust billing settings
- Click **"Save Settings"**

---

## ⚠️ Important

### To Stop the Application:

**If using System Tray (Timekeeper.TrayApp.exe):**
- Right-click the tray icon (bottom-right, near clock)
- Click **"Exit"**

**If using Console Window (START_TIMEKEEPER.bat or RUN_WITH_DOTNET):**
- Close the black window (console) that appeared when you started
- OR press Ctrl+C in that window

### Your Data:
- Everything is saved in a file called **`timekeeper.db`**
- It's in the same folder as the application
- **Backup this file regularly!** (copy it somewhere safe)
- If you lose this file, you lose all your data!

### Internet:
- You don't need internet to use Timekeeper
- Everything runs on your computer
- Your data stays private on your machine

---

## 🆘 Troubleshooting

### "The application opened but I can't see it in my browser"
**Fix**: Manually open your browser and go to:
```
http://localhost:5000
```

### "Access Denied" or "Windows blocked this file"
**Fix 1 (Recommended)**: Use the dotnet launcher instead
1. Try **`RUN_WITH_DOTNET.bat`**
2. OR try **`RUN_WITH_DOTNET.ps1`** (right-click → Run with PowerShell)
3. These bypass most security restrictions on company laptops

**Fix 2**: Unblock the files
1. Right-click the file (e.g., `START_TIMEKEEPER.bat`)
2. Choose "Properties"
3. Check "Unblock" at the bottom
4. Click "OK"
5. Try again

**Fix 3**: Run as administrator
1. Right-click `START_TIMEKEEPER.bat`
2. Choose "Run as administrator"

### "Nothing happens when I double-click"
**Fix**: Try the PowerShell launcher:
1. Right-click **`RUN_WITH_DOTNET.ps1`**
2. Select **"Run with PowerShell"**
3. If prompted, allow execution

### "Windows says it's blocked or dangerous"
**Fix**: 
1. Right-click `START_TIMEKEEPER.bat`
2. Choose "Properties"
3. Check "Unblock" at the bottom
4. Click "OK"
5. Try again

### "The port is already in use"
**Fix**: Another program is using port 5000. Either:
- Close any other instances of Timekeeper
- OR restart your computer

---

## 🔄 Getting Updates

When a new version is released:

1. **First, backup your data:**
   - Copy the file `timekeeper.db` to a safe place (like Documents folder)

2. **Download the new version** (ZIP file)

3. **Extract it** to a new folder

4. **Copy your data back:**
   - Copy your saved `timekeeper.db` file
   - Paste it into the new version's folder
   - Choose "Replace" if asked

5. **Run the new version** with `START_TIMEKEEPER.bat`

Your data and settings are preserved! ✅

---

## ❓ Frequently Asked Questions

**Q: Do I need to install anything?**  
A: No! Everything is included. Just extract and run.

**Q: Do I need internet?**  
A: No! It works completely offline.

**Q: Where is my data stored?**  
A: In the `timekeeper.db` file in the same folder as the application.

**Q: Can I use this on multiple computers?**  
A: Yes! Just copy the entire folder (including your `timekeeper.db` file) to another computer.

**Q: Is my data safe?**  
A: Yes! Everything stays on your computer. But YOU need to back it up regularly.

**Q: Can multiple people use this?**  
A: Each person needs their own copy with their own `timekeeper.db` file.

**Q: Why is there a black window?**  
A: That's the application running. Don't close it while you're using Timekeeper!

**Q: Can I move the folder?**  
A: Yes! Just move the entire folder anywhere you want.

**Q: How do I uninstall?**  
A: Just delete the folder. That's it!

---

## 📞 Need More Help?

If something doesn't work:
1. Read `START_HERE.txt` in the application folder
2. Check `SETUP_GUIDE.md` for more details
3. Contact the person who gave you this application

---

## 🎉 That's All!

You're ready to track your time efficiently!

**Remember:**
- Double-click `START_TIMEKEEPER.bat` to start
- Close the black window to stop
- Backup `timekeeper.db` regularly
- Keep the folder together - don't delete files

Enjoy! ⏱️
