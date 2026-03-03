import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Search } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import type { TaskItem } from '../../types'

interface ManualEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: TaskItem[]
  onCreateEntry: (data: {
    taskId?: number
    startTime: string
    endTime?: string
    billedHours?: number
    notes?: string
  }) => void
  isCreating?: boolean
}

export function ManualEntryDialog({
  open,
  onOpenChange,
  tasks,
  onCreateEntry,
  isCreating = false,
}: ManualEntryDialogProps) {
  const [manualTaskId, setManualTaskId] = useState<number | undefined>()
  const [manualTaskSearch, setManualTaskSearch] = useState('')
  const [manualStart, setManualStart] = useState('')
  const [manualEnd, setManualEnd] = useState('')
  const [manualEntryMode, setManualEntryMode] = useState<'timeRange' | 'billedOnly'>('timeRange')
  const [manualBilledHours, setManualBilledHours] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualFieldErrors, setManualFieldErrors] = useState<{ start?: string; end?: string }>({})

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

  const resetDialog = () => {
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
    if (open && !manualStart && !manualEnd) {
      resetDialog()
    }
  }, [open, manualStart, manualEnd])

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

    onCreateEntry({
      taskId: manualTaskId,
      startTime: start.toISOString(),
      endTime: endIso,
      billedHours: billedHoursValue,
      notes: manualNotes || undefined,
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    resetDialog()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateManualEntry} disabled={isCreating}>
              Save Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
