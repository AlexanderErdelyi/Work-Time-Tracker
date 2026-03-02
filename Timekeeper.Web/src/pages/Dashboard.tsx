import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Dialog, DialogTrigger } from '../components/ui/Dialog'
import { Badge } from '../components/ui/Badge'
import { Clock, Monitor, Activity, PlusCircle } from 'lucide-react'
import { useRunningTimer, useStartTimer, useStopTimer, useResumeTimer, usePauseTimer, useResumeFromPause, useUpdateTimeEntry, useTimeEntries, useCreateTimeEntry, useDeleteTimeEntry } from '../hooks/useTimeEntries'
import { useWorkDayStatus, useWorkDays } from '../hooks/useWorkDays'
import { useTasks } from '../hooks/useTasks'
import { workDaysApi } from '../api/workDays'
import { useState, useEffect, useMemo } from 'react'
import { parseApiDateTime } from '../lib/timeUtils'
import type { TimeEntry } from '../types'
import { BreaksList } from '../components/Dashboard/BreaksList'
import { IdleResumeDialog } from '../components/IdleResumeDialog'
import { useIdleDetection } from '../hooks/useIdleDetection'
import { activityDetectionService } from '../services/activityDetection'
import { useBreakStatus } from '../hooks/useBreaks'
import { Responsive, WidthProvider, type ResponsiveLayouts } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { StatsPanel, TimerControls, ManualEntryDialog, EditEntryDialog, RecentEntriesList } from '../components/Dashboard'

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
  const [manualDialogOpen, setManualDialogOpen] = useState(false)
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
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
      return
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
  }, [runningTimer])

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

  const filteredTasks = useMemo(() => {
    return tasks
  }, [tasks])

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

  const handleStartTimer = (taskId: number, notes: string) => {
    startTimer.mutate({ 
      taskId,
      notes: notes || undefined
    })
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
    startTimer.mutate({ 
      notes: 'Quick start from dashboard'
    })
  }

  const handleAssignTaskToRunningTimer = (taskId: number | undefined, notes: string) => {
    if (!runningTimer) return
    
    updateTimer.mutate({
      id: runningTimer.id,
      data: {
        taskId,
        notes: notes || runningTimer.notes,
        startTime: runningTimer.startTime,
      }
    })
  }

  const handleUpdateRunningNotes = (notes: string) => {
    if (!runningTimer) return
    
    updateTimer.mutate({
      id: runningTimer.id,
      data: {
        taskId: runningTimer.taskId,
        notes,
        startTime: runningTimer.startTime,
      }
    })
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

  const openEditEntryDialog = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setEditEntryDialogOpen(true)
  }

  const handleSaveEditedEntry = (data: {
    taskId?: number
    startTime: string
    endTime?: string
    billedHours?: number
    notes?: string
  }) => {
    if (!editingEntry) return

    updateTimer.mutate(
      {
        id: editingEntry.id,
        data,
      },
      {
        onSuccess: () => {
          setEditEntryDialogOpen(false)
          setEditingEntry(null)
        },
      }
    )
  }

  const handleCreateManualEntry = (data: {
    taskId?: number
    startTime: string
    endTime?: string
    billedHours?: number
    notes?: string
  }) => {
    createTimeEntry.mutate(data, {
      onSuccess: () => {
        setManualDialogOpen(false)
      },
    })
  }

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
          </Dialog>
          <ManualEntryDialog
            open={manualDialogOpen}
            onOpenChange={setManualDialogOpen}
            tasks={filteredTasks}
            onCreateEntry={handleCreateManualEntry}
            isCreating={createTimeEntry.isPending}
          />
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
          <TimerControls
            runningTimer={runningTimer}
            tasks={filteredTasks}
            onStartTimer={handleStartTimer}
            onQuickStart={handleQuickStart}
            onStopTimer={handleStopTimer}
            onPauseTimer={(id) => pauseTimer.mutate(id)}
            onResumeFromPause={(id) => resumeFromPause.mutate(id)}
            onUpdateRunningNotes={handleUpdateRunningNotes}
            onAssignTaskToRunningTimer={handleAssignTaskToRunningTimer}
            isStartTimerPending={startTimer.isPending}
            isStopTimerPending={stopTimer.isPending}
            isPauseTimerPending={pauseTimer.isPending}
            isResumeFromPausePending={resumeFromPause.isPending}
            isUpdateTimerPending={updateTimer.isPending}
          />
        </CardContent>
      </Card>
      </div>

      <div key="stats" className="flex h-full min-h-0 flex-col">
        {isLayoutEditMode && (
          <div className="dashboard-drag-handle mb-2 cursor-move rounded-md border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground">
            Drag / resize: Stats
          </div>
        )}
        <StatsPanel
          todayWorkedMinutes={todayWorkedMinutes}
          thisWeekWorkedMinutes={thisWeekWorkedMinutes}
          activeProjectCount={activeProjectCount}
          totalBreakMinutesToday={totalBreakMinutesToday}
          todayBilledHours={todayBilledHours}
          isBillingEnabled={isBillingEnabled}
        />
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
        <RecentEntriesList
          entries={displayedRecentEntries}
          mode={recentEntriesMode}
          currentPage={recentEntriesPage}
          totalPages={totalRecentEntriesPages}
          isBillingEnabled={isBillingEnabled}
          onModeChange={setRecentEntriesMode}
          onPageChange={setRecentEntriesPage}
          onEditEntry={openEditEntryDialog}
          onDeleteEntry={handleDeleteRecentEntry}
          onRestartTimer={handleRestartTimer}
          isDeleting={deleteEntry.isPending}
        />

        <EditEntryDialog
          open={editEntryDialogOpen}
          onOpenChange={setEditEntryDialogOpen}
          tasks={filteredTasks}
          entry={editingEntry}
          onSaveEntry={handleSaveEditedEntry}
          isSaving={updateTimer.isPending}
          isBillingEnabled={isBillingEnabled}
        />
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
