import { Moon, Sun, Command } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useState, useEffect } from 'react'
import { useRunningTimer } from '../../hooks/useTimeEntries'
import { calculateDuration } from '../../lib/durationUtils'

export function TopBar() {
  const [darkMode, setDarkMode] = useState(false)
  const { data: runningTimer } = useRunningTimer()
  const [elapsed, setElapsed] = useState('00:00:00')

  useEffect(() => {
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('timekeeper_darkMode')
    const isDark = savedDarkMode === 'true'
    
    // Apply the dark mode setting
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    setDarkMode(isDark)
  }, [])

  useEffect(() => {
    if (!runningTimer) {
      setElapsed('00:00:00')
      return
    }

    const updateElapsed = () => {
      const duration = calculateDuration(runningTimer.startTime)
      setElapsed(duration)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [runningTimer])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    
    // Update DOM
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Save to localStorage
    localStorage.setItem('timekeeper_darkMode', newDarkMode.toString())
    setDarkMode(newDarkMode)
  }

  return (
    <div className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Timer Status */}
      <div className="flex items-center gap-4">
        {runningTimer ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">Timer Running</span>
            </div>
            <Badge variant="outline" className="font-mono text-base">
              {elapsed}
            </Badge>
            {runningTimer.taskName && (
              <span className="text-sm text-muted-foreground">
                {runningTimer.customerName && `${runningTimer.customerName} / `}
                {runningTimer.projectName && `${runningTimer.projectName} / `}
                {runningTimer.taskName}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-sm text-muted-foreground">No timer running</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          title="Toggle theme"
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Command Palette (Ctrl+K)"
        >
          <Command className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Actions</span>
        </Button>
      </div>
    </div>
  )
}
