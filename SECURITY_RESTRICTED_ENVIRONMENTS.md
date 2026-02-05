# Running Timekeeper on Security-Restricted Systems

## Problem
On company laptops with strict security policies, you may encounter "Access Denied" errors when trying to run executable files (.exe) or batch files (.bat). This is a common security restriction in corporate environments.

## Solution
We've added alternative launcher scripts that use the `dotnet` command to run the application's DLL file directly, which bypasses most security restrictions.

## How to Use

### Option 1: Batch File Launcher
1. Extract the Timekeeper release ZIP file
2. Navigate to the extracted folder
3. **Double-click** `RUN_WITH_DOTNET.bat`
4. Your browser will open automatically

### Option 2: PowerShell Launcher (Recommended)
1. Extract the Timekeeper release ZIP file
2. Navigate to the extracted folder
3. **Right-click** `RUN_WITH_DOTNET.ps1`
4. Select **"Run with PowerShell"**
5. If prompted, allow execution
6. Your browser will open automatically

## Why This Works
- Traditional executables (.exe files) are often blocked by corporate security policies
- Batch files (.bat) may also be restricted or require elevated permissions
- The `dotnet` command is typically whitelisted because it's a legitimate development tool
- Running the DLL directly with `dotnet` achieves the same result while bypassing restrictions

## Technical Details
The launchers use this command:
```batch
dotnet Timekeeper.Api.dll
```

This is equivalent to running the `.exe` file but uses the .NET runtime explicitly.

## Requirements
- The self-contained release already includes the .NET runtime
- No additional installation required
- Works on Windows 10/11

## Still Having Issues?
If you still encounter problems:
1. Try running PowerShell as Administrator
2. Check with your IT department about running .NET applications
3. Ask them to whitelist the `dotnet` command if it's not already

## For Developers
The launcher scripts are included in all releases starting from v1.0.1. They are generated automatically by:
- `publish-standalone.ps1` - Creates the self-contained release package
- `.github/workflows/release.yml` - GitHub Actions workflow for releases

The scripts run: `dotnet Timekeeper.Api.dll` instead of `Timekeeper.Api.exe`
