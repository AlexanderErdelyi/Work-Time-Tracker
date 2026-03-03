import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Search } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import type { TaskItem } from '../../types'

interface EditEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: TaskItem[]
  entry: {
    id: number
    taskId?: number
    startTime: string
    endTime?: string
    notes?: string
    billedHours?: number
  } | null
  onSaveEntry: (data: {
    taskId?: number
    startTime: string
    endTime?: string
    billedHours?: number
    notes?: string
  }) => void
  isSaving?: boolean
  isBillingEnabled: boolean
}

export function EditEntryDialog({
  open,
  onOpenChange,
  tasks,
  entry,
  onSaveEntry,
  isSaving = false,
  isBillingEnabled,
}: EditEntryDialogProps) {
  const [editTaskId, setEditTaskId] = useState<number | undefined>()
  const [editTaskSearch, setEditTaskSearch] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editBilledHours, setEditBilledHours] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

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

  // Populate fields when entry changes
  useEffect(() => {
    if (entry && open) {
      setEditTaskId(entry.taskId)
      setEditTaskSearch('')
      setEditStart(toLocalDateTimeInput(entry.startTime))
      setEditEnd(toLocalDateTimeInput(entry.endTime))
      setEditNotes(entry.notes || '')
      setEditBilledHours(entry.billedHours != null ? entry.billedHours.toString() : '')
      setEditError(null)
    }
  }, [entry, open])

  const resetDialog = () => {
    setEditTaskId(undefined)
    setEditTaskSearch('')
    setEditStart('')
    setEditEnd('')
    setEditNotes('')
    setEditBilledHours('')
    setEditError(null)
  }

  const handleSaveEditedEntry = () => {
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

    onSaveEntry({
      taskId: editTaskId,
      startTime: start.toISOString(),
      endTime: end ? end.toISOString() : undefined,
      billedHours: billedHoursValue,
      notes: editNotes || undefined,
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    resetDialog()
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          handleClose()
          return
        }
        onOpenChange(open)
      }}
    >
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
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSaveEditedEntry} disabled={isSaving}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
