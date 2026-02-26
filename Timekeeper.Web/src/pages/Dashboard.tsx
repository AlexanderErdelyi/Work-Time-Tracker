import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Badge } from '../components/ui/Badge'
import { Play, Square, Clock, Search, Edit, RefreshCw, Pause, Monitor, Activity, PlusCircle, Trash2 } from 'lucide-react'
import { useRunningTimer, useStartTimer, useStopTimer, useResumeTimer, usePauseTimer, useResumeFromPause, useUpdateTimeEntry, useTimeEntries, useCreateTimeEntry, useDeleteTimeEntry } from '../hooks/useTimeEntries'
import { useWorkDayStatus, useWorkDays } from '../hooks/useWorkDays'
import { useTasks } from '../hooks/useTasks'
import { workDaysApi } from '../api/workDays'
import { useState, useEffect, useMemo } from 'react'
import { formatDurationHours } from '../lib/durationUtils'
import { formatDate } from '../lib/dateUtils'
import { parseApiDateTime } from '../lib/timeUtils'
import { BreaksList } from '../components/Dashboard/BreaksList'
import { IdleResumeDialog } from '../components/IdleResumeDialog'
import { useIdleDetection } from '../hooks/useIdleDetection'
import { activityDetectionService } from '../services/activityDetection'
import { useBreakStatus } from '../hooks/useBreaks'
import { Responsive, WidthProvider, type ResponsiveLayouts } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)
const DASHBOARD_LAYOUTS_KEY = 'timekeeper_dashboard_layouts_v1'
const RECENT_ENTRIES_MODE_KEY = 'timekeeper_recent_entries_mode'
const RECENT_ENTRIES_PAGE_SIZE = 8
const RECENT_ENTRIES_MIN_H = 6
const RECENT_ENTRIES_MAX_H = 20

type RecentEntriesMode = 'scroll' | 'pagination'

const DEFAULT_DASHBOARD_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: 'quickTimer', x: 0, y: 0, w: 6, h: 13, minW: 4, minH: 10 },
    { i: 'recentEntries', x: 6, y: 0, w: 6, h: 13, minW: 4, minH: RECENT_ENTRIES_MIN_H },
    { i: 'stats', x: 0, y: 13, w: 12, h: 6, minW: 6, minH: 4 },
    { i: 'breaksList', x: 0, y: 19, w: 12, h: 8, minW: 6, minH: 6 },
  ],
  md: [
    { i: 'quickTimer', x: 0, y: 0, w: 10, h: 13, minW: 6, minH: 10 },
    { i: 'recentEntries', x: 0, y: 13, w: 10, h: 13, minW: 6, minH: RECENT_ENTRIES_MIN_H },
    { i: 'stats', x: 0, y: 26, w: 10, h: 7, minW: 6, minH: 4 },
    { i: 'breaksList', x: 0, y: 33, w: 10, h: 8, minW: 6, minH: 6 },
  ],
  sm: [
    { i: 'quickTimer', x: 0, y: 0, w: 6, h: 13, minW: 4, minH: 10 },
    { i: 'recentEntries', x: 0, y: 13, w: 6, h: 13, minW: 4, minH: RECENT_ENTRIES_MIN_H },
    { i: 'stats', x: 0, y: 26, w: 6, h: 8, minW: 4, minH: 4 },
    { i: 'breaksList', x: 0, y: 34, w: 6, h: 8, minW: 4, minH: 6 },
  ],
  xs: [
    { i: 'quickTimer', x: 0, y: 0, w: 4, h: 14, minW: 2, minH: 10 },
    { i: 'recentEntries', x: 0, y: 14, w: 4, h: 14, minW: 2, minH: RECENT_ENTRIES_MIN_H },
    { i: 'stats', x: 0, y: 28, w: 4, h: 10, minW: 2, minH: 4 },
    { i: 'breaksList', x: 0, y: 38, w: 4, h: 8, minW: 2, minH: 6 },
  ],
  xxs: [
    { i: 'quickTimer', x: 0, y: 0, w: 2, h: 16, minW: 2, minH: 10 },
    { i: 'recentEntries', x: 0, y: 16, w: 2, h: 16, minW: 2, minH: RECENT_ENTRIES_MIN_H },
    { i: 'stats', x: 0, y: 32, w: 2, h: 12, minW: 2, minH: 4 },
    { i: 'breaksList', x: 0, y: 44, w: 2, h: 10, minW: 2, minH: 6 },
  ],
}

