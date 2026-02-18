# Service Manager - Timekeeper

## Overview

The **Service Manager** is a powerful built-in tool in Timekeeper that helps you easily start, monitor, and manage both the API and Frontend services. It's especially useful for:

- 🏢 Corporate environments where .exe files are restricted
- 🔧 Development and testing with different port configurations
- 📊 Monitoring service status in real-time
- 🚀 Quick service startup without memorizing commands

## Features

### 1. **Dual Service Management**
- **API Service**: Configure and start the .NET Core API backend (default: port 5000)
- **Frontend Service**: Configure and start the React/Vite frontend (default: port 5173)
- Independent port selection for each service
- Real-time status monitoring

### 2. **Intelligent Port Scanner**
- Scans available ports in configurable ranges
  - API: 5000-5020
  - Frontend: 5173-5183
- Visual indicators:
  - 🟢 **Green**: Port is available
  - 🔴 **Red**: Port is in use
  - 🔵 **Blue**: Currently selected port
  - ⏳ **Pulsing**: Port scan in progress
- Custom port input for ports outside the scanned range

### 3. **Configuration Detection**
- Automatically detects current configuration:
  - API port from `launchSettings.json` (default: 5000)
  - Frontend port from `vite.config.ts` (default: 5173)
- Validates if configured ports are actually running your services
- Shows real-time connection status

### 4. **Service Status Dashboard**
- **System Status Card**: Overview of both services at a glance
- **Running Status**: Green checkmark when service is active
- **Stopped Status**: Red X when service is not detected
- **Quick Access**: Direct links to open running services in browser
- **Auto-Refresh**: Status checks every 3 seconds

### 5. **Easy Service Startup**
- **"Start" Buttons**: Semi-automated service launch
  - Copies the correct command to clipboard
  - Shows step-by-step instructions
  - Opens instructions modal
- **"Copy" Buttons**: Manual command copying
  - Separate commands for PowerShell, CMD, and Bash
  - Platform-specific command formatting
  - Visual confirmation when copied

## How to Use

### Quick Start (Recommended)

1. **Navigate to Service Manager**
   - Open Timekeeper
   - Click "Service Manager" in the sidebar (Server icon)

2. **Check Current Status**
   - Look at the "System Status" card at the top
   - Verify if services are already running
   - See which ports are configured

3. **Select Ports** (if needed)
   - View the port grids for API and Frontend
   - Click any green (available) port to select it
   - Or enter a custom port number

4. **Start Services**
   - Click **"Start API"** button
   - Follow the instructions in the alert dialog:
     1. Open PowerShell in project root
     2. Paste command (already in clipboard)
     3. Press Enter
   - Repeat for **"Start Frontend"**

5. **Monitor Status**
   - Watch the status indicators update automatically
   - When both show "Running", you're ready!
   - Click **"Open Frontend"** to access the app

### Alternative: Manual Command Copy

If automatic start doesn't work:

1. Select your desired ports
2. Click **"Copy"** button next to the shell type you prefer
3. Open a terminal manually
4. Paste and run the command
5. Keep the terminal window open

## Port Configuration

### Default Ports
- **API**: 5000 (configured in `Timekeeper.Api/Properties/launchSettings.json`)
- **Frontend**: 5173 (configured in `Timekeeper.Web/vite.config.ts`)

### Changing Ports
1. **Via Service Manager**: Just click a different port in the grid
2. **Custom Port**: Enter any port between 1000-65535
3. **Persistent Change**: Edit the configuration files mentioned above

### Port Scanning Ranges
- **API Scan Range**: 5000-5020 (21 ports)
- **Frontend Scan Range**: 5173-5183 (11 ports)

## Service Status Detection

The Service Manager intelligently detects service status by:

1. **Port Availability Check**: Tests if ports are open
2. **HTTP Health Check**: Sends test requests to verify services respond
3. **Configuration Match**: Compares running ports with configured ports
4. **Continuous Monitoring**: Updates every 3 seconds

### Status Indicators
- ✅ **Running**: Service is active and responding
- ❌ **Stopped**: Service is not detected or not responding
- Port number shows in the status card

## Commands Generated

### API Service (PowerShell)
```powershell
cd Timekeeper.Api
$env:ASPNETCORE_ENVIRONMENT="Development"
$env:ASPNETCORE_URLS="http://localhost:5000"
dotnet run
```

### Frontend Service (PowerShell)
```powershell
cd Timekeeper.Web
npm run dev
```

## Troubleshooting

### Service won't start
1. Check if port is already in use (red indicator)
2. Select a different available port (green indicator)
3. Verify you're in the project root directory
4. Ensure .NET SDK and Node.js are installed

### Status shows "Stopped" but service is running
1. Check if service is on a different port
2. Click "Rescan" to refresh port status
3. Verify firewall isn't blocking connections
4. Check if API/Frontend are on expected URLs

### Ports all show "In Use"
1. Click "Rescan" button
2. Try a custom port outside the scanned range
3. Check for other services using those ports
4. Restart your computer if ports seem stuck

### "Start" button doesn't work
1. Use the "Copy" button instead
2. Manually open PowerShell/Terminal
3. Paste the copied command
4. Run the `start-service.ps1` script directly:
   ```powershell
   .\start-service.ps1 -Service api -Port 5000
   .\start-service.ps1 -Service frontend
   ```

## Technical Details

### Technologies Used
- **React**: UI framework
- **TypeScript**: Type-safe development
- **Fetch API**: Port and service detection
- **Clipboard API**: One-click command copying
- **Lucide Icons**: Beautiful icon system

### Port Detection Algorithm
```typescript
1. Attempt HEAD request to http://localhost:{port}/api/customers
2. Set 1-second timeout for response
3. If response: Port is IN USE
4. If timeout/error: Port is AVAILABLE
5. Validate service identity with second health check
```

### Status Monitoring
- Interval: 3000ms (3 seconds)
- Method: HTTP GET request to service endpoints
- API Check: `/api/customers` endpoint
- Frontend Check: Root URL `/`
- Success Criteria: HTTP 200, 404, or any valid response

## Corporate Environment Usage

The Service Manager is specifically designed for corporate environments where:
- ❌ `.exe` files are blocked
- ❌ Installers require admin rights
- ✅ Scripts and web apps are allowed
- ✅ Development tools (Node.js, .NET) are available

**Workflow for Corporate Users:**
1. Extract Timekeeper folder to local directory
2. Open in VS Code or any editor
3. Use Service Manager to start services
4. Access via browser at `http://localhost:5173`
5. No installation or admin rights needed!

## Integration with PWA

When Timekeeper is installed as a PWA:
1. Service Manager is available in the installed app
2. All port management features work offline (UI only)
3. Service detection requires network/localhost access
4. Can be added to Start Menu / Taskbar shortcuts

## Future Enhancements

Potential future features:
- 🔄 Auto-restart on service crash
- 📝 Service logs viewer
- ⚙️ Persistent port configuration saving
- 🔌 Database connection status
- 📊 Performance metrics
- 🐳 Docker container integration

## Support

For issues or questions:
1. Check this documentation
2. Review Troubleshooting section
3. Check project GitHub Issues
4. Consult development team

---

**Service Manager** - Making Timekeeper accessible everywhere! 🚀
