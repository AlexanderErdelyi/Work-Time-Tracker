import { Coffee, LogOut, Moon, Sun } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useState, useEffect } from 'react'
import { useRunningTimer } from '../../hooks/useTimeEntries'
import { useWorkDayStatus, useCheckIn, useCheckOut } from '../../hooks/useWorkDays'
import { useBreakStatus, useStartBreak, useEndBreak } from '../../hooks/useBreaks'
import { QuickActionsDropdown } from '../QuickActionsDropdown'
import { parseApiDateTime } from '../../lib/timeUtils'

export function TopBar() {
  const [darkMode, setDarkMode] = useState(false)
  const { data: runningTimer } = useRunningTimer()
  const { data: workDayStatus } = useWorkDayStatus()
  const { data: breakStatus } = useBreakStatus()
  const checkIn = useCheckIn()
  const checkOut = useCheckOut()
  const startBreak = useStartBreak()
  const endBreak = useEndBreak()
  const [elapsed, setElapsed] = useState('00:00:00')
  const [breakNow, setBreakNow] = useState(Date.now())

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

    const baselineClientNowMs = Date.now()
    const baselineServerNowMs = runningTimer.serverNowUtc
      ? parseApiDateTime(runningTimer.serverNowUtc).getTime()
      : null

    const updateElapsed = () => {
      // Calculate elapsed time for paused and running timers
      let totalSeconds = 0
      
      if (runningTimer.isPaused && runningTimer.pausedAt) {
        // When paused: Calculate from start to pause time
        const start = parseApiDateTime(runningTimer.startTime)
        const pause = parseApiDateTime(runningTimer.pausedAt)
        totalSeconds = Math.floor((pause.getTime() - start.getTime()) / 1000)
      } else {
        // When running: Calculate from start to now
        const start = parseApiDateTime(runningTimer.startTime)
        const nowMs = baselineServerNowMs !== null
          ? baselineServerNowMs + (Date.now() - baselineClientNowMs)
          : Date.now()
        totalSeconds = Math.floor((nowMs - start.getTime()) / 1000)
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

  useEffect(() => {
    if (!breakStatus?.isOnBreak || !breakStatus.breakStartTime) {
      return
    }

    const interval = setInterval(() => {
      setBreakNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [breakStatus?.isOnBreak, breakStatus?.breakStartTime])

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

  const signOut = () => {
    localStorage.removeItem('timekeeper_loggedIn')
    window.location.reload()
  }

  const handleCheckInOut = () => {
    if (workDayStatus?.isCheckedIn) {
      checkOut.mutate(undefined)
      return
    }
    checkIn.mutate(undefined)
  }

  const handleBreakToggle = () => {
    if (breakStatus?.isOnBreak) {
      endBreak.mutate(undefined)
      return
    }
    startBreak.mutate(undefined)
  }

  const formatMinutesAsHoursMinutes = (minutes: number) => {
    const safeMinutes = Math.max(0, Math.round(minutes))
    const hours = Math.floor(safeMinutes / 60)
    const remainingMinutes = safeMinutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const formatCheckInTime = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const formatSecondsAsClock = (totalSeconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds))
    const hours = Math.floor(safeSeconds / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    const seconds = safeSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const activeBreakSeconds = (() => {
    if (!breakStatus?.isOnBreak || !breakStatus.breakStartTime) return 0
    const start = new Date(breakStatus.breakStartTime)
    const now = new Date(breakNow)
    return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
  })()

  const activeBreakMinutes = Math.floor(activeBreakSeconds / 60)

  const totalBreakMinutesToday = (breakStatus?.totalBreakMinutesToday ?? 0) + activeBreakMinutes

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
        <div className="hidden lg:flex items-center gap-3 border-r pr-4 mr-2">
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                workDayStatus?.isCheckedIn ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span
              className={`text-sm font-medium ${
                workDayStatus?.isCheckedIn ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {workDayStatus?.isCheckedIn ? 'Checked in' : 'Check-in needed'}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatCheckInTime(workDayStatus?.workDay?.checkInTime || workDayStatus?.checkInTime)}
          </span>
          <Button
            variant={workDayStatus?.isCheckedIn ? 'outline' : 'default'}
            onClick={handleCheckInOut}
            disabled={checkIn.isPending || checkOut.isPending}
            size="sm"
            className={workDayStatus?.isCheckedIn
              ? 'border-green-500/40 text-green-700 dark:text-green-300'
              : 'animate-pulse ring-2 ring-amber-500/40 ring-offset-2 ring-offset-background'}
          >
            {workDayStatus?.isCheckedIn ? 'Check Out' : 'Check In'}
          </Button>
        </div>

        <div className="hidden lg:flex items-center gap-3 border-r pr-4 mr-2">
          {breakStatus?.isOnBreak ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1">
              <Coffee className="h-4 w-4 text-amber-400" />
              <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-sm font-medium text-amber-200">Break Running</span>
              <Badge variant="outline" className="font-mono text-base border-amber-500/50 text-amber-100">
                {formatSecondsAsClock(activeBreakSeconds)}
              </Badge>
              <span className="text-xs text-amber-200/90">
                Total: {formatMinutesAsHoursMinutes(totalBreakMinutesToday)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              Break: {formatMinutesAsHoursMinutes(totalBreakMinutesToday)}
            </span>
          )}
          <Button
            variant={breakStatus?.isOnBreak ? 'destructive' : 'outline'}
            onClick={handleBreakToggle}
            disabled={startBreak.isPending || endBreak.isPending}
            size="sm"
            className="gap-1"
          >
            <Coffee className="h-4 w-4" />
            {breakStatus?.isOnBreak ? 'End Break' : 'Start Break'}
          </Button>
        </div>

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
          variant="ghost"
          size="icon"
          onClick={signOut}
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
        
        <QuickActionsDropdown />
      </div>
    </div>
  )
}