function loadDashboardLayouts(): ResponsiveLayouts {
  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUTS_KEY)
    if (!raw) {
      return DEFAULT_DASHBOARD_LAYOUTS
    }
    return JSON.parse(raw) as ResponsiveLayouts
  } catch {
    return DEFAULT_DASHBOARD_LAYOUTS
  }
}

function loadRecentEntriesMode(): RecentEntriesMode {
  const value = localStorage.getItem(RECENT_ENTRIES_MODE_KEY)
  if (value === 'pagination') {
    return 'pagination'
  }
  return 'scroll'
}

function getRecentEntriesHeight(entriesCount: number, mode: RecentEntriesMode, hasPaginationControls: boolean) {
  const baseRows = 6
  const perEntryRows = 2
  const paginationRows = mode === 'pagination' && hasPaginationControls ? 2 : 0
  const desired = baseRows + (entriesCount * perEntryRows) + paginationRows
  return Math.max(RECENT_ENTRIES_MIN_H, Math.min(RECENT_ENTRIES_MAX_H, desired))
}

function normalizeRecentEntriesLayouts(layouts: ResponsiveLayouts, targetHeight?: number): ResponsiveLayouts {
  const next: ResponsiveLayouts = {}

  for (const [breakpoint, layout] of Object.entries(layouts)) {
    if (!layout) {
      continue
    }

    next[breakpoint] = layout.map(item => {
      if (item.i !== 'recentEntries') {
        return item
      }

      const nextHeight = targetHeight != null
        ? Math.max(RECENT_ENTRIES_MIN_H, Math.min(RECENT_ENTRIES_MAX_H, targetHeight))
        : Math.max(RECENT_ENTRIES_MIN_H, item.h)

      return {
        ...item,
        h: nextHeight,
        minH: RECENT_ENTRIES_MIN_H,
      }
    })
  }

  return next
}

