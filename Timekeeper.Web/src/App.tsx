import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/Layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { TimeEntries } from './pages/TimeEntries'
import { Customers } from './pages/Customers'
import { Projects } from './pages/Projects'
import { Tasks } from './pages/Tasks'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { WorkDays } from './pages/WorkDays'

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/entries" element={<TimeEntries />} />
          <Route path="/workdays" element={<WorkDays />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

export default App
