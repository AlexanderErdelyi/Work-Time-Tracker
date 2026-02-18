import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Copy,
  Check,
  Zap,
  Play,
  Square,
  Monitor,
  Download
} from 'lucide-react'

interface PortStatus {
  port: number
  available: boolean
  scanning: boolean
}

interface ServiceStatus {
  running: boolean
  port: number | null
  url: string
}

export function ServiceManager() {
  // Configuration (read from app settings)
  const DEFAULT_API_PORT = 5000
  const DEFAULT_FRONTEND_PORT = 5173
  const API_PORT_RANGE = { start: 5000, end: 5020 }
  const FRONTEND_PORT_RANGE = { start: 5173, end: 5183 }
  
  // API State
  const [selectedApiPort, setSelectedApiPort] = useState<number>(DEFAULT_API_PORT)
  const [customApiPort, setCustomApiPort] = useState('')
  const [apiPorts, setApiPorts] = useState<PortStatus[]>([])
  const [apiStatus, setApiStatus] = useState<ServiceStatus>({ running: false, port: null, url: '' })
  const [scanningApi, setScanningApi] = useState(false)
  
  // Frontend State
  const [selectedFrontendPort, setSelectedFrontendPort] = useState<number>(DEFAULT_FRONTEND_PORT)
  const [customFrontendPort, setCustomFrontendPort] = useState('')
  const [frontendPorts, setFrontendPorts] = useState<PortStatus[]>([])
  const [frontendStatus, setFrontendStatus] = useState<ServiceStatus>({ running: false, port: null, url: '' })
  const [scanningFrontend, setScanningFrontend] = useState(false)
  
  // UI State
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const [startingService, setStartingService] = useState<'api' | 'frontend' | null>(null)

  const CHECK_INTERVAL = 3000

  // Initialize API ports
  useEffect(() => {
    const initialPorts: PortStatus[] = []
    for (let port = API_PORT_RANGE.start; port <= API_PORT_RANGE.end; port++) {
      initialPorts.push({ port, available: false, scanning: true })
    }
    setApiPorts(initialPorts)
    scanPorts(initialPorts, 'api')
  }, [])

  // Initialize Frontend ports
  useEffect(() => {
    const initialPorts: PortStatus[] = []
    for (let port = FRONTEND_PORT_RANGE.start; port <= FRONTEND_PORT_RANGE.end; port++) {
      initialPorts.push({ port, available: false, scanning: true })
    }
    setFrontendPorts(initialPorts)
    scanPorts(initialPorts, 'frontend')
  }, [])

  // Monitor API status
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkServiceStatus(selectedApiPort, 'api')
      setApiStatus(status)
    }

    checkStatus()
    const interval = setInterval(checkStatus, CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [selectedApiPort])

  // Monitor Frontend status
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkServiceStatus(selectedFrontendPort, 'frontend')
      setFrontendStatus(status)
    }

    checkStatus()
    const interval = setInterval(checkStatus, CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [selectedFrontendPort])

  const checkPort = async (port: number): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1000)

      await fetch(`http://localhost:${port}/api/customers`, {
        signal: controller.signal,
        method: 'HEAD',
      })

      clearTimeout(timeoutId)
      return false // Port is in use
    } catch {
      return true // Port is available
    }
  }

  const scanPorts = async (portsToScan: PortStatus[], type: 'api' | 'frontend') => {
    if (type === 'api') setScanningApi(true)
    else setScanningFrontend(true)

    for (const portStatus of portsToScan) {
      const available = await checkPort(portStatus.port)
      
      if (type === 'api') {
        setApiPorts((prev) =>
          prev.map((p) =>
            p.port === portStatus.port ? { ...p, available, scanning: false } : p
          )
        )
      } else {
        setFrontendPorts((prev) =>
          prev.map((p) =>
            p.port === portStatus.port ? { ...p, available, scanning: false } : p
          )
        )
      }
    }

    if (type === 'api') setScanningApi(false)
    else setScanningFrontend(false)
  }

  const checkServiceStatus = async (port: number, type: 'api' | 'frontend'): Promise<ServiceStatus> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)

      const testUrl = type === 'api' 
        ? `http://localhost:${port}/api/customers`
        : `http://localhost:${port}`

      const response = await fetch(testUrl, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      
      const running = response.ok || response.status === 404 || response.status === 200
      return {
        running,
        port: running ? port : null,
        url: running ? (type === 'api' ? `http://localhost:${port}` : `http://localhost:${port}`) : ''
      }
    } catch {
      return { running: false, port: null, url: '' }
    }
  }

  const handleRescanApi = () => {
    const initialPorts: PortStatus[] = []
    for (let port = API_PORT_RANGE.start; port <= API_PORT_RANGE.end; port++) {
      initialPorts.push({ port, available: false, scanning: true })
    }
    setApiPorts(initialPorts)
    scanPorts(initialPorts, 'api')
  }

  const handleRescanFrontend = () => {
    const initialPorts: PortStatus[] = []
    for (let port = FRONTEND_PORT_RANGE.start; port <= FRONTEND_PORT_RANGE.end; port++) {
      initialPorts.push({ port, available: false, scanning: true })
    }
    setFrontendPorts(initialPorts)
    scanPorts(initialPorts, 'frontend')
  }

  const handleCustomApiPort = () => {
    const port = parseInt(customApiPort)
    if (!port || port < 1000 || port > 65535) {
      alert('Please enter a valid port number between 1000 and 65535')
      return
    }
    setSelectedApiPort(port)
    setCustomApiPort('')
  }

  const handleCustomFrontendPort = () => {
    const port = parseInt(customFrontendPort)
    if (!port || port < 1000 || port > 65535) {
      alert('Please enter a valid port number between 1000 and 65535')
      return
    }
    setSelectedFrontendPort(port)
    setCustomFrontendPort('')
  }

  const copyCommand = (type: 'api' | 'frontend', shell: 'powershell' | 'cmd' | 'bash') => {
    let text = ''
    
    if (type === 'api') {
      if (shell === 'powershell') {
        text = `cd Timekeeper.Api; $env:ASPNETCORE_ENVIRONMENT="Development"; $env:ASPNETCORE_URLS="http://localhost:${selectedApiPort}"; dotnet run`
      } else if (shell === 'cmd') {
        text = `cd Timekeeper.Api && set ASPNETCORE_ENVIRONMENT=Development && set ASPNETCORE_URLS=http://localhost:${selectedApiPort} && dotnet run`
      } else {
        text = `cd Timekeeper.Api; export ASPNETCORE_ENVIRONMENT=Development; export ASPNETCORE_URLS=http://localhost:${selectedApiPort}; dotnet run`
      }
    } else {
      if (shell === 'powershell') {
        text = `cd Timekeeper.Web; $env:PORT=${selectedFrontendPort}; npm run dev`
      } else if (shell === 'cmd') {
        text = `cd Timekeeper.Web && set PORT=${selectedFrontendPort} && npm run dev`
      } else {
        text = `cd Timekeeper.Web; export PORT=${selectedFrontendPort}; npm run dev`
      }
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopiedCommand(`${type}-${shell}`)
      setTimeout(() => setCopiedCommand(null), 2000)
    })
  }

  const startService = async (type: 'api' | 'frontend') => {
    setStartingService(type)
    
    try {
      let command = ''
      let port = 0
      
      if (type === 'api') {
        port = selectedApiPort
        command = `cd Timekeeper.Api; $env:ASPNETCORE_ENVIRONMENT='Development'; $env:ASPNETCORE_URLS='http://localhost:${port}'; Write-Host 'Starting Timekeeper API on port ${port}...' -ForegroundColor Cyan; dotnet run`
      } else {
        port = selectedFrontendPort
        command = `cd Timekeeper.Web; Write-Host 'Starting Timekeeper Frontend...' -ForegroundColor Cyan; npm run dev`
      }
      
      // Check if we can use the API automation (only works if API is already running)
      const canUseApi = type === 'frontend' && apiStatus.running
      
      if (canUseApi) {
        try {
          // Try to execute via API (only for frontend start when API is running)
          const response = await fetch('/api/terminal/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command })
          })
          
          if (response.ok) {
            alert(`✅ Frontend service is starting in a new terminal window!\n\nPlease wait a few seconds for it to initialize...`)
            
            setTimeout(() => {
              checkServiceStatus(selectedFrontendPort, 'frontend').then(setFrontendStatus)
            }, 5000)
            
            return
          }
        } catch (error) {
          console.log('API automation not available, using manual method')
        }
      }
      
      // Fallback: Copy to clipboard and create a .ps1 file URL
      await navigator.clipboard.writeText(command)
      
      const serviceName = type === 'api' ? 'API' : 'Frontend'
      const instructions = 
        `🚀 To start the ${serviceName} service:\n\n` +
        `OPTION 1: Quick Start\n` +
        `  1. Open PowerShell in project root\n` +
        `  2. Paste command (already copied! Press Ctrl+V)\n` +
        `  3. Press Enter\n\n` +
        `OPTION 2: Manual\n` +
        `  ${type === 'api' 
            ? `cd Timekeeper.Api && dotnet run` 
            : `cd Timekeeper.Web && npm run dev`}\n\n` +
        `The terminal will open and stay active.`
      
      alert(instructions)
      
      // Monitor for service startup
      const checkInterval = setInterval(() => {
        if (type === 'api') {
          checkServiceStatus(selectedApiPort, 'api').then(status => {
            if (status.running) {
              setApiStatus(status)
              clearInterval(checkInterval)
            }
          })
        } else {
          checkServiceStatus(selectedFrontendPort, 'frontend').then(status => {
            if (status.running) {
              setFrontendStatus(status)
              clearInterval(checkInterval)
            }
          })
        }
      }, 3000)
      
      // Stop checking after 2 minutes
      setTimeout(() => clearInterval(checkInterval), 120000)
      
    } catch (error) {
      console.error('Failed to prepare service start:', error)
      alert(`Failed to prepare ${type} start command.`)
    } finally {
      setStartingService(null)
    }
  }

  const stopService = async (type: 'api' | 'frontend') => {
    const port = type === 'api' ? selectedApiPort : selectedFrontendPort
    const serviceName = type === 'api' ? 'API' : 'Frontend'
    
    try {
      // Try API method for BOTH API and Frontend if API is running
      const canUseApi = apiStatus.running
      
      if (canUseApi) {
        try {
          const response = await fetch('/api/terminal/stop-port', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ port })
          })
          
          if (response.ok) {
            alert(`✅ ${serviceName} service on port ${port} has been stopped!`)
            
            setFrontendStatus({ running: false, port: null, url: '' })
            
            setTimeout(() => {
              checkServiceStatus(selectedFrontendPort, 'frontend').then(setFrontendStatus)
            }, 2000)
            
            return
          }
        } catch (error) {
          console.log('API automation not available, using manual method')
        }
      }
      
      // Fallback: Copy stop command to clipboard
      const psCommand = `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }; Write-Host '${serviceName} service stopped on port ${port}' -ForegroundColor Yellow`
      
      await navigator.clipboard.writeText(psCommand)
      
      const instructions = 
        `🛑 To stop the ${serviceName} service:\n\n` +
        `1. Open PowerShell\n` +
        `2. Paste command (already copied! Press Ctrl+V)\n` +
        `3. Press Enter\n\n` +
        `Or simply close the terminal window where the service is running.`
      
      alert(instructions)
      
      // Update status after user has time to execute
      setTimeout(() => {
        if (type === 'api') {
          checkServiceStatus(selectedApiPort, 'api').then(setApiStatus)
        } else {
          checkServiceStatus(selectedFrontendPort, 'frontend').then(setFrontendStatus)
        }
      }, 5000)
      
    } catch (error) {
      console.error(`Failed to prepare ${serviceName} stop:`, error)
      alert(`Failed to prepare ${serviceName} stop command.`)
    }
  }

  const openUrl = (url: string) => {
    window.open(url, '_blank')
  }

  const checkWhatIsRunningOnPort = async (port: number) => {
    if (!apiStatus.running) {
      alert(
        `⚠️ API Must Be Running\n\n` +
        `To check what's running on a port, the API backend must be running first.\n\n` +
        `Please start the API and try again.`
      );
      return;
    }

    try {
      const response = await fetch(`http://localhost:${selectedApiPort}/api/terminal/port-info/${port}`);
      
      if (!response.ok) {
        alert(`❌ Failed to check port ${port}\n\nError: ${response.statusText}`);
        return;
      }

      const data = await response.json();
      
      if (data.inUse) {
        alert(
          `🔍 Port ${port} Information\n\n` +
          `Status: IN USE (Occupied)\n\n` +
          `Process: ${data.processName}\n` +
          `Process ID: ${data.processId}\n` +
          `${data.processPath ? `Path: ${data.processPath}` : ''}\n\n` +
          `💡 To free this port, you can:\n` +
          `• Close the application using this port\n` +
          `• Use the "Stop" button if it's a Timekeeper service\n` +
          `• Select a different port`
        );
      } else {
        alert(
          `✅ Port ${port} Information\n\n` +
          `Status: AVAILABLE (Free)\n\n` +
          `This port is not in use and can be safely used for the API or Frontend service.`
        );
      }
    } catch (error) {
      console.error('Failed to check port:', error);
      alert(
        `❌ Failed to check port ${port}\n\n` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
        `Make sure the API is running and try again.`
      );
    }
  }

  const downloadLauncherScript = async () => {
    // Check if the selected API port is already in use
    const selectedPortStatus = apiPorts.find(p => p.port === selectedApiPort);
    
    if (selectedPortStatus && !selectedPortStatus.available) {
      // Port is in use, try to get process info if API is running
      let processInfo = '';
      
      if (apiStatus.running) {
        try {
          const response = await fetch(`http://localhost:${selectedApiPort}/api/terminal/port-info/${selectedApiPort}`);
          if (response.ok) {
            const data = await response.json();
            if (data.inUse) {
              processInfo = `\n\n⚠️ CURRENTLY RUNNING:\nProcess: ${data.processName} (PID: ${data.processId})\n${data.processPath ? `Path: ${data.processPath}` : ''}`;
            }
          }
        } catch (error) {
          console.log('Could not fetch process info:', error);
        }
      }
      
      const confirmed = confirm(
        `⚠️ PORT ${selectedApiPort} IS ALREADY IN USE!\n\n` +
        `The launcher script will automatically stop any existing process on this port before starting the API.${processInfo}\n\n` +
        `Do you want to continue with the download?\n\n` +
        `Click OK to download anyway, or Cancel to select a different port.`
      );
      
      if (!confirmed) {
        return; // User cancelled, don't download
      }
    }

    const scriptContent = `# Timekeeper Launcher Script
# This script automatically finds and starts the Timekeeper API backend
# You can save this file anywhere - it will locate your project!

$apiPort = ${selectedApiPort}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Timekeeper API Launcher" -ForegroundColor Cyan
Write-Host "  Smart Project Detection" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to find the Timekeeper project root
function Find-TimekeeperProject {
    Write-Host "Searching for Timekeeper project..." -ForegroundColor Yellow
    
    # Strategy 1: Check current script location and parent directories
    $currentPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $searchPath = $currentPath
    
    for ($i = 0; $i -lt 5; $i++) {
        Write-Host "  Checking: $searchPath" -ForegroundColor DarkGray
        
        if (Test-Path (Join-Path $searchPath "Timekeeper.Api")) {
            Write-Host "  ✓ Found project at: $searchPath" -ForegroundColor Green
            return $searchPath
        }
        
        $parent = Split-Path -Parent $searchPath
        if ([string]::IsNullOrEmpty($parent) -or $parent -eq $searchPath) {
            break
        }
        $searchPath = $parent
    }
    
    # Strategy 2: Search common development locations
    Write-Host "  Searching common project locations..." -ForegroundColor Yellow
    
    $commonPaths = @(
        "$env:USERPROFILE\\source\\repos\\Work-Time-Tracker",
        "$env:USERPROFILE\\Documents\\Work-Time-Tracker",
        "$env:USERPROFILE\\Projects\\Work-Time-Tracker",
        "$env:USERPROFILE\\Desktop\\Work-Time-Tracker",
        "C:\\VSCodeProjects\\GitHub\\Work-Time-Tracker",
        "C:\\Projects\\Work-Time-Tracker",
        "C:\\Dev\\Work-Time-Tracker"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path (Join-Path $path "Timekeeper.Api")) {
            Write-Host "  ✓ Found project at: $path" -ForegroundColor Green
            return $path
        }
    }
    
    # Strategy 3: Search subdirectories of script location
    Write-Host "  Searching subdirectories..." -ForegroundColor Yellow
    $apiFolder = Get-ChildItem -Path $currentPath -Recurse -Filter "Timekeeper.Api" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($apiFolder) {
        $projectRoot = Split-Path -Parent $apiFolder.FullName
        Write-Host "  ✓ Found project at: $projectRoot" -ForegroundColor Green
        return $projectRoot
    }
    
    return $null
}

# Find the project
$projectRoot = Find-TimekeeperProject

if (-not $projectRoot) {
    Write-Host ""
    Write-Host "ERROR: Cannot locate Timekeeper project!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "  1. The Timekeeper project exists on your computer" -ForegroundColor Yellow
    Write-Host "  2. The project contains a 'Timekeeper.Api' folder" -ForegroundColor Yellow
    Write-Host "  3. Try saving this script closer to the project folder" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host ""
Write-Host "Project Location: $projectRoot" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
Set-Location $projectRoot

# Kill any existing process on the port
Write-Host "Checking for existing API on port $apiPort..." -ForegroundColor Yellow
$existingProcess = Get-NetTCPConnection -LocalPort $apiPort -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "  Stopping existing process on port $apiPort..." -ForegroundColor Yellow
    $existingProcess | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
    Start-Sleep -Seconds 2
    Write-Host "  ✓ Port cleared" -ForegroundColor Green
} else {
    Write-Host "  ✓ Port $apiPort is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting Timekeeper API on port $apiPort..." -ForegroundColor Green
Write-Host ""

# Navigate to API folder and start
cd Timekeeper.Api
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:$apiPort"

Write-Host "API will be available at: http://localhost:$apiPort" -ForegroundColor Cyan
Write-Host "Frontend can be started from: http://localhost:$apiPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the API" -ForegroundColor Yellow
Write-Host ""

# Run the API (this will keep the window open)
dotnet run
`;

    // Create a Blob and download it
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `start-timekeeper-api-${selectedApiPort}.ps1`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert(
      `📥 Smart Launcher Script Downloaded!\n\n` +
      `File: start-timekeeper-api-${selectedApiPort}.ps1\n\n` +
      `✨ SMART FEATURES:\n` +
      `• Auto-detects project location (save anywhere!)\n` +
      `• Searches parent folders and common locations\n` +
      `• Automatically clears port ${selectedApiPort} before starting\n` +
      `• Shows detailed startup progress\n\n` +
      `HOW TO USE:\n` +
      `1. Right-click the downloaded file → "Run with PowerShell"\n` +
      `2. Wait for "API is running" message (auto-finds project)\n` +
      `3. Keep the PowerShell window open\n\n` +
      `Once the API is running:\n` +
      `• Start/Stop Frontend from this UI automatically\n` +
      `• Stop API using the Stop button in this UI\n` +
      `• Or press Ctrl+C in the PowerShell window\n\n` +
      `💡 TIP: Save to Desktop or Downloads - it will find your project!`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Service Manager</h1>
          <p className="text-muted-foreground mt-1">Configure and monitor your Timekeeper services</p>
        </div>
        <Server className="w-12 h-12 text-blue-400" />
      </div>

      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* API Status */}
            <div className="flex items-center justify-between p-6 bg-blue-500/10 rounded-lg border-2 border-blue-500/50">
              <div className="flex items-center gap-3">
                <Server className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-sm font-medium text-foreground">API Service</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Configured: Port {selectedApiPort}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {apiStatus.running ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="font-bold text-green-500">Running</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-500" />
                    <span className="font-bold text-red-500">Stopped</span>
                  </>
                )}
              </div>
            </div>

            {/* Frontend Status */}
            <div className="flex items-center justify-between p-6 bg-purple-500/10 rounded-lg border-2 border-purple-500/50">
              <div className="flex items-center gap-3">
                <Monitor className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-sm font-medium text-foreground">Frontend Service</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Configured: Port {selectedFrontendPort}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {frontendStatus.running ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="font-bold text-green-500">Running</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-500" />
                    <span className="font-bold text-red-500">Stopped</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 mt-4">
            {apiStatus.running && (
              <Button onClick={() => openUrl(apiStatus.url)} variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open API
              </Button>
            )}
            {frontendStatus.running && (
              <Button onClick={() => openUrl(frontendStatus.url)} variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Frontend
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Service Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                API Service Configuration
              </CardTitle>
              <CardDescription>
                Scanning ports {API_PORT_RANGE.start}-{API_PORT_RANGE.end} for API service
              </CardDescription>
            </div>
            <Button onClick={handleRescanApi} variant="outline" size="sm" disabled={scanningApi}>
              <RefreshCw className={`w-4 h-4 mr-2 ${scanningApi ? 'animate-spin' : ''}`} />
              Rescan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Port Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-11 gap-2">
            {apiPorts.map((portStatus) => (
              <button
                key={portStatus.port}
                onClick={() => portStatus.available && setSelectedApiPort(portStatus.port)}
                disabled={!portStatus.available || portStatus.scanning}
                className={`
                  p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md
                  ${
                    portStatus.scanning
                      ? 'bg-blue-500/20 border-blue-500 animate-pulse cursor-wait text-foreground'
                      : portStatus.available
                      ? selectedApiPort === portStatus.port
                        ? 'bg-blue-600 border-blue-500 text-white scale-105 shadow-lg'
                        : 'bg-green-500/20 border-green-500 hover:bg-green-500/30 cursor-pointer text-foreground'
                      : 'bg-red-500/20 border-red-500 cursor-not-allowed opacity-50 text-foreground'
                  }
                `}
              >
                <div className="font-bold text-lg">{portStatus.port}</div>
                <div className="text-xs uppercase font-semibold mt-1">
                  {portStatus.scanning
                    ? 'Scan...'
                    : portStatus.available
                    ? 'Free'
                    : 'Used'}
                </div>
              </button>
            ))}
          </div>

          {/* Custom Port */}
          <div className="flex gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <Label htmlFor="custom-api-port">Custom API Port</Label>
              <Input
                id="custom-api-port"
                type="number"
                placeholder="e.g., 8080"
                min="1000"
                max="65535"
                value={customApiPort}
                onChange={(e) => setCustomApiPort(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomApiPort()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleCustomApiPort}>Use Port</Button>
              <Button 
                onClick={() => checkWhatIsRunningOnPort(selectedApiPort)} 
                variant="outline"
                disabled={!apiStatus.running}
                title="Check what process is using this port"
              >
                🔍 Check
              </Button>
            </div>
          </div>

          {/* API Commands */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">PowerShell (Recommended)</Label>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyCommand('api', 'powershell')}
                  variant="outline"
                  size="sm"
                >
                  {copiedCommand === 'api-powershell' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => startService('api')}
                  size="sm"
                  disabled={apiStatus.running || startingService === 'api'}
                >
                  {startingService === 'api' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : apiStatus.running ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Running
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start API
                    </>
                  )}
                </Button>
                {apiStatus.running && (
                  <Button
                    onClick={() => stopService('api')}
                    variant="destructive"
                    size="sm"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop API
                  </Button>
                )}
                <Button
                  onClick={() => checkWhatIsRunningOnPort(selectedApiPort)}
                  variant="outline"
                  size="sm"
                  disabled={!apiStatus.running}
                  title="Check what process is using this port"
                >
                  🔍 Check Port
                </Button>
              </div>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <div>cd Timekeeper.Api</div>
              <div>$env:ASPNETCORE_ENVIRONMENT="Development"</div>
              <div>$env:ASPNETCORE_URLS="http://localhost:{selectedApiPort}"</div>
              <div>dotnet run</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frontend Service Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-purple-600" />
                Frontend Service Configuration
              </CardTitle>
              <CardDescription>
                Scanning ports {FRONTEND_PORT_RANGE.start}-{FRONTEND_PORT_RANGE.end} for frontend service
              </CardDescription>
            </div>
            <Button onClick={handleRescanFrontend} variant="outline" size="sm" disabled={scanningFrontend}>
              <RefreshCw className={`w-4 h-4 mr-2 ${scanningFrontend ? 'animate-spin' : ''}`} />
              Rescan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Port Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-11 gap-2">
            {frontendPorts.map((portStatus) => (
              <button
                key={portStatus.port}
                onClick={() => portStatus.available && setSelectedFrontendPort(portStatus.port)}
                disabled={!portStatus.available || portStatus.scanning}
                className={`
                  p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md
                  ${
                    portStatus.scanning
                      ? 'bg-purple-500/20 border-purple-500 animate-pulse cursor-wait text-foreground'
                      : portStatus.available
                      ? selectedFrontendPort === portStatus.port
                        ? 'bg-purple-600 border-purple-500 text-white scale-105 shadow-lg'
                        : 'bg-green-500/20 border-green-500 hover:bg-green-500/30 cursor-pointer text-foreground'
                      : 'bg-red-500/20 border-red-500 cursor-not-allowed opacity-50 text-foreground'
                  }
                `}
              >
                <div className="font-bold text-lg">{portStatus.port}</div>
                <div className="text-xs uppercase font-semibold mt-1">
                  {portStatus.scanning
                    ? 'Scan...'
                    : portStatus.available
                    ? 'Free'
                    : 'Used'}
                </div>
              </button>
            ))}
          </div>

          {/* Custom Port */}
          <div className="flex gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <Label htmlFor="custom-frontend-port">Custom Frontend Port</Label>
              <Input
                id="custom-frontend-port"
                type="number"
                placeholder="e.g., 3000"
                min="1000"
                max="65535"
                value={customFrontendPort}
                onChange={(e) => setCustomFrontendPort(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomFrontendPort()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleCustomFrontendPort}>Use Port</Button>
              <Button 
                onClick={() => checkWhatIsRunningOnPort(selectedFrontendPort)} 
                variant="outline"
                disabled={!apiStatus.running}
                title="Check what process is using this port"
              >
                🔍 Check
              </Button>
            </div>
          </div>

          {/* Frontend Commands */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">PowerShell (Recommended)</Label>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyCommand('frontend', 'powershell')}
                  variant="outline"
                  size="sm"
                >
                  {copiedCommand === 'frontend-powershell' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => startService('frontend')}
                  size="sm"
                  disabled={frontendStatus.running || startingService === 'frontend'}
                >
                  {startingService === 'frontend' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : frontendStatus.running ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Running
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Frontend
                    </>
                  )}
                </Button>
                {frontendStatus.running && (
                  <Button
                    onClick={() => stopService('frontend')}
                    variant="destructive"
                    size="sm"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Frontend
                  </Button>
                )}
                <Button
                  onClick={() => checkWhatIsRunningOnPort(selectedFrontendPort)}
                  variant="outline"
                  size="sm"
                  disabled={!apiStatus.running}
                  title="Check what process is using this port"
                >
                  🔍 Check Port
                </Button>
              </div>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <div>cd Timekeeper.Web</div>
              <div>npm run dev</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Easy Start Option */}
            <div className="bg-green-500/10 border-2 border-green-500/50 p-5 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-foreground mb-2">🚀 Easy Start (Recommended)</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download a smart launcher script that automatically finds your project and starts the API. 
                    Save it anywhere (Desktop, Downloads, etc.) - it will locate your Timekeeper installation!
                  </p>
                  <Button 
                    onClick={downloadLauncherScript}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Smart Launcher Script
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    ✅ Auto-detects project location • ✅ One-click to start • ✅ No manual setup needed
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-semibold text-foreground mb-3">Manual Start Steps:</h4>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Select Ports</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose available ports (green) for both API and Frontend services. 
                    Default: API on {DEFAULT_API_PORT}, Frontend on {DEFAULT_FRONTEND_PORT}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Start API Backend</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Option A:</strong> Use the downloaded launcher script (right-click → Run with PowerShell)<br/>
                    <strong>Option B:</strong> Click "Start API" button and paste the command in PowerShell
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Start Frontend (Automatic!)</h4>
                  <p className="text-sm text-muted-foreground">
                    Once API is running, click "Start Frontend" - it will execute automatically in the background!
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Monitor & Control</h4>
                  <p className="text-sm text-muted-foreground">
                    Status updates every 3 seconds. Use "Stop" buttons to terminate services automatically via API.
                    Click "Open Frontend" to access the application.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded mt-4">
              <p className="text-sm text-blue-400">
                <strong>💡 Pro Tip:</strong> Backend port can be changed anytime without rebuilding! 
                Just select a different port and restart the API with the new port.
              </p>
            </div>
            
            <div className="bg-green-500/10 border-l-4 border-green-500 p-4 rounded mt-2">
              <p className="text-sm text-green-400">
                <strong>✨ Smart Automation:</strong> When the API is running, both Frontend and API can be 
                stopped automatically via buttons. Frontend can also be started automatically.
              </p>
              <p className="text-xs text-green-400/80 mt-2">
                • <strong>API Start:</strong> Use downloaded launcher or manual command<br/>
                • <strong>API Stop:</strong> Automatic (API stops itself)<br/>
                • <strong>Frontend Start:</strong> Automatic when API running<br/>
                • <strong>Frontend Stop:</strong> Automatic when API running
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
