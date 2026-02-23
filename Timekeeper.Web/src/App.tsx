import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/Layout/AppShell'
import { useNotifications } from './hooks/useNotifications'

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })))
const TimeEntries = lazy(() => import('./pages/TimeEntries').then(module => ({ default: module.TimeEntries })))
const Customers = lazy(() => import('./pages/Customers').then(module => ({ default: module.Customers })))
const Projects = lazy(() => import('./pages/Projects').then(module => ({ default: module.Projects })))
const Tasks = lazy(() => import('./pages/Tasks').then(module => ({ default: module.Tasks })))
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })))
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })))
const WorkDays = lazy(() => import('./pages/WorkDays').then(module => ({ default: module.WorkDays })))
const ServiceManager = lazy(() => import('./pages/ServiceManager').then(module => ({ default: module.ServiceManager })))

function App() {
  // Initialize notification system
  useNotifications();

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
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  )
}

export default App
