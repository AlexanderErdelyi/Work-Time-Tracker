# 🎯 Quick Distribution Reference

## For Non-Technical Users (Recommended)

### Create Build:
```powershell
.\publish-standalone.ps1 -Version "1.0.0"
```

### What They Get:
- **File**: `Timekeeper-v1.0.0-win-x64.zip` (~80-100 MB)
- **To Run**: Double-click `START_TIMEKEEPER.bat`
- **No Installation**: Everything included!

### User Instructions:
Send them: `SIMPLE_USER_GUIDE.md`

---

## For Technical Users

### Create Build:
```powershell
.\prepare-release.ps1 -Version "1.0.0"
```

### What They Get:
- **File**: `Timekeeper-v1.0.0.zip` (~5-10 MB)
- **Requires**: .NET 8.0 Runtime
- **To Run**: `dotnet Timekeeper.Api.dll` or `.\run-api.ps1`

### User Instructions:
Send them: `SETUP_GUIDE.md`

---

## Quick Commands

| Task | Command |
|------|---------|
| **Build for non-tech users** | `.\publish-standalone.ps1 -Version "1.0.0"` |
| **Build for tech users** | `.\prepare-release.ps1 -Version "1.0.0"` |
| **Build current code** | `.\build.ps1` |
| **Run locally** | `.\run-api.ps1` |
| **Create migration** | `.\add-migration.ps1 -Name "MigrationName"` |

---

## File Sizes

| Build Type | Size | .NET Required | User Effort |
|------------|------|---------------|-------------|
| Self-Contained | ~80-100 MB | ❌ No | ⭐ Just extract and run |
| Regular Build | ~5-10 MB | ✅ Yes | Install .NET first |

---

## Recommendation Matrix

| User Type | Build Type | Why |
|-----------|------------|-----|
| Secretary, Manager, Non-tech | Self-Contained | No setup needed |
| Developer, IT Staff | Regular | Smaller, faster updates |
| Mixed Team | Both | Provide options |
| Company-wide | Self-Contained | Easier support |

---

## Update Process

### Non-Technical Users:
1. Backup `timekeeper.db`
2. Extract new ZIP
3. Copy `timekeeper.db` back
4. Run `START_TIMEKEEPER.bat`

### Technical Users:
```bash
git pull
.\build.ps1
.\run-api.ps1
```

---

## Support Files

| File | Purpose | Send To |
|------|---------|---------|
| `SIMPLE_USER_GUIDE.md` | Non-tech users | Everyone |
| `SETUP_GUIDE.md` | Tech users | Developers, IT |
| `DISTRIBUTION_GUIDE.md` | Admins | You |
| `START_HERE.txt` | Quick start | In ZIP file |

---

## One-Liner for Users

**"Extract the ZIP, double-click START_TIMEKEEPER.bat, done!"**

---

## Your Typical Workflow

1. Make changes to code
2. Test locally: `.\run-api.ps1`
3. Build release: `.\publish-standalone.ps1 -Version "X.Y.Z"`
4. Test the ZIP from `Release\` folder
5. Upload ZIP to cloud/GitHub
6. Email users with download link
7. Done! 🎉

---

## Version Numbering

- **1.0.0 → 1.0.1**: Bug fix
- **1.0.0 → 1.1.0**: New feature
- **1.0.0 → 2.0.0**: Major redesign

---

## Email Template (Copy-Paste Ready)

```
Subject: Timekeeper v1.0.0 - Time Tracking App

Hi,

Download: [YOUR LINK HERE]

Extract ZIP → Double-click START_TIMEKEEPER.bat → Done!

No installation needed. Your data stays on your computer.

See SIMPLE_USER_GUIDE.md in the folder for help.

Questions? Reply here.
```

---

## Checklist Before Release

- [ ] Code tested locally
- [ ] Version number updated
- [ ] Build created successfully
- [ ] ZIP tested (extract and run)
- [ ] Browser opens correctly
- [ ] All features work
- [ ] Documentation included
- [ ] Upload location ready
- [ ] Email template prepared

---

## Remember

✅ Backup `timekeeper.db` = all their data  
✅ Larger ZIP = easier for users  
✅ Users need NO technical knowledge  
✅ Works offline  
✅ Windows Defender might show warning (normal for new .exe files)  

---

**You're all set! 🎉**
