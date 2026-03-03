import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Clock, Edit, Trash2, RefreshCw } from 'lucide-react'
import { formatDurationHours } from '../../lib/durationUtils'
import { formatDate } from '../../lib/dateUtils'

type RecentEntriesMode = 'scroll' | 'pagination'

interface TimeEntry {
  id: number
  taskId?: number
  taskName?: string
  projectName?: string
  customerName?: string
  startTime: string
  endTime?: string
  notes?: string
  durationMinutes?: number
  billedHours?: number
  isRunning: boolean
  totalPausedSeconds: number
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Locked'
  isPaused: boolean
  createdAt: string
}

interface RecentEntriesListProps {
  entries: TimeEntry[]
  mode: RecentEntriesMode
  currentPage: number
  totalPages: number
  isBillingEnabled: boolean
  onModeChange: (mode: RecentEntriesMode) => void
  onPageChange: (page: number) => void
  onEditEntry: (entry: TimeEntry) => void
  onDeleteEntry: (id: number) => void
  onRestartTimer: (id: number) => void
  isDeleting?: boolean
}

export function RecentEntriesList({
  entries,
  mode,
  currentPage,
  totalPages,
  isBillingEnabled,
  onModeChange,
  onPageChange,
  onEditEntry,
  onDeleteEntry,
  onRestartTimer,
  isDeleting = false,
}: RecentEntriesListProps) {
  return (
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
              value={mode}
              onChange={(e) => onModeChange(e.target.value as RecentEntriesMode)}
            >
              <option value="scroll">Scrolling</option>
              <option value="pagination">Pagination</option>
            </select>
            <Badge variant="secondary">{entries.length} entries</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className={mode === 'scroll' ? 'flex-1 min-h-0 overflow-y-auto' : 'flex-1 min-h-0'}>
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No recent entries yet. Start tracking time to see your activity here!
          </p>
        ) : (
          <div className="space-y-2 pr-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                onDoubleClick={() => onRestartTimer(entry.id)}
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
                      onEditEntry(entry)
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
                      onDeleteEntry(entry.id)
                    }}
                    disabled={isDeleting || entry.isRunning}
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
                      onRestartTimer(entry.id)
                    }}
                    title="Restart timer"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {mode === 'pagination' && totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
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
  )
}