export function Dashboard() {
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
  const deleteEntry = useDeleteTimeEntry()
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
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null)
  const [editTaskId, setEditTaskId] = useState<number | undefined>()
  const [editTaskSearch, setEditTaskSearch] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editBilledHours, setEditBilledHours] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [detectionMethod, setDetectionMethod] = useState<'system-level' | 'browser-only' | 'none'>('none')
  const [isLayoutEditMode, setIsLayoutEditMode] = useState(false)
  const [dashboardLayouts, setDashboardLayouts] = useState<ResponsiveLayouts>(() => loadDashboardLayouts())
  const [recentEntriesMode, setRecentEntriesMode] = useState<RecentEntriesMode>(() => loadRecentEntriesMode())
  const [recentEntriesPage, setRecentEntriesPage] = useState(1)

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

  const totalRecentEntriesPages = Math.max(1, Math.ceil(limitedRecentEntries.length / RECENT_ENTRIES_PAGE_SIZE))

  const paginatedRecentEntries = useMemo(() => {
    const startIndex = (recentEntriesPage - 1) * RECENT_ENTRIES_PAGE_SIZE
    return limitedRecentEntries.slice(startIndex, startIndex + RECENT_ENTRIES_PAGE_SIZE)
  }, [limitedRecentEntries, recentEntriesPage])

  const displayedRecentEntries = recentEntriesMode === 'pagination' ? paginatedRecentEntries : limitedRecentEntries
  const recentEntriesWidgetHeight = useMemo(
    () => getRecentEntriesHeight(displayedRecentEntries.length, recentEntriesMode, recentEntriesMode === 'pagination' && totalRecentEntriesPages > 1),
    [displayedRecentEntries.length, recentEntriesMode, totalRecentEntriesPages]
  )

  useEffect(() => {
    if (!runningTimer) {
      setElapsed('00:00:00')
      setRunningNotes('')
      return
    }

    // Only update running notes if the user is not currently editing them
    if (!editingNotes) {
      setRunningNotes(runningTimer.notes || '')
    }

    const baselineClientNowMs = Date.now()
    const baselineServerNowMs = runningTimer.serverNowUtc
      ? parseApiDateTime(runningTimer.serverNowUtc).getTime()
      : null

    const updateElapsed = () => {
      // Calculate elapsed time
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
  }, [runningTimer, editingNotes])

  useEffect(() => {
    localStorage.setItem(DASHBOARD_LAYOUTS_KEY, JSON.stringify(dashboardLayouts))
  }, [dashboardLayouts])

  useEffect(() => {
    setDashboardLayouts(prev => normalizeRecentEntriesLayouts(prev))
  }, [])

  useEffect(() => {
    localStorage.setItem(RECENT_ENTRIES_MODE_KEY, recentEntriesMode)
    setRecentEntriesPage(1)
  }, [recentEntriesMode])

  useEffect(() => {
    if (recentEntriesPage > totalRecentEntriesPages) {
      setRecentEntriesPage(totalRecentEntriesPages)
    }
  }, [recentEntriesPage, totalRecentEntriesPages])

  useEffect(() => {
    if (isLayoutEditMode) return
    setDashboardLayouts(prev => normalizeRecentEntriesLayouts(prev, recentEntriesWidgetHeight))
  }, [recentEntriesWidgetHeight, isLayoutEditMode])

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
    const start = parseApiDateTime(breakStatus.breakStartTime)
    const now = new Date()
    return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60000))
  }, [breakStatus])

  const totalBreakMinutesToday = (breakStatus?.totalBreakMinutesToday ?? 0) + activeBreakMinutes

  const todayWorkedMinutes = useMemo(() => {
    const checkInTime = workDayStatus?.workDay?.checkInTime || workDayStatus?.checkInTime
    if (!checkInTime) return 0
    const start = parseApiDateTime(checkInTime)
    const end = workDayStatus?.workDay?.checkOutTime ? parseApiDateTime(workDayStatus.workDay.checkOutTime) : new Date()
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
      const statusResponse = await workDaysApi.getStatus()
      if (!statusResponse.isCheckedIn) {
        await workDaysApi.checkIn('Auto check-in from Quick Start')
      }
    } catch (error) {
      console.error('Error checking in:', error)
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

  const handleDeleteRecentEntry = async (entryId: number) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return
    }

    try {
      await deleteEntry.mutateAsync(entryId)
    } catch (error) {
      console.error('Failed to delete time entry:', error)
      alert('Failed to delete time entry. Please try again.')
    }
  }

  const toLocalDateTimeInput = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const openEditEntryDialog = (entry: typeof recentEntries[number]) => {
    setEditingEntryId(entry.id)
    setEditTaskId(entry.taskId)
    setEditTaskSearch('')
    setEditStart(toLocalDateTimeInput(entry.startTime))
    setEditEnd(toLocalDateTimeInput(entry.endTime))
    setEditNotes(entry.notes || '')
    setEditBilledHours(entry.billedHours != null ? entry.billedHours.toString() : '')
    setEditError(null)
    setEditEntryDialogOpen(true)
  }

  const resetEditEntryDialog = () => {
    setEditEntryDialogOpen(false)
    setEditingEntryId(null)
    setEditTaskId(undefined)
    setEditTaskSearch('')
    setEditStart('')
    setEditEnd('')
    setEditNotes('')
    setEditBilledHours('')
    setEditError(null)
  }

  const handleSaveEditedEntry = () => {
    if (!editingEntryId) return

    setEditError(null)

    if (!editStart) {
      setEditError('Start time is required.')
      return
    }

    const start = new Date(editStart)
    const end = editEnd ? new Date(editEnd) : undefined

    if (Number.isNaN(start.getTime())) {
      setEditError('Start time is invalid.')
      return
    }

    if (end && Number.isNaN(end.getTime())) {
      setEditError('End time is invalid.')
      return
    }

    if (end && end <= start) {
      setEditError('End time must be after start time.')
      return
    }

    const billedHoursValue = editBilledHours.trim() === '' ? undefined : Number(editBilledHours)
    if (editBilledHours.trim() !== '' && (!Number.isFinite(billedHoursValue) || (billedHoursValue ?? 0) < 0)) {
      setEditError('Billed hours must be 0 or greater.')
      return
    }

    updateTimer.mutate(
      {
        id: editingEntryId,
        data: {
          taskId: editTaskId,
          startTime: start.toISOString(),
          endTime: end ? end.toISOString() : undefined,
          billedHours: billedHoursValue,
          notes: editNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          resetEditEntryDialog()
        },
      }
    )
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

  const filteredEditTasks = useMemo(() => {
    const term = editTaskSearch.trim().toLowerCase()
    if (!term) {
      return tasks
    }

    return tasks.filter(task =>
      task.name?.toLowerCase().includes(term) ||
      task.projectName?.toLowerCase().includes(term) ||
      task.customerName?.toLowerCase().includes(term)
    )
  }, [tasks, editTaskSearch])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your modern time tracking workspace
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
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
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks, projects, or customers..."
                      value={manualTaskSearch}
                      onChange={(e) => setManualTaskSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto rounded-md border p-2">
                    <button
                      type="button"
                      onClick={() => setManualTaskId(undefined)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        manualTaskId == null
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-accent hover:border-primary'
                      }`}
                    >
                      <div className="font-medium">No task</div>
                      <div className="text-sm text-muted-foreground">Create entry without assigning a task</div>
                    </button>

                    {filteredManualTasks.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        {manualTaskSearch ? 'No tasks found' : 'No active tasks available'}
                      </p>
                    ) : (
                      filteredManualTasks.map((task) => (
                        <button
                          type="button"
                          key={task.id}
                          onClick={() => setManualTaskId(task.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            manualTaskId === task.id
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
          <Button
            variant={isLayoutEditMode ? 'default' : 'outline'}
            onClick={() => setIsLayoutEditMode(prev => !prev)}
            className="gap-2"
          >
            {isLayoutEditMode ? 'Done customizing' : 'Customize layout'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDashboardLayouts(DEFAULT_DASHBOARD_LAYOUTS)}
          >
            Reset layout
          </Button>
        </div>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={dashboardLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={24}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable={isLayoutEditMode}
        isResizable={isLayoutEditMode}
        resizeHandles={['se', 's', 'e']}
        draggableHandle=".dashboard-drag-handle"
        onLayoutChange={(_layout: unknown, layouts: ResponsiveLayouts) => setDashboardLayouts(normalizeRecentEntriesLayouts(layouts))}
      >
      <div key="quickTimer" className="flex h-full min-h-0 flex-col">
        {isLayoutEditMode && (
          <div className="dashboard-drag-handle mb-2 cursor-move rounded-md border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground">
            Drag / resize: Quick Timer
          </div>
        )}
        <Card className="border-2 flex-1 min-h-0">
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

      <div key="stats" className="flex h-full min-h-0 flex-col">
        {isLayoutEditMode && (
          <div className="dashboard-drag-handle mb-2 cursor-move rounded-md border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground">
            Drag / resize: Stats
          </div>
        )}
      <div className="grid h-full min-h-0 gap-4 md:grid-cols-5">
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
      </div>

      <div key="breaksList" className="flex h-full min-h-0 flex-col">
        {isLayoutEditMode && (
          <div className="dashboard-drag-handle mb-2 cursor-move rounded-md border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground">
            Drag / resize: Breaks
          </div>
        )}
      <BreaksList />
      </div>

      <div key="recentEntries" className="flex h-full min-h-0 flex-col">
        {isLayoutEditMode && (
          <div className="dashboard-drag-handle mb-2 cursor-move rounded-md border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground">
            Drag / resize: Recent Entries
          </div>
        )}
      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Time Entries</CardTitle>
              <CardDescription>
                Double-click to restart timer for any entry
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border bg-background px-2 text-xs"
                value={recentEntriesMode}
                onChange={(e) => setRecentEntriesMode(e.target.value as RecentEntriesMode)}
              >
                <option value="scroll">Scrolling</option>
                <option value="pagination">Pagination</option>
              </select>
              <Badge variant="secondary">{limitedRecentEntries.length} entries</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className={recentEntriesMode === 'scroll' ? 'flex-1 min-h-0 overflow-y-auto' : 'flex-1 min-h-0'}>
          {displayedRecentEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No recent entries yet. Start tracking time to see your activity here!
            </p>
          ) : (
            <div className="space-y-2 pr-1">
              {displayedRecentEntries.map((entry) => (
                <div
                  key={entry.id}
                  onDoubleClick={() => handleRestartTimer(entry.id)}
                  className="grid grid-cols-1 gap-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer md:grid-cols-[1.2fr_1fr_1.2fr_auto_auto_auto_auto] md:items-center"
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
                        openEditEntryDialog(entry)
                      }}
                      title="Edit entry"
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
                        handleDeleteRecentEntry(entry.id)
                      }}
                      disabled={deleteEntry.isPending || entry.isRunning}
                      title={entry.isRunning ? 'Stop running timer before deleting' : 'Delete entry'}
                    >
                      <Trash2 className="h-4 w-4" />
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

              {recentEntriesMode === 'pagination' && totalRecentEntriesPages > 1 && (
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    Page {recentEntriesPage} of {totalRecentEntriesPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecentEntriesPage(prev => Math.max(1, prev - 1))}
                      disabled={recentEntriesPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecentEntriesPage(prev => Math.min(totalRecentEntriesPages, prev + 1))}
                      disabled={recentEntriesPage === totalRecentEntriesPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editEntryDialogOpen} onOpenChange={(open) => {
        if (!open) {
          resetEditEntryDialog()
          return
        }
        setEditEntryDialogOpen(open)
      }}>
        <DialogContent className="max-w-2xl max-h-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>Update task, timestamps, notes, and billing for this entry.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks, projects, or customers..."
                  value={editTaskSearch}
                  onChange={(e) => setEditTaskSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto rounded-md border p-2">
                <button
                  type="button"
                  onClick={() => setEditTaskId(undefined)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    editTaskId == null
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-accent hover:border-primary'
                  }`}
                >
                  <div className="font-medium">No task</div>
                  <div className="text-sm text-muted-foreground">Keep this entry without an assigned task</div>
                </button>

                {filteredEditTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    {editTaskSearch ? 'No tasks found' : 'No active tasks available'}
                  </p>
                ) : (
                  filteredEditTasks.map((task) => (
                    <button
                      type="button"
                      key={task.id}
                      onClick={() => setEditTaskId(task.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        editTaskId === task.id
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start</label>
                <Input type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End (optional)</label>
                <Input type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              </div>
            </div>

            {isBillingEnabled && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Billed hours</label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={editBilledHours}
                  onChange={(e) => setEditBilledHours(e.target.value)}
                  placeholder="e.g. 1.50"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Describe what you worked on..."
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            {editError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetEditEntryDialog}>Cancel</Button>
              <Button onClick={handleSaveEditedEntry} disabled={updateTimer.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      </ResponsiveGridLayout>

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
