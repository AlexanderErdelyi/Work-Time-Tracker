import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Badge } from '../components/ui/Badge'
import { Play, Square, Clock, Search, Edit, RefreshCw } from 'lucide-react'
import { useRunningTimer, useStartTimer, useStopTimer, useResumeTimer, useUpdateTimeEntry, useTimeEntries } from '../hooks/useTimeEntries'
import { useTasks } from '../hooks/useTasks'
import { useState, useEffect, useMemo } from 'react'
import { calculateDuration, formatDurationHours } from '../lib/durationUtils'
import { formatDate } from '../lib/dateUtils'
import { CheckInCard } from '../components/Dashboard/CheckInCard'
import { BreakCard } from '../components/Dashboard/BreakCard'
import { BreaksList } from '../components/Dashboard/BreaksList'

export function Dashboard() {
  const { data: runningTimer } = useRunningTimer()
  const { data: tasks = [] } = useTasks({ isActive: true })
  const recentEntriesLimit = parseInt(localStorage.getItem('timekeeper_recentEntriesCount') || '20', 10)
  const { data: recentEntries = [] } = useTimeEntries({})
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const resumeTimer = useResumeTimer()
  const updateTimer = useUpdateTimeEntry()
  const [elapsed, setElapsed] = useState('00:00:00')
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [runningNotes, setRunningNotes] = useState('')

  // Check if billing is enabled
  const isBillingEnabled = localStorage.getItem('timekeeper_enableBilling') === 'true'

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
      const duration = calculateDuration(runningTimer.startTime)
      setElapsed(duration)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
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

  const handleQuickStart = () => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your modern time tracking workspace
        </p>
      </div>

      {/* Work Day & Timer Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Check-In Card */}
        <CheckInCard />

        {/* Break Card */}
        <BreakCard />

        {/* Timer Card - Spans full width when no work day or single column on mobile */}
        <div className="md:col-span-1">
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
            <div className="text-6xl font-mono font-bold tracking-wider">
              {elapsed}
            </div>
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
          <div className="flex flex-col items-center gap-4">
            {runningTimer ? (
              <>
                {/* Notes editing for running timer */}
                {(!runningTimer.notes || runningTimer.notes === 'Quick start from dashboard') && !editingNotes && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingNotes(true)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Add Notes
                  </Button>
                )}
                
                {editingNotes && (
                  <div className="w-full max-w-md space-y-2">
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

                <div className="flex gap-4">
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStopTimer}
                    disabled={stopTimer.isPending}
                    className="gap-2"
                  >
                    <Square className="h-5 w-5" />
                    Stop Timer
                  </Button>
                  
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" variant="outline" className="gap-2">
                        <Clock className="h-5 w-5" />
                        {runningTimer.taskId ? 'Change Task' : 'Assign Task'}
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
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleQuickStart}
                  disabled={startTimer.isPending}
                  className="gap-2"
                >
                  <Play className="h-5 w-5" />
                  Quick Start
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2">
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
              </>
            )}
          </div>
        </CardContent>
      </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.00h</div>
            <p className="text-xs text-muted-foreground">of 8.00h target</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.00h</div>
            <p className="text-xs text-muted-foreground">of 40.00h target</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">currently tracking</p>
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
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  title="Double-click to restart timer"
                >
                  <div className="flex-1 min-w-0">
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
                    {entry.notes && entry.notes !== 'Quick start from dashboard' && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {entry.durationMinutes 
                          ? formatDurationHours(
                              `${Math.floor(entry.durationMinutes / 60).toString().padStart(2, '0')}:${Math.floor(entry.durationMinutes % 60).toString().padStart(2, '0')}:00`
                            )
                          : '—'}
                      </div>
                      {isBillingEnabled && entry.billedHours != null && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Billed: {entry.billedHours.toFixed(2)}h
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {formatDate(entry.startTime, 'MMM d, HH:mm')}
                      </div>
                    </div>
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
    </div>
  )
}
