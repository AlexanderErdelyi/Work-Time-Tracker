# Package Timekeeper for Corporate Distribution
# Creates a clean package with built files, launcher script, and instructions

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.0",
    [switch]$SkipBuild = $false
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Timekeeper Corporate Package Builder                      " -ForegroundColor Cyan
Write-Host "  Creates a security-friendly package (no .exe files)       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

$packageName = "Timekeeper-Corporate-v$Version"
$packagePath = "Release\$packageName"

# Step 1: Build if not skipped
if (-not $SkipBuild) {
    Write-Host "Step 1: Building project..." -ForegroundColor Yellow
    & "$PSScriptRoot\build.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed! Stopping." -ForegroundColor Red
        exit 1
    }
    Write-Host "Build complete" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Step 1: Skipping build (using existing files)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Create package directory
Write-Host "Step 2: Creating package directory..." -ForegroundColor Yellow
if (Test-Path $packagePath) {
    Remove-Item -Path $packagePath -Recurse -Force
}
New-Item -ItemType Directory -Path $packagePath -Force | Out-Null
Write-Host "Directory created: $packagePath" -ForegroundColor Green
Write-Host ""

# Step 3: Copy API files (DLLs and runtime)
Write-Host "Step 3: Copying API files..." -ForegroundColor Yellow
$apiSource = "Timekeeper.Api\bin\Debug\net8.0"
$apiDest = "$packagePath\Timekeeper.Api"
if (Test-Path $apiSource) {
    Copy-Item -Path $apiSource -Destination $apiDest -Recurse -Force
    # Remove unnecessary files
    Remove-Item -Path "$apiDest\*.pdb" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$apiDest\*.xml" -Force -ErrorAction SilentlyContinue
    Write-Host "API files copied" -ForegroundColor Green
} else {
    Write-Host "ERROR: API build output not found at $apiSource" -ForegroundColor Red
    Write-Host "  Run without -SkipBuild flag or build manually first" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 4: Copy Web files
Write-Host "Step 4: Copying Web frontend..." -ForegroundColor Yellow
$webSource = "Timekeeper.Web"
$webDest = "$packagePath\Timekeeper.Web"
# Copy entire web project structure
Copy-Item -Path $webSource -Destination $webDest -Recurse -Force -Exclude @('node_modules','dist','*.log')
Write-Host "Web files copied" -ForegroundColor Green
Write-Host ""

# Step 5: Copy Core DLLs (if needed separately)
Write-Host "Step 5: Copying Core library..." -ForegroundColor Yellow
$coreSource = "Timekeeper.Core\bin\Debug\net8.0"
if (Test-Path $coreSource) {
    $coreDest = "$packagePath\Timekeeper.Core\bin\Debug\net8.0"
    New-Item -ItemType Directory -Path $coreDest -Force | Out-Null
    Copy-Item -Path "$coreSource\*.dll" -Destination $coreDest -Force
    Write-Host "Core library copied" -ForegroundColor Green
} else {
    Write-Host "Core library included in API (skipping separate copy)" -ForegroundColor Green
}
Write-Host ""

# Step 6: Create Smart Launcher Script
Write-Host "Step 6: Creating launcher script..." -ForegroundColor Yellow
$launcherContent = @'
# Timekeeper Smart Launcher
# Automatically finds and starts your Timekeeper installation

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          TIMEKEEPER - Smart Launcher                       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

function Find-TimekeeperProject {
    Write-Host "Searching for Timekeeper installation..." -ForegroundColor Yellow
    
    # Strategy 1: Check parent directories
    $currentDir = $PSScriptRoot
    for ($i = 0; $i -lt 5; $i++) {
        $apiPath = Join-Path $currentDir "Timekeeper.Api"
        $webPath = Join-Path $currentDir "Timekeeper.Web"
        $apiDll = Join-Path $apiPath "Timekeeper.Api.dll"
        
        if ((Test-Path $apiPath) -and (Test-Path $webPath) -and (Test-Path $apiDll)) {
            Write-Host "Found Timekeeper at: $currentDir" -ForegroundColor Green
            return $currentDir
        }
        $currentDir = Split-Path $currentDir -Parent
        if (-not $currentDir) { break }
    }
    
    # Strategy 2: Check script directory and subdirectories
    $scriptDir = $PSScriptRoot
    $apiPath = Join-Path $scriptDir "Timekeeper.Api"
    $webPath = Join-Path $scriptDir "Timekeeper.Web"
    $apiDll = Join-Path $apiPath "Timekeeper.Api.dll"
    
    if ((Test-Path $apiPath) -and (Test-Path $webPath) -and (Test-Path $apiDll)) {
        Write-Host "Found Timekeeper at: $scriptDir" -ForegroundColor Green
        return $scriptDir
    }
    
    # Strategy 3: Common installation locations
    $commonPaths = @(
        "C:\Timekeeper",
        "C:\Program Files\Timekeeper",
        "$env:USERPROFILE\Timekeeper",
        "$env:USERPROFILE\Documents\Timekeeper"
    )
    
    foreach ($path in $commonPaths) {
        $apiPath = Join-Path $path "Timekeeper.Api"
        $webPath = Join-Path $path "Timekeeper.Web"
        $apiDll = Join-Path $apiPath "Timekeeper.Api.dll"
        
        if ((Test-Path $apiPath) -and (Test-Path $webPath) -and (Test-Path $apiDll)) {
            Write-Host "Found Timekeeper at: $path" -ForegroundColor Green
            return $path
        }
    }
    
    return $null
}

$projectRoot = Find-TimekeeperProject

if (-not $projectRoot) {
    Write-Host "Could not find Timekeeper installation!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure this script is placed in or near the Timekeeper folder." -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""

# Function to find available port
function Find-AvailablePort {
    param($StartPort, $MaxAttempts = 20)
    
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        $testPort = $StartPort + $i
        $inUse = Get-NetTCPConnection -LocalPort $testPort -ErrorAction SilentlyContinue
        if (-not $inUse) {
            return $testPort
        }
    }
    return $null
}

# Check if services already running
Write-Host "Checking for running services..." -ForegroundColor Yellow
$apiRunning = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$webRunning = $null
for ($port = 5173; $port -le 5183; $port++) {
    $check = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($check) {
        $webRunning = $check
        $detectedWebPort = $port
        break
    }
}

Write-Host ""
Write-Host "Starting Timekeeper..." -ForegroundColor Cyan
Write-Host ""

# Start API
if ($apiRunning) {
    Write-Host "API already running on port 5000" -ForegroundColor Green
    $apiPort = 5000
} else {
    # Find available port for API
    $apiPort = Find-AvailablePort -StartPort 5000
    if ($null -eq $apiPort) {
        Write-Host "ERROR: Could not find available port for API (tried 5000-5020)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Opening Service Manager for help..." -ForegroundColor Yellow
        
        # Open smart-launcher.html (Service Manager)
        $htmlPath = Join-Path $projectRoot "Timekeeper.Web\public\smart-launcher.html"
        if (Test-Path $htmlPath) {
            Start-Process $htmlPath
            Write-Host "Service Manager opened in your browser" -ForegroundColor Green
            Write-Host "Use it to:" -ForegroundColor Cyan
            Write-Host "  - Scan for available ports" -ForegroundColor Gray
            Write-Host "  - Download scripts to manage services" -ForegroundColor Gray
            Write-Host "  - Check what's using your ports" -ForegroundColor Gray
        } else {
            Write-Host "Service Manager not found at: $htmlPath" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    
    Write-Host "Starting API on http://localhost:$apiPort ..." -ForegroundColor Yellow
    if ($apiPort -ne 5000) {
        Write-Host "  Note: Default port 5000 was occupied, using port $apiPort instead" -ForegroundColor Gray
    }
    
    $apiPath = Join-Path $projectRoot "Timekeeper.Api"
    $apiDll = Join-Path $apiPath "Timekeeper.Api.dll"
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiPath'; `$env:ASPNETCORE_URLS='http://localhost:$apiPort'; dotnet '$apiDll'" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

# Start Frontend
if ($webRunning) {
    Write-Host "Frontend already running on port $detectedWebPort" -ForegroundColor Green
    $webPort = $detectedWebPort
} else {
    Write-Host "Starting frontend (Vite will auto-select port 5173, 5174, etc.)..." -ForegroundColor Yellow
    $webPath = Join-Path $projectRoot "Timekeeper.Web"
    
    # Vite automatically tries 5173, 5174, 5175... if ports are occupied
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$webPath'; npm run dev" -WindowStyle Normal
    
    # Wait and detect which port Vite actually used
    Write-Host "Waiting for frontend to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    $webPort = $null
    for ($port = 5173; $port -le 5183; $port++) {
        $check = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($check) {
            $webPort = $port
            break
        }
    }
    
    if ($null -eq $webPort) {
        Write-Host "WARNING: Could not detect frontend port automatically" -ForegroundColor Yellow
        Write-Host "Frontend may still be starting. Check the PowerShell window that opened." -ForegroundColor Yellow
        $webPort = 5173  # Default assumption
    } else {
        Write-Host "Frontend started on port $webPort" -ForegroundColor Green
        if ($webPort -ne 5173) {
            Write-Host "  Note: Default port 5173 was occupied" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:$webPort"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  TIMEKEEPER IS RUNNING!                                   " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access at: http://localhost:$webPort" -ForegroundColor Cyan
Write-Host "Service Manager: http://localhost:$webPort/service" -ForegroundColor Cyan
Write-Host ""
if ($apiPort -ne 5000 -or $webPort -ne 5173) {
    Write-Host "Note: Using alternate ports because defaults were occupied:" -ForegroundColor Yellow
    Write-Host "  API: port $apiPort (default is 5000)" -ForegroundColor Gray
    Write-Host "  Frontend: port $webPort (default is 5173)" -ForegroundColor Gray
    Write-Host ""
}
Write-Host "Service Manager Features:" -ForegroundColor Cyan
Write-Host "  - Check which ports are in use" -ForegroundColor White
Write-Host "  - See what is running on each port" -ForegroundColor White
Write-Host "  - Download launcher script" -ForegroundColor White
Write-Host "  - Stop services if needed" -ForegroundColor White
Write-Host ""
Write-Host "To stop: Close the PowerShell windows that opened" -ForegroundColor Yellow
Write-Host ""
'@

Set-Content -Path "$packagePath\Start-Timekeeper.ps1" -Value $launcherContent -Encoding UTF8
Write-Host "Launcher script created" -ForegroundColor Green
Write-Host ""

# Step 7: Create README
Write-Host "Step 7: Creating README..." -ForegroundColor Yellow
$readmeContent = @'
# TIMEKEEPER - Quick Start Guide

## What's Inside
This is a **corporate-friendly** package with no .exe files!

- Works on security-restricted company laptops
- No installation required
- Uses dotnet command (bypasses .exe restrictions)
- Built-in Service Manager web interface
- Your data stays on your computer

---

---

## Requirements

1. Node.js (for frontend) - Download from: https://nodejs.org/
2. .NET 8.0 SDK - Download from: https://dotnet.microsoft.com/download/dotnet/8.0

---

## First Time Setup

### Step 1: Install Dependencies
Open PowerShell in this folder and run:

    cd Timekeeper.Web
    npm install

This only needs to be done once!

---

## Starting Timekeeper

### Method 1: Smart Launcher (Easiest)
1. Right-click on Start-Timekeeper.ps1
2. Select "Run with PowerShell"
3. Browser opens automatically - start tracking!

### Method 2: Manual Start
API (in one PowerShell window):

    cd Timekeeper.Api
    dotnet Timekeeper.Api.dll

Frontend (in another PowerShell window):

    cd Timekeeper.Web
    npm run dev

Then open: http://localhost:5173

### Method 3: Service Manager (After First Start)
1. Start using Method 1 or 2
2. Go to: http://localhost:5173/service
3. Use the web interface to control services!

---

## Features

- Track time entries
- Manage customers, projects, tasks
- Export data (JSON, CSV)
- Import existing data
- Dark mode
- Local database (timekeeper.db)

---

## Your Data

All your data is stored in: Timekeeper.Api/timekeeper.db

IMPORTANT: Back up this file regularly!

---

## Service Manager

Access at: http://localhost:5173/service

Features:
- Check if API/Frontend are running
- Download launcher script anywhere
- View port information
- Check what is using ports
- Dark mode interface

---

## Troubleshooting

### Port Already in Use?
1. Go to http://localhost:5173/service
2. Click Check Port buttons
3. See what is using your ports
4. Stop the process or choose different ports

### API Won't Start?
- Make sure port 5000 is not in use
- Check if .NET 8.0 SDK is installed: dotnet --version
- Try deleting timekeeper.db (it will recreate)

### Frontend Won't Start?
- Make sure you ran npm install first
- Check if Node.js is installed: node --version
- Try deleting node_modules and run npm install again

### Still Need Help?
Contact your IT department or the person who shared this with you.

---

## Version
'@ + "`nTimekeeper v$Version - Corporate Distribution`n`nBuilt: $(Get-Date -Format 'yyyy-MM-dd HH:mm')`n" + @'

---

## Security Note
This package uses dotnet commands instead of .exe files, making it compatible with most corporate security policies. All data stays local on your computer.

---

Happy Time Tracking!
'@

Set-Content -Path "$packagePath\README.md" -Value $readmeContent -Encoding UTF8
Write-Host "README created" -ForegroundColor Green
Write-Host ""

# Step 8: Copy database if exists (optional)
Write-Host "Step 8: Checking for database..." -ForegroundColor Yellow
$dbSource = "Timekeeper.Api\timekeeper.db"
if (Test-Path $dbSource) {
    Copy-Item -Path $dbSource -Destination "$packagePath\Timekeeper.Api\" -Force
    Write-Host "Database copied (with existing data)" -ForegroundColor Green
    Write-Host "  Note: Users will start with your demo data" -ForegroundColor Gray
} else {
    Write-Host "No database found (users will start fresh)" -ForegroundColor Green
}
Write-Host ""

# Step 9: Create ZIP
Write-Host "Step 9: Creating ZIP archive..." -ForegroundColor Yellow
$zipPath = "Release\$packageName.zip"
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

Compress-Archive -Path $packagePath -DestinationPath $zipPath -CompressionLevel Optimal
$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "ZIP created: $zipPath" -ForegroundColor Green
Write-Host "  Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Gray
Write-Host ""

# Step 10: Summary
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  PACKAGE COMPLETE!                                         " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package Location:" -ForegroundColor Cyan
Write-Host "   $zipPath" -ForegroundColor White
Write-Host ""
Write-Host "Package Contents:" -ForegroundColor Cyan
Write-Host "   - Built API (DLLs, no .exe)" -ForegroundColor White
Write-Host "   - Web Frontend (complete)" -ForegroundColor White
Write-Host "   - Smart Launcher Script" -ForegroundColor White
Write-Host "   - README with instructions" -ForegroundColor White
Write-Host ""
Write-Host "Share With Colleagues:" -ForegroundColor Cyan
Write-Host "   1. Upload ZIP to OneDrive/SharePoint/Network Share" -ForegroundColor White
Write-Host "   2. Send them the link" -ForegroundColor White
Write-Host "   3. Tell them to:" -ForegroundColor White
Write-Host "      - Extract the ZIP" -ForegroundColor Gray
Write-Host "      - Run: cd Timekeeper.Web; npm install" -ForegroundColor Gray
Write-Host "      - Double-click Start-Timekeeper.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Service Manager:" -ForegroundColor Cyan
Write-Host "   After starting, go to http://localhost:5173/service" -ForegroundColor White
Write-Host "   They can download the launcher script from there too!" -ForegroundColor White
Write-Host ""

# Ask to open folder
Write-Host "Open Release folder? (Y/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "Y" -or $response -eq "y") {
    Start-Process explorer.exe -ArgumentList "/select,`"$(Resolve-Path $zipPath)`""
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
