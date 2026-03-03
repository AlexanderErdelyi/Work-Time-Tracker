import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Play, Square, Clock, Search, Edit, Pause } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { TaskItem } from '../../types'

interface RunningTimer {
  id: number
  taskId?: number
  taskName?: string
  customerName?: string
  projectName?: string
  notes?: string
  isPaused: boolean
}

interface TimerControlsProps {
  runningTimer: RunningTimer | null | undefined
  tasks: TaskItem[]
  onStartTimer: (taskId: number, notes: string) => void
  onQuickStart: () => void
  onStopTimer: () => void
  onPauseTimer: (id: number) => void
  onResumeFromPause: (id: number) => void
  onUpdateRunningNotes: (notes: string) => void
  onAssignTaskToRunningTimer: (taskId: number | undefined, notes: string) => void
  isStartTimerPending?: boolean
  isStopTimerPending?: boolean
  isPauseTimerPending?: boolean
  isResumeFromPausePending?: boolean
  isUpdateTimerPending?: boolean
}

export function TimerControls({
  runningTimer,
  tasks,
  onStartTimer,
  onQuickStart,
  onStopTimer,
  onPauseTimer,
  onResumeFromPause,
  onUpdateRunningNotes,
  onAssignTaskToRunningTimer,
  isStartTimerPending = false,
  isStopTimerPending = false,
  isPauseTimerPending = false,
  isResumeFromPausePending = false,
  isUpdateTimerPending = false,
}: TimerControlsProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [runningNotes, setRunningNotes] = useState('')
  const isEditingNotesRef = useRef(false)

  // Populate dialog when opening for running timer.
  // Depends on runningTimer?.id (not full object) so 1-second refetch never resets user input.
  useEffect(() => {
    if (dialogOpen && runningTimer) {
      if (runningTimer.taskId) {
        setSelectedTaskId(runningTimer.taskId)
      }
      setNotes(runningTimer.notes || '')
    }
  }, [dialogOpen, runningTimer?.id])

  // Sync notes from server only when timer ID or notes change.
  // Uses isEditingNotesRef (not editingNotes state) to avoid stale-closure race condition
  // where the 1-second refetch resets notes the user is actively typing.
  useEffect(() => {
    if (isEditingNotesRef.current) return
    setRunningNotes(runningTimer?.notes || '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runningTimer?.id, runningTimer?.notes])

  const filteredTasks = tasks.filter(task => {
    if (!searchTerm) return true
    const lower = searchTerm.toLowerCase()
    return (
      task.name?.toLowerCase().includes(lower) ||
      task.projectName?.toLowerCase().includes(lower) ||
      task.customerName?.toLowerCase().includes(lower)
    )
  })

  const handleStartTimer = () => {
    if (!selectedTaskId) return
    onStartTimer(selectedTaskId, notes)
    setDialogOpen(false)
    setSelectedTaskId(undefined)
    setSearchTerm('')
    setNotes('')
  }

  const handleSelectTask = (taskId: number) => {
    setSelectedTaskId(taskId)
  }

  const handleAssignTaskToRunningTimer = () => {
    onAssignTaskToRunningTimer(selectedTaskId, notes)
    setDialogOpen(false)
    setSelectedTaskId(undefined)
    setSearchTerm('')
    setNotes('')
  }

  const handleUpdateRunningNotes = () => {
    onUpdateRunningNotes(runningNotes)
    isEditingNotesRef.current = false
    setEditingNotes(false)
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {runningTimer ? (
        <>
          <div className="w-full max-w-2xl min-h-[108px]">
            {!editingNotes && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { isEditingNotesRef.current = true; setEditingNotes(true) }}
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
                      isEditingNotesRef.current = false
                      setEditingNotes(false)
                      setRunningNotes(runningTimer.notes || '')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdateRunningNotes}
                    disabled={isUpdateTimerPending}
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
                onClick={() => onResumeFromPause(runningTimer.id)}
                disabled={isResumeFromPausePending}
                className="h-12 w-full gap-2 whitespace-nowrap"
              >
                <Play className="h-5 w-5" />
                Resume
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                onClick={() => onPauseTimer(runningTimer.id)}
                disabled={isPauseTimerPending}
                className="h-12 w-full gap-2 whitespace-nowrap"
              >
                <Pause className="h-5 w-5" />
                Pause
              </Button>
            )}
            
            <Button
              size="lg"
              variant="destructive"
              onClick={onStopTimer}
              disabled={isStopTimerPending}
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

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      placeholder="Describe what you're working on..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
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
                      onClick={handleAssignTaskToRunningTimer}
                      disabled={isUpdateTimerPending}
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
              onClick={onQuickStart}
              disabled={isStartTimerPending}
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
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
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

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <Textarea
                      placeholder="Describe what you're working on..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
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
                      disabled={!selectedTaskId || isStartTimerPending}
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
  )
}
