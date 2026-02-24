import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Badge } from '../components/ui/Badge'
import { Play, Square, Clock, Search, Edit, RefreshCw, Pause, Monitor, Activity, PlusCircle } from 'lucide-react'
import { useRunningTimer, useStartTimer, useStopTimer, useResumeTimer, usePauseTimer, useResumeFromPause, useUpdateTimeEntry, useTimeEntries, useCreateTimeEntry } from '../hooks/useTimeEntries'
import { useWorkDayStatus, useWorkDays } from '../hooks/useWorkDays'
import { useTasks } from '../hooks/useTasks'
import { useState, useEffect, useMemo } from 'react'
import { formatDurationHours } from '../lib/durationUtils'
import { formatDate } from '../lib/dateUtils'
import { BreaksList } from '../components/Dashboard/BreaksList'
import { IdleResumeDialog } from '../components/IdleResumeDialog'
import { useIdleDetection } from '../hooks/useIdleDetection'
import { activityDetectionService } from '../services/activityDetection'
import { useBreakStatus } from '../hooks/useBreaks'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function Dashboard() {
  const navigate = useNavigate()
  const { data: runningTimer } = useRunningTimer()
  const { data: workDayStatus } = useWorkDayStatus()
  const { data: tasks = [] } = useTasks({ isActive: true })
  const recentEntriesLimit = parseInt(localStorage.getItem('timekeeper_recentEntriesCount') || '20', 10)
  const { data: recentEntries = [] } = useTimeEntries({})
  const localDateKey = (date: Date) => {
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, '0')
    const d = `${date.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const todayKey = localDateKey(new Date())
  const weekStart = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    monday.setHours(0, 0, 0, 0)
    return localDateKey(monday)
  }, [])
  const { data: weekWorkDays = [] } = useWorkDays(weekStart, todayKey)
  const { data: breakStatus } = useBreakStatus()
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const resumeTimer = useResumeTimer()
  const pauseTimer = usePauseTimer()
  const resumeFromPause = useResumeFromPause()
  const updateTimer = useUpdateTimeEntry()
  const createTimeEntry = useCreateTimeEntry()
  const [elapsed, setElapsed] = useState('00:00:00')
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [runningNotes, setRunningNotes] = useState('')
  const [manualTaskId, setManualTaskId] = useState<number | undefined>()
  const [manualTaskSearch, setManualTaskSearch] = useState('')
  const [manualStart, setManualStart] = useState('')
  const [manualEnd, setManualEnd] = useState('')
  const [manualEntryMode, setManualEntryMode] = useState<'timeRange' | 'billedOnly'>('timeRange')
  const [manualBilledHours, setManualBilledHours] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualFieldErrors, setManualFieldErrors] = useState<{ start?: string; end?: string }>({})
  const [detectionMethod, setDetectionMethod] = useState<'system-level' | 'browser-only' | 'none'>('none')

  // Idle detection
  const {
    dialogState,
    handleKeepIdleTime,
    handleDiscardIdleTime,
    handleCancelResume,
    isIdle,
    idleState,
  } = useIdleDetection()

  // Check if billing is enabled
  const isBillingEnabled = localStorage.getItem('timekeeper_enableBilling') === 'true'

  // Check if idle detection is enabled
  const isIdleDetectionEnabled = localStorage.getItem('timekeeper_enableIdleDetection') === 'true'

  // Update detection method when idle detection initializes
  useEffect(() => {
    if (isIdleDetectionEnabled) {
      const method = activityDetectionService.getDetectionMethod()
      setDetectionMethod(method)
    }
  }, [isIdleDetectionEnabled])

  // Limit recent entries
  const limitedRecentEntries = useMemo(() => {
    return recentEntries.slice(0, recentEntriesLimit)
  }, [recentEntries, recentEntriesLimit])

  useEffect(() => {
    if (!runningTimer) {
      setElapsed('00:00:00')
      setRunningNotes('')
      return
    }

    // Set running notes from timer
    setRunningNotes(runningTimer.notes || '')

    const updateElapsed = () => {
      // Calculate elapsed time
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

  // Populate dialog when opening for running timer
  useEffect(() => {
    if (dialogOpen && runningTimer) {
      if (runningTimer.taskId) {
        setSelectedTaskId(runningTimer.taskId)
      }
      setNotes(runningTimer.notes || '')
    }
  }, [dialogOpen, runningTimer])

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks
    const lower = searchTerm.toLowerCase()
    return tasks.filter(task =>
      task.name?.toLowerCase().includes(lower) ||
      task.projectName?.toLowerCase().includes(lower) ||
      task.customerName?.toLowerCase().includes(lower)
    )
  }, [tasks, searchTerm])

  const formatMinutesAsHoursMinutes = (minutes: number) => {
    const safeMinutes = Math.max(0, Math.round(minutes))
    const hours = Math.floor(safeMinutes / 60)
    const remainingMinutes = safeMinutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const activeBreakMinutes = useMemo(() => {
    if (!breakStatus?.isOnBreak || !breakStatus.breakStartTime) return 0
    const start = new Date(breakStatus.breakStartTime)
    const now = new Date()
    return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60000))
  }, [breakStatus])

  const totalBreakMinutesToday = (breakStatus?.totalBreakMinutesToday ?? 0) + activeBreakMinutes

  const todayWorkedMinutes = useMemo(() => {
    const checkInTime = workDayStatus?.workDay?.checkInTime || workDayStatus?.checkInTime
    if (!checkInTime) return 0
    const start = new Date(checkInTime)
    const end = workDayStatus?.workDay?.checkOutTime ? new Date(workDayStatus.workDay.checkOutTime) : new Date()
    const totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000)
    return Math.max(0, totalMinutes - totalBreakMinutesToday)
  }, [workDayStatus, totalBreakMinutesToday])

  const thisWeekWorkedMinutes = useMemo(() => {
    const sumWithoutToday = weekWorkDays
      .filter(day => day.date.slice(0, 10) !== todayKey)
      .reduce((sum, day) => sum + Math.max(0, day.totalWorkedMinutes - (day.totalBreakMinutes ?? 0)), 0)
    return sumWithoutToday + todayWorkedMinutes
  }, [weekWorkDays, todayWorkedMinutes, todayKey])

  const todayBilledHours = useMemo(() => {
    return recentEntries
      .filter(entry => entry.startTime.slice(0, 10) === todayKey)
      .reduce((sum, entry) => sum + (entry.billedHours ?? 0), 0)
  }, [recentEntries, todayKey])

  const activeProjectCount = useMemo(() => {
    const projectSet = new Set(
      recentEntries
        .filter(entry => entry.projectName)
        .map(entry => `${entry.customerName ?? ''}|${entry.projectName ?? ''}`)
    )
    return projectSet.size
  }, [recentEntries])

  const handleStartTimer = () => {
    if (!selectedTaskId) return
    
    startTimer.mutate(
      { 
        taskId: selectedTaskId,
        notes: notes || undefined
      },
      {
        onSuccess: () => {
          setDialogOpen(false)
          setSelectedTaskId(undefined)
          setSearchTerm('')
          setNotes('')
        }
      }
    )
  }

  const handleSelectTask = (taskId: number) => {
    setSelectedTaskId(taskId)
  }

  const handleQuickStart = async () => {
    // First, check in if not already checked in
    try {
      const statusResponse = await axios.get(`${API_URL}/api/workdays/status`);
      if (!statusResponse.data.isCheckedIn) {
        await axios.post(`${API_URL}/api/workdays/checkin`, {
          notes: 'Auto check-in from Quick Start'
        });
      }
    } catch (error) {
      console.error('Error checking in:', error);
    }
    
    // Then start the timer
    startTimer.mutate(
      { 
        notes: 'Quick start from dashboard'
      },
      {
        onSuccess: () => {
          setSelectedTaskId(undefined)
          setSearchTerm('')
          setNotes('')
        }
      }
    )
  }

  const handleAssignTaskToRunningTimer = () => {
    if (!runningTimer) return
    
    updateTimer.mutate(
      {
        id: runningTimer.id,
        data: {
          taskId: selectedTaskId,
          notes: notes || runningTimer.notes,
          startTime: runningTimer.startTime,
        }
      },
      {
        onSuccess: () => {
          setDialogOpen(false)
          setSelectedTaskId(undefined)
          setSearchTerm('')
          setNotes('')
        }
      }
    )
  }

  const handleUpdateRunningNotes = () => {
    if (!runningTimer) return
    
    updateTimer.mutate({
      id: runningTimer.id,
      data: {
        taskId: runningTimer.taskId,
        notes: runningNotes,
        startTime: runningTimer.startTime,
      }
    })
    setEditingNotes(false)
  }

  const handleRestartTimer = (entryId: number) => {
    if (runningTimer) {
      if (!confirm('A timer is already running. Stop it and resume this entry?')) {
        return
      }
      stopTimer.mutate(runningTimer.id, {
        onSuccess: () => {
          resumeTimer.mutate(entryId)
        }
      })
    } else {
      resumeTimer.mutate(entryId)
    }
  }

  const handleStopTimer = () => {
    if (runningTimer) {
      stopTimer.mutate(runningTimer.id)
    }
  }

  const resetManualDialog = () => {
    setManualTaskId(undefined)
    setManualTaskSearch('')
    setManualEntryMode('timeRange')
    setManualBilledHours('')
    setManualNotes('')
    setManualError(null)
    setManualFieldErrors({})
    const now = new Date()
    const end = new Date(now)
    const start = new Date(now)
    start.setHours(now.getHours() - 1)
    setManualStart(start.toISOString().slice(0, 16))
    setManualEnd(end.toISOString().slice(0, 16))
  }

  useEffect(() => {
    if (manualDialogOpen && !manualStart && !manualEnd) {
      resetManualDialog()
    }
  }, [manualDialogOpen, manualStart, manualEnd])

  const handleCreateManualEntry = () => {
    setManualError(null)
    setManualFieldErrors({})

    const fieldErrors: { start?: string; end?: string } = {}

    if (!manualStart) {
      fieldErrors.start = 'Start time is required.'
      setManualFieldErrors(fieldErrors)
      setManualError('Please fix the highlighted fields.')
      return
    }

    const start = new Date(manualStart)
    const billedHoursValue = manualBilledHours ? Number(manualBilledHours) : undefined
    let endIso: string | undefined

    if (manualEntryMode === 'timeRange') {
      if (!manualEnd) {
        fieldErrors.end = 'End time is required.'
        setManualFieldErrors(fieldErrors)
        setManualError('Please fix the highlighted fields.')
        return
      }

      const end = new Date(manualEnd)
      if (end <= start) {
        fieldErrors.end = 'End time must be after start time.'
        setManualFieldErrors(fieldErrors)
        setManualError('End time must be after start time.')
        return
      }

      endIso = end.toISOString()
    } else {
      if (!billedHoursValue || billedHoursValue <= 0) {
        setManualError('Billed time must be greater than 0.')
        return
      }
    }

    createTimeEntry.mutate(
      {
        taskId: manualTaskId,
        startTime: start.toISOString(),
        endTime: endIso,
        billedHours: billedHoursValue,
        notes: manualNotes || undefined,
      },
      {
        onSuccess: () => {
          setManualDialogOpen(false)
          resetManualDialog()
        },
      }
    )
  }

  const filteredManualTasks = useMemo(() => {
    const term = manualTaskSearch.trim().toLowerCase()
    if (!term) {
      return tasks
    }

    return tasks.filter(task =>
      task.name?.toLowerCase().includes(term) ||
      task.projectName?.toLowerCase().includes(term) ||
      task.customerName?.toLowerCase().includes(term)
    )
  }, [tasks, manualTaskSearch])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your modern time tracking workspace
        </p>
        <div className="mt-3">
          <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Add Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Add Manual Duration</DialogTitle>
                <DialogDescription>Create a finished time entry with exact start and end time.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entry mode</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={manualEntryMode}
                    onChange={(e) => setManualEntryMode(e.target.value as 'timeRange' | 'billedOnly')}
                  >
                    <option value="timeRange">Start + End time</option>
                    <option value="billedOnly">Start + Billed hours</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Task (optional)</label>
                  <Input
                    placeholder="Search task, project, or customer..."
                    value={manualTaskSearch}
                    onChange={(e) => setManualTaskSearch(e.target.value)}
                  />
                  <select
                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${manualTaskSearch && filteredManualTasks.length === 0 ? 'border-destructive' : ''}`}
                    value={manualTaskId ?? ''}
                    onChange={(e) => setManualTaskId(e.target.value ? Number(e.target.value) : undefined)}
                  >
                    <option value="">No task</option>
                    {filteredManualTasks.map(task => (
                      <option key={task.id} value={task.id}>
                        {task.customerName} / {task.projectName} / {task.name}
                      </option>
                    ))}
                  </select>
                  {manualTaskSearch && filteredManualTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground">No tasks match your search.</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start</label>
                    <Input
                      type="datetime-local"
                      value={manualStart}
                      onChange={(e) => {
                        setManualStart(e.target.value)
                        if (manualFieldErrors.start) {
                          setManualFieldErrors(prev => ({ ...prev, start: undefined }))
                        }
                      }}
                      className={manualFieldErrors.start ? 'border-destructive focus-visible:ring-destructive' : ''}
                    />
                    {manualFieldErrors.start && (
                      <p className="text-xs text-destructive">{manualFieldErrors.start}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {manualEntryMode === 'timeRange' ? (
                      <>
                        <label className="text-sm font-medium">End</label>
                        <Input
                          type="datetime-local"
                          value={manualEnd}
                          onChange={(e) => {
                            setManualEnd(e.target.value)
                            if (manualFieldErrors.end) {
                              setManualFieldErrors(prev => ({ ...prev, end: undefined }))
                            }
                          }}
                          className={manualFieldErrors.end ? 'border-destructive focus-visible:ring-destructive' : ''}
                        />
                        {manualFieldErrors.end && (
                          <p className="text-xs text-destructive">{manualFieldErrors.end}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <label className="text-sm font-medium">Billed hours</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.25"
                          value={manualBilledHours}
                          onChange={(e) => setManualBilledHours(e.target.value)}
                          placeholder="e.g. 1.50"
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder="What did you work on?"
                    rows={3}
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                  />
                </div>
                {manualError && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {manualError}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setManualDialogOpen(false)
                      resetManualDialog()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateManualEntry} disabled={createTimeEntry.isPending}>
                    Save Entry
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div>
        <Card className="border-2 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Quick Timer
          </CardTitle>
          <CardDescription>
            Start tracking time instantly or select a task first
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Large Timer Display */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-4xl sm:text-5xl lg:text-6xl font-mono font-bold tracking-wider break-all text-center">
              {elapsed}
            </div>
            
            {/* Idle Indicator */}
            {isIdle && runningTimer && (
              <div className="mt-3 flex flex-col items-center gap-1">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Idle Detected
                </Badge>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  Idle for {Math.floor((idleState.idleDurationMs || 0) / 60000)} min
                </p>
              </div>
            )}

            {/* Detection Method Indicator */}
            {isIdleDetectionEnabled && detectionMethod !== 'none' && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                {detectionMethod === 'system-level' ? (
                  <>
                    <Monitor className="h-3 w-3 text-green-600" />
                    <span className="text-green-600 font-medium" title="Detects activity across all applications and monitors">
                      System-level detection ✓
                    </span>
                  </>
                ) : (
                  <>
                    <Activity className="h-3 w-3 text-amber-600" />
                    <span className="text-amber-600" title="Only detects activity within this browser tab">
                      Browser-only detection
                    </span>
                  </>
                )}
              </div>
            )}
            
            {runningTimer && runningTimer.taskName && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {runningTimer.customerName} / {runningTimer.projectName}
                </p>
                <p className="text-lg font-medium">{runningTimer.taskName}</p>
              </div>
            )}
          </div>

          {/* Timer Controls */}
          <div className="flex w-full flex-col items-center gap-4">
            {runningTimer ? (
              <>
                <div className="w-full max-w-2xl min-h-[108px]">
                  {!editingNotes && (
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingNotes(true)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        {runningTimer.notes ? 'Edit Notes' : 'Add Notes'}
                      </Button>
                      <div className="w-full rounded-md border p-3 text-sm text-muted-foreground">
                        {runningTimer.notes || 'No notes yet'}
                      </div>
                    </div>
                  )}

                  {editingNotes && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Describe what you're working on..."
                        value={runningNotes}
                        onChange={(e) => setRunningNotes(e.target.value)}
                        rows={3}
                        className="resize-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingNotes(false)
                            setRunningNotes(runningTimer.notes || '')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleUpdateRunningNotes}
                          disabled={updateTimer.isPending}
                        >
                          Save Notes
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
                  {runningTimer.isPaused ? (
                    <Button
                      size="lg"
                      onClick={() => resumeFromPause.mutate(runningTimer.id)}
                      disabled={resumeFromPause.isPending}
                      className="h-12 w-full gap-2 whitespace-nowrap"
                    >
                      <Play className="h-5 w-5" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => pauseTimer.mutate(runningTimer.id)}
                      disabled={pauseTimer.isPending}
                      className="h-12 w-full gap-2 whitespace-nowrap"
                    >
                      <Pause className="h-5 w-5" />
                      Pause
                    </Button>
                  )}
                  
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStopTimer}
                    disabled={stopTimer.isPending}
                    className="h-12 w-full gap-2 whitespace-nowrap"
                  >
                    <Square className="h-5 w-5" />
                    Stop
                  </Button>
                  
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" variant="outline" className="h-12 w-full gap-2 whitespace-nowrap">
                        <Clock className="h-5 w-5" />
                        {runningTimer.taskId ? 'Change' : 'Assign'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[700px]">
                      <DialogHeader>
                        <DialogTitle>
                          {runningTimer.taskId ? 'Change Task' : 'Assign Task to Running Timer'}
                        </DialogTitle>
                        <DialogDescription>
                          Select a task and update notes for the current time entry
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search tasks, projects, or customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>

                        {/* Task List */}
                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                          {filteredTasks.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                              {searchTerm ? 'No tasks found' : 'No active tasks available'}
                            </p>
                          ) : (
                            filteredTasks.map((task) => (
                              <button
                                key={task.id}
                                onClick={() => handleSelectTask(task.id)}
                                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                  selectedTaskId === task.id
                                    ? 'bg-primary/10 border-primary'
                                    : 'hover:bg-accent hover:border-primary'
                                }`}
                              >
                                <div className="font-medium">{task.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {task.customerName} / {task.projectName}
                                </div>
                                {(task.position || task.procurementNumber) && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {task.position && <span>Position: {task.position}</span>}
                                    {task.position && task.procurementNumber && <span> • </span>}
                                    {task.procurementNumber && <span>Procurement: {task.procurementNumber}</span>}
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>

                        {/* Notes Section */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Notes (Optional)
                          </label>
                          <Textarea
                            placeholder="Describe what you're working on..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="resize-none"
                          />
                        </div>

                        {/* Assign Button */}
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setDialogOpen(false)
                              setSelectedTaskId(undefined)
                              setNotes('')
                              setSearchTerm('')
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAssignTaskToRunningTimer}
                            disabled={updateTimer.isPending}
                            className="gap-2"
                          >
                            <Clock className="h-4 w-4" />
                            {selectedTaskId ? 'Assign Task' : 'Update Notes'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            ) : (
              <>
                <div className="w-full max-w-2xl min-h-[108px] rounded-md border border-dashed border-muted p-3 text-center text-sm text-muted-foreground flex items-center justify-center">
                  Start a timer to add notes
                </div>

                <div className="grid w-full max-w-2xl grid-cols-3 gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleQuickStart}
                    disabled={startTimer.isPending}
                    className="h-12 w-full gap-2 whitespace-nowrap"
                  >
                    <Play className="h-5 w-5" />
                    Quick Start
                  </Button>

                  <div className="h-12" />

                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="h-12 w-full gap-2 whitespace-nowrap">
                        <Clock className="h-5 w-5" />
                        Start with Task
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[700px]">
                    <DialogHeader>
                      <DialogTitle>Start New Timer</DialogTitle>
                      <DialogDescription>
                        Select a task and add optional notes to begin tracking time
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search tasks, projects, or customers..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      {/* Task List */}
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {filteredTasks.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            {searchTerm ? 'No tasks found' : 'No active tasks available'}
                          </p>
                        ) : (
                          filteredTasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={() => handleSelectTask(task.id)}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                selectedTaskId === task.id
                                  ? 'bg-primary/10 border-primary'
                                  : 'hover:bg-accent hover:border-primary'
                              }`}
                            >
                              <div className="font-medium">{task.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {task.customerName} / {task.projectName}
                              </div>
                              {(task.position || task.procurementNumber) && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {task.position && <span>Position: {task.position}</span>}
                                  {task.position && task.procurementNumber && <span> • </span>}
                                  {task.procurementNumber && <span>Procurement: {task.procurementNumber}</span>}
                                </div>
                              )}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Notes Section */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Notes (Optional)
                        </label>
                        <Textarea
                          placeholder="Describe what you're working on..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      {/* Start Button */}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDialogOpen(false)
                            setSelectedTaskId(undefined)
                            setNotes('')
                            setSearchTerm('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleStartTimer}
                          disabled={!selectedTaskId || startTimer.isPending}
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Start Timer
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                  </Dialog>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutesAsHoursMinutes(todayWorkedMinutes)}</div>
            <p className="text-xs text-muted-foreground">of 8.00h target</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutesAsHoursMinutes(thisWeekWorkedMinutes)}</div>
            <p className="text-xs text-muted-foreground">of 40.00h target</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjectCount}</div>
            <p className="text-xs text-muted-foreground">currently tracking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Break</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinutesAsHoursMinutes(totalBreakMinutesToday)}</div>
            <p className="text-xs text-muted-foreground">Breaks today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayBilledHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">Billed today</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Breaks */}
      <BreaksList />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Time Entries</CardTitle>
              <CardDescription>
                Double-click to restart timer for any entry
              </CardDescription>
            </div>
            <Badge variant="secondary">{limitedRecentEntries.length} entries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {limitedRecentEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No recent entries yet. Start tracking time to see your activity here!
            </p>
          ) : (
            <div className="space-y-2">
              {limitedRecentEntries.map((entry) => (
                <div
                  key={entry.id}
                  onDoubleClick={() => handleRestartTimer(entry.id)}
                  className="grid grid-cols-1 gap-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer md:grid-cols-[1.2fr_1fr_1.2fr_auto_auto_auto] md:items-center"
                  title="Double-click to restart timer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {entry.taskName || 'No task'}
                      </span>
                      {entry.isRunning && (
                        <Badge variant="success" className="flex-shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          Running
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {entry.customerName && entry.projectName ? (
                        <>{entry.customerName} / {entry.projectName}</>
                      ) : (
                        'No project assigned'
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {entry.notes && entry.notes !== 'Quick start from dashboard' ? entry.notes : '—'}
                  </div>
                  <div className="text-sm font-medium md:text-right">
                    {entry.durationMinutes 
                      ? formatDurationHours(
                          `${Math.floor(entry.durationMinutes / 60).toString().padStart(2, '0')}:${Math.floor(entry.durationMinutes % 60).toString().padStart(2, '0')}:00`
                        )
                      : '—'}
                    {isBillingEnabled && entry.billedHours != null && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Billed: {entry.billedHours.toFixed(2)}h
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground md:text-right">
                    {formatDate(entry.startTime, 'MMM d, HH:mm')}
                  </div>
                  <div className="flex md:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate('/entries')
                      }}
                      title="Open Time Entries page to edit"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="flex md:justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRestartTimer(entry.id)
                      }}
                      title="Restart timer"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Idle Resume Dialog */}
      {dialogState.idleStartTime && (
        <IdleResumeDialog
          isOpen={dialogState.isOpen}
          idleStartTime={dialogState.idleStartTime}
          idleDurationMs={dialogState.idleDurationMs}
          onKeepIdleTime={handleKeepIdleTime}
          onDiscardIdleTime={handleDiscardIdleTime}
          onCancel={handleCancelResume}
        />
      )}
    </div>
  )
}
