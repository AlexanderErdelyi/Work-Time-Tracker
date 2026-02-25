import{a as l,j as e}from"./query-vendor-CSXjV6bp.js";import{C as w,b as N,c as S,e as C,f as a,d as te,P as k,I as re}from"./index-2Fh_KN-q.js";import{S as R,Z as ge,aE as F,Q as oe,z as ne,aF as se,H as T,m as ae,aG as ie,r as le,G as ce,D as de}from"./ui-vendor-sEqj1aXA.js";import"./router-vendor-BUV38oVf.js";import"./charts-vendor-DFLgEL_l.js";function Ne(){const x={start:5e3,end:5020},g={start:5173,end:5183},[n,E]=l.useState(5e3),[W,O]=l.useState(""),[D,A]=l.useState([]),[c,y]=l.useState({running:!1,port:null,url:""}),[H,L]=l.useState(!1),[i,U]=l.useState(5173),[_,J]=l.useState(""),[he,I]=l.useState([]),[P,f]=l.useState({running:!1,port:null,url:""}),[G,z]=l.useState(!1),[M,Y]=l.useState(null),[v,V]=l.useState(null),B=3e3;l.useEffect(()=>{const t=[];for(let r=x.start;r<=x.end;r++)t.push({port:r,available:!1,scanning:!0});A(t),$(t,"api")},[]),l.useEffect(()=>{const t=[];for(let r=g.start;r<=g.end;r++)t.push({port:r,available:!1,scanning:!0});I(t),$(t,"frontend")},[]),l.useEffect(()=>{const t=async()=>{const o=await u(n,"api");y(o)};t();const r=setInterval(t,B);return()=>clearInterval(r)},[n]),l.useEffect(()=>{const t=async()=>{const o=await u(i,"frontend");f(o)};t();const r=setInterval(t,B);return()=>clearInterval(r)},[i]);const pe=async t=>{try{const r=new AbortController,o=setTimeout(()=>r.abort(),1e3);return await fetch(`http://localhost:${t}/api/customers`,{signal:r.signal,method:"HEAD"}),clearTimeout(o),!1}catch{return!0}},$=async(t,r)=>{r==="api"?L(!0):z(!0);for(const o of t){const p=await pe(o.port);r==="api"?A(d=>d.map(s=>s.port===o.port?{...s,available:p,scanning:!1}:s)):I(d=>d.map(s=>s.port===o.port?{...s,available:p,scanning:!1}:s))}r==="api"?L(!1):z(!1)},u=async(t,r)=>{try{const o=new AbortController,p=setTimeout(()=>o.abort(),2e3),d=r==="api"?`http://localhost:${t}/api/customers`:`http://localhost:${t}`,s=await fetch(d,{signal:o.signal});clearTimeout(p);const m=s.ok||s.status===404||s.status===200;return{running:m,port:m?t:null,url:m?r==="api"?`http://localhost:${t}`:`http://localhost:${t}`:""}}catch{return{running:!1,port:null,url:""}}},me=()=>{const t=[];for(let r=x.start;r<=x.end;r++)t.push({port:r,available:!1,scanning:!0});A(t),$(t,"api")},ue=()=>{const t=[];for(let r=g.start;r<=g.end;r++)t.push({port:r,available:!1,scanning:!0});I(t),$(t,"frontend")},K=()=>{const t=parseInt(W);if(!t||t<1e3||t>65535){alert("Please enter a valid port number between 1000 and 65535");return}E(t),O("")},Q=()=>{const t=parseInt(_);if(!t||t<1e3||t>65535){alert("Please enter a valid port number between 1000 and 65535");return}U(t),J("")},q=(t,r)=>{let o="";t==="api"?o=`$root = $PWD; while ($root -and !(Test-Path "$root\\Timekeeper.Api")) { $root = Split-Path $root -Parent }; if (!$root) { Write-Error "Project not found"; exit 1 }; $apiPath = "$root\\Timekeeper.Api"; cd $apiPath; Remove-Item bin\\Debug\\net8.0\\Timekeeper.Api.exe -Force -ErrorAction SilentlyContinue; $env:ASPNETCORE_ENVIRONMENT="Development"; $env:ASPNETCORE_URLS="http://localhost:${n}"; $dllPath = Join-Path $apiPath "bin\\Debug\\net8.0\\Timekeeper.Api.dll"; $process = Start-Process -FilePath "dotnet" -ArgumentList "\`"$dllPath\`"" -WorkingDirectory $apiPath -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $apiPath "api-output.log") -RedirectStandardError (Join-Path $apiPath "api-error.log"); Write-Host "API started in background (PID: $($process.Id)) - http://localhost:${n}" -ForegroundColor Green; $process.Id | Out-File (Join-Path $apiPath "api.pid") -Force`:o=`$root = $PWD; while ($root -and !(Test-Path "$root\\Timekeeper.Web")) { $root = Split-Path $root -Parent }; if (!$root) { Write-Error "Project not found"; exit 1 }; $webPath = "$root\\Timekeeper.Web"; cd $webPath; $env:PORT=${i}; $process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $webPath -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $webPath "frontend-output.log") -RedirectStandardError (Join-Path $webPath "frontend-error.log"); Write-Host "Frontend started in background (PID: $($process.Id)) - http://localhost:${i}" -ForegroundColor Green; $process.Id | Out-File (Join-Path $webPath "frontend.pid") -Force`,navigator.clipboard.writeText(o).then(()=>{Y(`${t}-${r}`),setTimeout(()=>Y(null),2e3)})},Z=async t=>{V(t);try{let r="",o=0;if(t==="api"?(o=n,r=`$root = $PWD; while ($root -and !(Test-Path "$root\\Timekeeper.Api")) { $root = Split-Path $root -Parent }; if (!$root) { Write-Error "Project not found"; exit 1 }; $apiPath = "$root\\Timekeeper.Api"; cd $apiPath; Remove-Item bin\\Debug\\net8.0\\Timekeeper.Api.exe -Force -ErrorAction SilentlyContinue; $env:ASPNETCORE_ENVIRONMENT='Development'; $env:ASPNETCORE_URLS='http://localhost:${o}'; $dllPath = Join-Path $apiPath "bin\\Debug\\net8.0\\Timekeeper.Api.dll"; Write-Host 'Starting Timekeeper API on port ${o}...' -ForegroundColor Cyan; $process = Start-Process -FilePath "dotnet" -ArgumentList "\`"$dllPath\`"" -WorkingDirectory $apiPath -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $apiPath "api-output.log") -RedirectStandardError (Join-Path $apiPath "api-error.log"); Write-Host "API started in background (PID: $($process.Id))" -ForegroundColor Green; $process.Id | Out-File (Join-Path $apiPath "api.pid") -Force`):(o=i,r=`$root = $PWD; while ($root -and !(Test-Path "$root\\Timekeeper.Web")) { $root = Split-Path $root -Parent }; if (!$root) { Write-Error "Project not found"; exit 1 }; $webPath = "$root\\Timekeeper.Web"; cd $webPath; $env:PORT=${o}; Write-Host 'Starting Timekeeper Frontend on port ${o}...' -ForegroundColor Cyan; $process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $webPath -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $webPath "frontend-output.log") -RedirectStandardError (Join-Path $webPath "frontend-error.log"); Write-Host "Frontend started in background (PID: $($process.Id))" -ForegroundColor Green; $process.Id | Out-File (Join-Path $webPath "frontend.pid") -Force`),t==="frontend"&&c.running)try{if((await fetch("/api/terminal/execute",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({command:r})})).ok){alert(`✅ Frontend service is starting in a new terminal window!

Please wait a few seconds for it to initialize...`),setTimeout(()=>{u(i,"frontend").then(f)},5e3);return}}catch{console.log("API automation not available, using manual method")}await navigator.clipboard.writeText(r),alert(`🚀 To start the ${t==="api"?"API":"Frontend"} service:

OPTION 1: Quick Start
  1. Open PowerShell anywhere in the project
  2. Paste command (already copied! Press Ctrl+V)
  3. Press Enter

OPTION 2: Manual
  The script will automatically find the project root
  and navigate to the correct folder

The terminal will open and stay active.`);const m=setInterval(()=>{t==="api"?u(n,"api").then(h=>{h.running&&(y(h),clearInterval(m))}):u(i,"frontend").then(h=>{h.running&&(f(h),clearInterval(m))})},3e3);setTimeout(()=>clearInterval(m),12e4)}catch(r){console.error("Failed to prepare service start:",r),alert(`Failed to prepare ${t} start command.`)}finally{V(null)}},X=async t=>{const r=t==="api"?n:i,o=t==="api"?"API":"Frontend";try{if(c.running)try{if((await fetch("/api/terminal/stop-port",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({port:r})})).ok){alert(`✅ ${o} service on port ${r} has been stopped!`),f({running:!1,port:null,url:""}),setTimeout(()=>{u(i,"frontend").then(f)},2e3);return}}catch{console.log("API automation not available, using manual method")}const d=`Get-NetTCPConnection -LocalPort ${r} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }; Write-Host '${o} service stopped on port ${r}' -ForegroundColor Yellow`;await navigator.clipboard.writeText(d);const s=`🛑 To stop the ${o} service:

1. Open PowerShell
2. Paste command (already copied! Press Ctrl+V)
3. Press Enter

Or simply close the terminal window where the service is running.`;alert(s),setTimeout(()=>{t==="api"?u(n,"api").then(y):u(i,"frontend").then(f)},5e3)}catch(p){console.error(`Failed to prepare ${o} stop:`,p),alert(`Failed to prepare ${o} stop command.`)}},ee=t=>{window.open(t,"_blank")},b=async t=>{if(!c.running){alert(`⚠️ API Must Be Running

To check what's running on a port, the API backend must be running first.

Please start the API and try again.`);return}try{const r=await fetch(`http://localhost:${n}/api/terminal/port-info/${t}`);if(!r.ok){alert(`❌ Failed to check port ${t}

Error: ${r.statusText}`);return}const o=await r.json();o.inUse?alert(`🔍 Port ${t} Information

Status: IN USE (Occupied)

Process: ${o.processName}
Process ID: ${o.processId}
${o.processPath?`Path: ${o.processPath}`:""}

💡 To free this port, you can:
• Close the application using this port
• Use the "Stop" button if it's a Timekeeper service
• Select a different port`):alert(`✅ Port ${t} Information

Status: AVAILABLE (Free)

This port is not in use and can be safely used for the API or Frontend service.`)}catch(r){console.error("Failed to check port:",r),alert(`❌ Failed to check port ${t}

Error: ${r instanceof Error?r.message:"Unknown error"}

Make sure the API is running and try again.`)}},xe=async()=>{const t=D.find(s=>s.port===n);if(t&&!t.available){let s="";if(c.running)try{const h=await fetch(`http://localhost:${n}/api/terminal/port-info/${n}`);if(h.ok){const j=await h.json();j.inUse&&(s=`

⚠️ CURRENTLY RUNNING:
Process: ${j.processName} (PID: ${j.processId})
${j.processPath?`Path: ${j.processPath}`:""}`)}}catch(h){console.log("Could not fetch process info:",h)}if(!confirm(`⚠️ PORT ${n} IS ALREADY IN USE!

The launcher script will automatically stop any existing process on this port before starting the API.${s}

Do you want to continue with the download?

Click OK to download anyway, or Cancel to select a different port.`))return}const r=`# Timekeeper Launcher Script
# This script automatically finds and starts the Timekeeper API backend
# You can save this file anywhere - it will locate your project!

$apiPort = ${n}

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
Set-Location -Path (Join-Path $projectRoot "Timekeeper.Api")
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:$apiPort"

Write-Host "API will be available at: http://localhost:$apiPort" -ForegroundColor Cyan
Write-Host "Frontend can be started from: http://localhost:$apiPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the API" -ForegroundColor Yellow
Write-Host ""

# Remove .exe to avoid file locking issues
Remove-Item "bin\\Debug\\net8.0\\Timekeeper.Api.exe" -Force -ErrorAction SilentlyContinue

# Run the API using DLL (this will keep the window open)
dotnet bin\\Debug\\net8.0\\Timekeeper.Api.dll
`,o=new Blob([r],{type:"text/plain;charset=utf-8"}),p=URL.createObjectURL(o),d=document.createElement("a");d.href=p,d.download=`start-timekeeper-api-${n}.ps1`,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(p),alert(`📥 Smart Launcher Script Downloaded!

File: start-timekeeper-api-${n}.ps1

✨ SMART FEATURES:
• Auto-detects project location (save anywhere!)
• Searches parent folders and common locations
• Automatically clears port ${n} before starting
• Shows detailed startup progress

HOW TO USE:
1. Right-click the downloaded file → "Run with PowerShell"
2. Wait for "API is running" message (auto-finds project)
3. Keep the PowerShell window open

Once the API is running:
• Start/Stop Frontend from this UI automatically
• Stop API using the Stop button in this UI
• Or press Ctrl+C in the PowerShell window

💡 TIP: Save to Desktop or Downloads - it will find your project!`)};return e.jsxs("div",{className:"space-y-6 max-w-7xl mx-auto",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold text-foreground",children:"Service Manager"}),e.jsx("p",{className:"text-muted-foreground mt-1",children:"Configure and monitor your Timekeeper services"})]}),e.jsx(R,{className:"w-12 h-12 text-blue-400"})]}),e.jsxs(w,{children:[e.jsx(N,{children:e.jsxs(S,{className:"flex items-center gap-2",children:[e.jsx(ge,{className:"w-5 h-5"}),"System Status"]})}),e.jsxs(C,{children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{className:"flex items-center justify-between p-6 bg-blue-500/10 rounded-lg border-2 border-blue-500/50",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(R,{className:"w-8 h-8 text-blue-400"}),e.jsxs("div",{children:[e.jsx("div",{className:"text-sm font-medium text-foreground",children:"API Service"}),e.jsxs("div",{className:"text-xs text-muted-foreground mt-1",children:["Configured: Port ",n]})]})]}),e.jsx("div",{className:"flex items-center gap-2",children:c.running?e.jsxs(e.Fragment,{children:[e.jsx(F,{className:"w-6 h-6 text-green-500"}),e.jsx("span",{className:"font-bold text-green-500",children:"Running"})]}):e.jsxs(e.Fragment,{children:[e.jsx(oe,{className:"w-6 h-6 text-red-500"}),e.jsx("span",{className:"font-bold text-red-500",children:"Stopped"})]})})]}),e.jsxs("div",{className:"flex items-center justify-between p-6 bg-purple-500/10 rounded-lg border-2 border-purple-500/50",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(ne,{className:"w-8 h-8 text-purple-400"}),e.jsxs("div",{children:[e.jsx("div",{className:"text-sm font-medium text-foreground",children:"Frontend Service"}),e.jsxs("div",{className:"text-xs text-muted-foreground mt-1",children:["Configured: Port ",i]})]})]}),e.jsx("div",{className:"flex items-center gap-2",children:P.running?e.jsxs(e.Fragment,{children:[e.jsx(F,{className:"w-6 h-6 text-green-500"}),e.jsx("span",{className:"font-bold text-green-500",children:"Running"})]}):e.jsxs(e.Fragment,{children:[e.jsx(oe,{className:"w-6 h-6 text-red-500"}),e.jsx("span",{className:"font-bold text-red-500",children:"Stopped"})]})})]})]}),e.jsxs("div",{className:"flex gap-3 mt-4",children:[c.running&&e.jsxs(a,{onClick:()=>ee(c.url),variant:"outline",size:"sm",children:[e.jsx(se,{className:"w-4 h-4 mr-2"}),"Open API"]}),P.running&&e.jsxs(a,{onClick:()=>ee(P.url),variant:"outline",size:"sm",children:[e.jsx(se,{className:"w-4 h-4 mr-2"}),"Open Frontend"]})]})]})]}),e.jsxs(w,{children:[e.jsx(N,{children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsxs(S,{className:"flex items-center gap-2",children:[e.jsx(R,{className:"w-5 h-5 text-blue-600"}),"API Service Configuration"]}),e.jsxs(te,{children:["Scanning ports ",x.start,"-",x.end," for API service"]})]}),e.jsxs(a,{onClick:me,variant:"outline",size:"sm",disabled:H,children:[e.jsx(T,{className:`w-4 h-4 mr-2 ${H?"animate-spin":""}`}),"Rescan"]})]})}),e.jsxs(C,{className:"space-y-4",children:[e.jsx("div",{className:"grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-11 gap-2",children:D.map(t=>e.jsxs("button",{onClick:()=>t.available&&E(t.port),disabled:!t.available||t.scanning,className:`
                  p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md
                  ${t.scanning?"bg-blue-500/20 border-blue-500 animate-pulse cursor-wait text-foreground":t.available?n===t.port?"bg-blue-600 border-blue-500 text-white scale-105 shadow-lg":"bg-green-500/20 border-green-500 hover:bg-green-500/30 cursor-pointer text-foreground":"bg-red-500/20 border-red-500 cursor-not-allowed opacity-50 text-foreground"}
                `,children:[e.jsx("div",{className:"font-bold text-lg",children:t.port}),e.jsx("div",{className:"text-xs uppercase font-semibold mt-1",children:t.scanning?"Scan...":t.available?"Free":"Used"})]},t.port))}),e.jsxs("div",{className:"flex gap-3 p-4 bg-muted/50 rounded-lg",children:[e.jsxs("div",{className:"flex-1",children:[e.jsx(k,{htmlFor:"custom-api-port",children:"Custom API Port"}),e.jsx(re,{id:"custom-api-port",type:"number",placeholder:"e.g., 8080",min:"1000",max:"65535",value:W,onChange:t=>O(t.target.value),onKeyDown:t=>t.key==="Enter"&&K()})]}),e.jsxs("div",{className:"flex items-end gap-2",children:[e.jsx(a,{onClick:K,children:"Use Port"}),e.jsx(a,{onClick:()=>b(n),variant:"outline",disabled:!c.running,title:"Check what process is using this port",children:"Check"})]})]}),e.jsxs("div",{className:"space-y-3 pt-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(k,{className:"text-sm font-semibold",children:"PowerShell (Recommended)"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(a,{onClick:()=>q("api","powershell"),variant:"outline",size:"sm",children:M==="api-powershell"?e.jsxs(e.Fragment,{children:[e.jsx(ae,{className:"w-4 h-4 mr-2"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(ie,{className:"w-4 h-4 mr-2"}),"Copy"]})}),e.jsx(a,{onClick:()=>Z("api"),size:"sm",disabled:c.running||v==="api",children:v==="api"?e.jsxs(e.Fragment,{children:[e.jsx(T,{className:"w-4 h-4 mr-2 animate-spin"}),"Starting..."]}):c.running?e.jsxs(e.Fragment,{children:[e.jsx(F,{className:"w-4 h-4 mr-2"}),"Running"]}):e.jsxs(e.Fragment,{children:[e.jsx(le,{className:"w-4 h-4 mr-2"}),"Start API"]})}),c.running&&e.jsxs(a,{onClick:()=>X("api"),variant:"destructive",size:"sm",children:[e.jsx(ce,{className:"w-4 h-4 mr-2"}),"Stop API"]}),e.jsx(a,{onClick:()=>b(n),variant:"outline",size:"sm",disabled:!c.running,title:"Check what process is using this port",children:"Check Port"})]})]}),e.jsxs("div",{className:"bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto",children:[e.jsx("div",{className:"text-gray-400",children:"# Auto-locate project root"}),e.jsxs("div",{children:['$root = $PWD; while ($root -and !(Test-Path "$root\\Timekeeper.Api")) ',"{"," $root = Split-Path $root -Parent ","}"]}),e.jsxs("div",{children:["if (!$root) ","{",' Write-Error "Project not found"; exit 1 ',"}"]}),e.jsx("div",{children:'$apiPath = "$root\\Timekeeper.Api"'}),e.jsx("div",{children:"cd $apiPath"}),e.jsx("div",{className:"mt-2 text-gray-400",children:"# Remove .exe to avoid file locking"}),e.jsx("div",{children:"Remove-Item bin\\Debug\\net8.0\\Timekeeper.Api.exe -Force -ErrorAction SilentlyContinue"}),e.jsx("div",{className:"mt-2 text-gray-400",children:"# Set environment variables"}),e.jsx("div",{children:'$env:ASPNETCORE_ENVIRONMENT="Development"'}),e.jsxs("div",{children:['$env:ASPNETCORE_URLS="http://localhost:',n,'"']}),e.jsx("div",{className:"mt-2 text-gray-400",children:"# Start process in background with log redirection"}),e.jsx("div",{children:'$dllPath = Join-Path $apiPath "bin\\Debug\\net8.0\\Timekeeper.Api.dll"'}),e.jsx("div",{children:'$process = Start-Process -FilePath "dotnet" -ArgumentList "`"$dllPath`"" \\'}),e.jsx("div",{className:"pl-4",children:"-WorkingDirectory $apiPath -PassThru -WindowStyle Hidden \\"}),e.jsx("div",{className:"pl-4",children:'-RedirectStandardOutput (Join-Path $apiPath "api-output.log") \\'}),e.jsx("div",{className:"pl-4",children:'-RedirectStandardError (Join-Path $apiPath "api-error.log")'}),e.jsx("div",{className:"mt-2 text-gray-400",children:"# Save PID for later management"}),e.jsxs("div",{children:['Write-Host "API started in background (PID: $($process.Id)) - http://localhost:',n,'"']}),e.jsx("div",{children:'$process.Id | Out-File (Join-Path $apiPath "api.pid") -Force'})]})]})]})]}),e.jsxs(w,{children:[e.jsx(N,{children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsxs(S,{className:"flex items-center gap-2",children:[e.jsx(ne,{className:"w-5 h-5 text-purple-600"}),"Frontend Service Configuration"]}),e.jsxs(te,{children:["Scanning ports ",g.start,"-",g.end," for frontend service"]})]}),e.jsxs(a,{onClick:ue,variant:"outline",size:"sm",disabled:G,children:[e.jsx(T,{className:`w-4 h-4 mr-2 ${G?"animate-spin":""}`}),"Rescan"]})]})}),e.jsxs(C,{className:"space-y-4",children:[e.jsx("div",{className:"grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-11 gap-2",children:he.map(t=>e.jsxs("button",{onClick:()=>t.available&&U(t.port),disabled:!t.available||t.scanning,className:`
                  p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md
                  ${t.scanning?"bg-purple-500/20 border-purple-500 animate-pulse cursor-wait text-foreground":t.available?i===t.port?"bg-purple-600 border-purple-500 text-white scale-105 shadow-lg":"bg-green-500/20 border-green-500 hover:bg-green-500/30 cursor-pointer text-foreground":"bg-red-500/20 border-red-500 cursor-not-allowed opacity-50 text-foreground"}
                `,children:[e.jsx("div",{className:"font-bold text-lg",children:t.port}),e.jsx("div",{className:"text-xs uppercase font-semibold mt-1",children:t.scanning?"Scan...":t.available?"Free":"Used"})]},t.port))}),e.jsxs("div",{className:"flex gap-3 p-4 bg-muted/50 rounded-lg",children:[e.jsxs("div",{className:"flex-1",children:[e.jsx(k,{htmlFor:"custom-frontend-port",children:"Custom Frontend Port"}),e.jsx(re,{id:"custom-frontend-port",type:"number",placeholder:"e.g., 3000",min:"1000",max:"65535",value:_,onChange:t=>J(t.target.value),onKeyDown:t=>t.key==="Enter"&&Q()})]}),e.jsxs("div",{className:"flex items-end gap-2",children:[e.jsx(a,{onClick:Q,children:"Use Port"}),e.jsx(a,{onClick:()=>b(i),variant:"outline",disabled:!c.running,title:"Check what process is using this port",children:"Check"})]})]}),e.jsxs("div",{className:"space-y-3 pt-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(k,{className:"text-sm font-semibold",children:"PowerShell (Recommended)"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(a,{onClick:()=>q("frontend","powershell"),variant:"outline",size:"sm",children:M==="frontend-powershell"?e.jsxs(e.Fragment,{children:[e.jsx(ae,{className:"w-4 h-4 mr-2"}),"Copied!"]}):e.jsxs(e.Fragment,{children:[e.jsx(ie,{className:"w-4 h-4 mr-2"}),"Copy"]})}),e.jsx(a,{onClick:()=>Z("frontend"),size:"sm",disabled:P.running||v==="frontend",children:v==="frontend"?e.jsxs(e.Fragment,{children:[e.jsx(T,{className:"w-4 h-4 mr-2 animate-spin"}),"Starting..."]}):P.running?e.jsxs(e.Fragment,{children:[e.jsx(F,{className:"w-4 h-4 mr-2"}),"Running"]}):e.jsxs(e.Fragment,{children:[e.jsx(le,{className:"w-4 h-4 mr-2"}),"Start Frontend"]})}),P.running&&e.jsxs(a,{onClick:()=>X("frontend"),variant:"destructive",size:"sm",children:[e.jsx(ce,{className:"w-4 h-4 mr-2"}),"Stop Frontend"]}),e.jsx(a,{onClick:()=>b(i),variant:"outline",size:"sm",disabled:!c.running,title:"Check what process is using this port",children:"Check Port"})]})]}),e.jsxs("div",{className:"bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto",children:[e.jsx("div",{className:"text-gray-400",children:"# Auto-locate project root"}),e.jsxs("div",{children:['$root = $PWD; while ($root -and !(Test-Path "$root\\Timekeeper.Web")) ',"{"," $root = Split-Path $root -Parent ","}"]}),e.jsxs("div",{children:["if (!$root) ","{",' Write-Error "Project not found"; exit 1 ',"}"]}),e.jsx("div",{children:'$webPath = "$root\\Timekeeper.Web"'}),e.jsx("div",{children:"cd $webPath"}),e.jsx("div",{className:"mt-2 text-gray-400",children:"# Set PORT environment variable"}),e.jsxs("div",{children:["$env:PORT=",i]}),e.jsx("div",{className:"mt-2 text-gray-400",children:"# Start npm in background with log redirection"}),e.jsx("div",{children:'$process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" \\'}),e.jsx("div",{className:"pl-4",children:"-WorkingDirectory $webPath -PassThru -WindowStyle Hidden \\"}),e.jsx("div",{className:"pl-4",children:'-RedirectStandardOutput (Join-Path $webPath "frontend-output.log") \\'}),e.jsx("div",{className:"pl-4",children:'-RedirectStandardError (Join-Path $webPath "frontend-error.log")'}),e.jsx("div",{className:"mt-2 text-gray-400",children:"# Save PID for later management"}),e.jsxs("div",{children:['Write-Host "Frontend started in background (PID: $($process.Id)) - http://localhost:',i,'"']}),e.jsx("div",{children:'$process.Id | Out-File (Join-Path $webPath "frontend.pid") -Force'})]})]})]})]}),e.jsxs(w,{children:[e.jsx(N,{children:e.jsx(S,{children:"Quick Start Guide"})}),e.jsx(C,{children:e.jsxs("div",{className:"space-y-4",children:[e.jsx("div",{className:"bg-green-500/10 border-2 border-green-500/50 p-5 rounded-lg",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:"flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center",children:e.jsx(de,{className:"w-5 h-5"})}),e.jsxs("div",{className:"flex-1",children:[e.jsx("h3",{className:"font-bold text-lg text-foreground mb-2",children:"Easy Start (Recommended)"}),e.jsx("p",{className:"text-sm text-muted-foreground mb-3",children:"Download a smart launcher script that automatically finds your project and starts the API. Save it anywhere (Desktop, Downloads, etc.) - it will locate your Timekeeper installation!"}),e.jsxs(a,{onClick:xe,className:"bg-green-600 hover:bg-green-700",size:"lg",children:[e.jsx(de,{className:"w-4 h-4 mr-2"}),"Download Smart Launcher Script"]}),e.jsx("p",{className:"text-xs text-muted-foreground mt-2",children:"Auto-detects project location • One-click to start • No manual setup needed"})]})]})}),e.jsxs("div",{className:"border-t border-border pt-4",children:[e.jsx("h4",{className:"font-semibold text-foreground mb-3",children:"Manual Start Steps:"}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("div",{className:"flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold",children:"1"}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-foreground",children:"Select Ports"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Choose available ports (green) for both API and Frontend services. Default: API on ",5e3,", Frontend on ",5173]})]})]}),e.jsxs("div",{className:"flex gap-3 mt-4",children:[e.jsx("div",{className:"flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold",children:"2"}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-foreground",children:"Start API Backend"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:[e.jsx("strong",{children:"Option A:"})," Use the downloaded launcher script (right-click → Run with PowerShell)",e.jsx("br",{}),e.jsx("strong",{children:"Option B:"}),' Click "Start API" button and paste the command in PowerShell']})]})]}),e.jsxs("div",{className:"flex gap-3 mt-4",children:[e.jsx("div",{className:"flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold",children:"3"}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-foreground",children:"Start Frontend (Automatic!)"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:'Once API is running, click "Start Frontend" - it will execute automatically in the background!'})]})]}),e.jsxs("div",{className:"flex gap-3 mt-4",children:[e.jsx("div",{className:"flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold",children:"4"}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-semibold text-foreground",children:"Monitor & Control"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:'Status updates every 3 seconds. Use "Stop" buttons to terminate services automatically via API. Click "Open Frontend" to access the application.'})]})]})]}),e.jsx("div",{className:"bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded mt-4",children:e.jsxs("p",{className:"text-sm text-blue-400",children:[e.jsx("strong",{children:"💡 Pro Tip:"})," Backend port can be changed anytime without rebuilding! Just select a different port and restart the API with the new port."]})}),e.jsxs("div",{className:"bg-green-500/10 border-l-4 border-green-500 p-4 rounded mt-2",children:[e.jsxs("p",{className:"text-sm text-green-400",children:[e.jsx("strong",{children:"✨ Smart Automation:"})," When the API is running, both Frontend and API can be stopped automatically via buttons. Frontend can also be started automatically."]}),e.jsxs("p",{className:"text-xs text-green-400/80 mt-2",children:["• ",e.jsx("strong",{children:"API Start:"})," Use downloaded launcher or manual command",e.jsx("br",{}),"• ",e.jsx("strong",{children:"API Stop:"})," Automatic (API stops itself)",e.jsx("br",{}),"• ",e.jsx("strong",{children:"Frontend Start:"})," Automatic when API running",e.jsx("br",{}),"• ",e.jsx("strong",{children:"Frontend Stop:"})," Automatic when API running"]})]})]})})]})]})}export{Ne as ServiceManager};
