import { Moon, Sun } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useState, useEffect } from 'react'
import { useRunningTimer } from '../../hooks/useTimeEntries'
import { QuickActionsDropdown } from '../QuickActionsDropdown'

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
      // Calculate elapsed time for paused and running timers
      let totalSeconds = 0
      
      if (runningTimer.isPaused && runningTimer.pausedAt) {
        // When paused: Calculate from start to pause time
        const start = new Date(runningTimer.startTime + (runningTimer.startTime.endsWith('Z') ? '' : 'Z'))
        const pause = new Date(runningTimer.pausedAt + (runningTimer.pausedAt.endsWith('Z') ? '' : 'Z'))
        totalSeconds = Math.floor((pause.getTime() - start.getTime()) / 1000)
      } else {
        // When running: Calculate from start to now
        const start = new Date(runningTimer.startTime + (runningTimer.startTime.endsWith('Z') ? '' : 'Z'))
        const now = new Date()
        totalSeconds = Math.floor((now.getTime() - start.getTime()) / 1000)
      }
      
      // Subtract total paused time
      totalSeconds -= (runningTimer.totalPausedSeconds || 0)
      totalSeconds = Math.max(0, totalSeconds)
      
      // Format as HH:MM:SS
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      
      setElapsed(formatted)
    }

    updateElapsed()
    
    // Only set interval if not paused
    if (!runningTimer.isPaused) {
      const interval = setInterval(updateElapsed, 1000)
      return () => clearInterval(interval)
    }
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
        
        <QuickActionsDropdown />
      </div>
    </div>
  )
}