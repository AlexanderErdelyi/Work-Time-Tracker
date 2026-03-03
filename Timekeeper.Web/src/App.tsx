import { Suspense, lazy, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/Layout/AppShell'
import { useNotifications } from './hooks/useNotifications'
import { Login } from './pages/Login'
import { Toaster } from './components/ui/Toaster'

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })))
const TimeEntries = lazy(() => import('./pages/TimeEntries').then(module => ({ default: module.TimeEntries })))
const Customers = lazy(() => import('./pages/Customers').then(module => ({ default: module.Customers })))
const Projects = lazy(() => import('./pages/Projects').then(module => ({ default: module.Projects })))
const Tasks = lazy(() => import('./pages/Tasks').then(module => ({ default: module.Tasks })))
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })))
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })))
const Documentation = lazy(() => import('./pages/Documentation').then(module => ({ default: module.Documentation })))
const Support = lazy(() => import('./pages/Support').then(module => ({ default: module.Support })))
const Users = lazy(() => import('./pages/Users').then(module => ({ default: module.Users })))
const WorkDays = lazy(() => import('./pages/WorkDays').then(module => ({ default: module.WorkDays })))
const ServiceManager = lazy(() => import('./pages/ServiceManager').then(module => ({ default: module.ServiceManager })))
const Chat = lazy(() => import('./pages/Chat').then(module => ({ default: module.Chat })))

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('timekeeper_loggedIn') === 'true')

  // Initialize notification system
  useNotifications();

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/entries" element={<TimeEntries />} />
            <Route path="/workdays" element={<WorkDays />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/service" element={<ServiceManager />} />
            <Route path="/docs" element={<Documentation />} />
            <Route path="/support" element={<Support />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </Suspense>
      </AppShell>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
