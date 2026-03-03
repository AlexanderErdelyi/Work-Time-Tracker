import { useState, useMemo, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type ColumnOrderState,
  type ColumnSizingState,
} from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/Dialog'
import { Textarea } from '../components/ui/Textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/DropdownMenu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { 
  Trash2, 
  Edit,
  Calendar,
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Filter,
  X,
  Settings,
  GripVertical,
  RotateCcw,
  Send,
  Check,
  XCircle,
  Lock,
  Unlock,
  MoreHorizontal,
} from 'lucide-react'
import { 
  useTimeEntries, 
  useDeleteTimeEntry,
  useBulkDeleteTimeEntries,
  useUpdateTimeEntry,
  useSubmitTimeEntry,
  useApproveTimeEntry,
  useRejectTimeEntry,
  useLockTimeEntry,
  useReopenTimeEntry,
} from '../hooks/useTimeEntries'
import { useTasks } from '../hooks/useTasks'
import { useWorkspaceContext } from '../hooks/useWorkspaceContext'
import { exportApi } from '../api'
import type { TimeEntry } from '../types'
import { formatDate } from '../lib/dateUtils'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../hooks/useConfirm'
import { toast } from 'sonner'

// Default column configuration
const DEFAULT_COLUMN_ORDER: string[] = [
  'select',
  'startTime',
  'customerName',
  'projectName',
  'taskName',
  'taskProcurementNumber',
  'notes',
  'billedHours',
  'status',
  'actions',
]

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  select: true,
  startTime: true,
  customerName: true,
  projectName: true,
  taskName: true,
  taskProcurementNumber: true,
  notes: true,
  billedHours: true,
  status: true,
  actions: true,
}

const sanitizeColumnSizing = (value: ColumnSizingState): ColumnSizingState => {
  const next = { ...value }
  if (typeof next.status === 'number') {
    next.status = Math.max(70, Math.min(96, next.status))
  }
  return next
}

const formatDateForDisplay = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

const formatDateForIso = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()
  return `${year}-${month}-${day}`
}

const parseSmartDateInput = (raw: string): Date | null => {
  const value = raw.trim().toLowerCase()
  if (!value) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (value === 'h' || value === 't' || value === 'today') {
    return now
  }

  if (/^[+-]\d{1,3}$/.test(value)) {
    const deltaDays = Number(value)
    const parsed = new Date(now)
    parsed.setDate(parsed.getDate() + deltaDays)
    parsed.setHours(0, 0, 0, 0)
    return parsed
  }

  if (/^\d{1,2}$/.test(value)) {
    const day = Number(value)
    if (day < 1 || day > 31) return null
    const parsed = new Date(now.getFullYear(), now.getMonth(), day)
    if (parsed.getMonth() !== now.getMonth()) return null
    parsed.setHours(0, 0, 0, 0)
    return parsed
  }

  const parts = value.split(/[.\/-]/).filter(Boolean)
  if (parts.length >= 2 && parts.length <= 3) {
    const day = Number(parts[0])
    const month = Number(parts[1])
    let year = parts.length === 3 ? Number(parts[2]) : now.getFullYear()

    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
      return null
    }

    if (year < 100) {
      year = 2000 + year
    }

    const parsed = new Date(year, month - 1, day)
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null
    }

    parsed.setHours(0, 0, 0, 0)
    return parsed
  }

  return null
}

export function TimeEntries() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'startTime', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([ ])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null)
  const [editTaskId, setEditTaskId] = useState<number | undefined>()
  const [editTaskSearch, setEditTaskSearch] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editBilledHours, setEditBilledHours] = useState('')
  const [editError, setEditError] = useState<string | null>(null)

  // Confirm dialog hook
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm()

  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => {
    const saved = localStorage.getItem('timekeeper_columnSizing')
    return saved ? sanitizeColumnSizing(JSON.parse(saved)) : {}
  })

  // Load column visibility and order from localStorage
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const saved = localStorage.getItem('timekeeper_columnVisibility')
    return saved ? JSON.parse(saved) : DEFAULT_COLUMN_VISIBILITY
  })

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
    const saved = localStorage.getItem('timekeeper_columnOrder')
    return saved ? JSON.parse(saved) : DEFAULT_COLUMN_ORDER
  })

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('timekeeper_columnVisibility', JSON.stringify(columnVisibility))
  }, [columnVisibility])

  // Save column order to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('timekeeper_columnOrder', JSON.stringify(columnOrder))
  }, [columnOrder])

  useEffect(() => {
    localStorage.setItem('timekeeper_columnSizing', JSON.stringify(columnSizing))
  }, [columnSizing])

  const { data: entries = [], isLoading } = useTimeEntries({})
  const { data: tasks = [] } = useTasks({ isActive: true })
  const { data: workspaceContext } = useWorkspaceContext()
  const deleteEntry = useDeleteTimeEntry()
  const bulkDelete = useBulkDeleteTimeEntries()
  const updateEntry = useUpdateTimeEntry()
  const submitEntry = useSubmitTimeEntry()
  const approveEntry = useApproveTimeEntry()
  const rejectEntry = useRejectTimeEntry()
  const lockEntry = useLockTimeEntry()
  const reopenEntry = useReopenTimeEntry()
  const isBillingEnabled = localStorage.getItem('timekeeper_enableBilling') === 'true'

  const currentUserRole = workspaceContext?.currentUser.role ?? 'Member'
  const isManagerOrAdmin = currentUserRole === 'Admin' || currentUserRole === 'Manager'

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.startTime)
      const start = startDate ? new Date(startDate) : null
      const end = endDate ? new Date(endDate + 'T23:59:59') : null
      
      if (start && entryDate < start) return false
      if (end && entryDate > end) return false
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false
      return true
    })
  }, [entries, startDate, endDate, statusFilter])

  const submittedCount = useMemo(
    () => entries.filter(entry => entry.status === 'Submitted').length,
    [entries]
  )

  const filteredEditTasks = useMemo(() => {
    const term = editTaskSearch.trim().toLowerCase()
    if (!term) return tasks
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

  const resetEditDialog = () => {
    setEditDialogOpen(false)
    setEditingEntryId(null)
    setEditTaskId(undefined)
    setEditTaskSearch('')
    setEditStart('')
    setEditEnd('')
    setEditNotes('')
    setEditBilledHours('')
    setEditError(null)
  }

  const handleOpenEditDialog = (entry: TimeEntry) => {
    setEditingEntryId(entry.id)
    setEditTaskId(entry.taskId)
    setEditTaskSearch('')
    setEditStart(toLocalDateTimeInput(entry.startTime))
    setEditEnd(toLocalDateTimeInput(entry.endTime))
    setEditNotes(entry.notes || '')
    setEditBilledHours(entry.billedHours != null ? entry.billedHours.toString() : '')
    setEditError(null)
    setEditDialogOpen(true)
  }

  const handleSaveEditedEntry = () => {
    if (!editingEntryId) return
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

    updateEntry.mutate(
      {
        id: editingEntryId,
        data: {
          taskId: editTaskId,
          startTime: start.toISOString(),
          endTime: end ? end.toISOString() : undefined,
          notes: editNotes || undefined,
          billedHours: billedHoursValue,
        },
      },
      {
        onSuccess: () => {
          resetEditDialog()
        },
      }
    )
  }

  const columns = useMemo<ColumnDef<TimeEntry>[]>(
    () => [
      {
        id: 'select',
        size: 44,
        minSize: 40,
        maxSize: 56,
        enableResizing: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={row.original.isRunning}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4"
          />
        ),
      },
      {
        id: 'startTime',
        accessorKey: 'startTime',
        size: 140,
        minSize: 120,
        maxSize: 220,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Date & Time
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-2 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="font-medium whitespace-nowrap">
            {formatDate(row.original.startTime, 'dd.MM HH:mm')}
            {row.original.isRunning && (
              <Badge variant="success" className="ml-2">Running</Badge>
            )}
          </div>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        size: 84,
        minSize: 70,
        maxSize: 96,
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status

          if (status === 'Draft') {
            return <Badge variant="outline">Draft</Badge>
          }

          if (status === 'Submitted') {
            return <Badge variant="secondary">Submitted</Badge>
          }

          if (status === 'Approved') {
            return <Badge variant="success">Approved</Badge>
          }

          if (status === 'Rejected') {
            return <Badge variant="destructive">Rejected</Badge>
          }

          return <Badge variant="default">Locked</Badge>
        },
      },
      {
        id: 'customerName',
        accessorKey: 'customerName',
        size: 110,
        minSize: 90,
        maxSize: 200,
        header: 'Customer',
        cell: ({ row }) => (
          <div className="truncate" title={row.original.customerName || '—'}>{row.original.customerName || '—'}</div>
        ),
      },
      {
        id: 'projectName',
        accessorKey: 'projectName',
        size: 120,
        minSize: 100,
        maxSize: 220,
        header: 'Project',
        cell: ({ row }) => (
          <div className="truncate" title={row.original.projectName || '—'}>{row.original.projectName || '—'}</div>
        ),
      },
      {
        id: 'taskName',
        accessorKey: 'taskName',
        size: 140,
        minSize: 110,
        maxSize: 260,
        header: 'Task',
        cell: ({ row }) => (
          <div className="truncate font-medium" title={row.original.taskName || 'No task'}>{row.original.taskName || 'No task'}</div>
        ),
      },
      {
        id: 'taskProcurementNumber',
        accessorKey: 'taskProcurementNumber',
        size: 120,
        minSize: 100,
        maxSize: 220,
        header: 'Procurement',
        cell: ({ row }) => (
          <div className="truncate" title={row.original.taskProcurementNumber || '—'}>{row.original.taskProcurementNumber || '—'}</div>
        ),
      },
      {
        id: 'notes',
        accessorKey: 'notes',
        size: 280,
        minSize: 200,
        maxSize: 800,
        header: 'Notes',
        cell: ({ row }) => (
          <div className="whitespace-normal break-words text-sm text-muted-foreground leading-5" title={row.original.notes || '—'}>
            {row.original.notes || '—'}
          </div>
        ),
      },
      {
        id: 'billedHours',
        accessorKey: 'billedHours',
        size: 110,
        minSize: 90,
        maxSize: 180,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Billed Hours
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-2 h-4 w-4" />
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => {
          const billed = row.original.billedHours
          if (billed == null) return <span className="text-muted-foreground">—</span>
          return (
            <Badge variant="secondary" className="font-mono">
              {billed.toFixed(2)}h
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        size: 56,
        minSize: 52,
        maxSize: 68,
        enableResizing: false,
        cell: ({ row }) => {
          const entry = row.original

          const isMutationBusy =
            submitEntry.isPending ||
            approveEntry.isPending ||
            rejectEntry.isPending ||
            lockEntry.isPending ||
            reopenEntry.isPending ||
            deleteEntry.isPending

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isMutationBusy} title="Actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => handleOpenEditDialog(entry)}
                  disabled={entry.status === 'Locked' || isMutationBusy}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>

                {entry.status === 'Draft' || entry.status === 'Rejected' ? (
                  <DropdownMenuItem
                    onClick={() => handleSubmit(entry.id)}
                    disabled={entry.isRunning || isMutationBusy}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit
                  </DropdownMenuItem>
                ) : null}

                {entry.status === 'Submitted' && isManagerOrAdmin ? (
                  <>
                    <DropdownMenuItem onClick={() => handleApprove(entry.id)} disabled={isMutationBusy}>
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReject(entry.id)} disabled={isMutationBusy}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </DropdownMenuItem>
                  </>
                ) : null}

                {entry.status === 'Approved' && isManagerOrAdmin ? (
                  <DropdownMenuItem onClick={() => handleLock(entry.id)} disabled={isMutationBusy}>
                    <Lock className="mr-2 h-4 w-4" />
                    Lock
                  </DropdownMenuItem>
                ) : null}

                {entry.status !== 'Draft' && isManagerOrAdmin ? (
                  <DropdownMenuItem onClick={() => handleReopen(entry.id)} disabled={isMutationBusy}>
                    <Unlock className="mr-2 h-4 w-4" />
                    Reopen
                  </DropdownMenuItem>
                ) : null}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => handleDelete(entry.id)}
                  disabled={entry.isRunning || entry.status === 'Submitted' || entry.status === 'Approved' || entry.status === 'Locked' || isMutationBusy}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [
      approveEntry.isPending,
      deleteEntry.isPending,
      isManagerOrAdmin,
      lockEntry.isPending,
      rejectEntry.isPending,
      reopenEntry.isPending,
      submitEntry.isPending,
    ]
  )

  const table = useReactTable({
    data: filteredEntries,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility,
      columnOrder,
      columnSizing,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    enableRowSelection: (row) => !row.original.isRunning,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  const handleResetColumns = () => {
    setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)
    setColumnOrder(DEFAULT_COLUMN_ORDER)
    setColumnSizing({})
  }

  const handleToggleColumn = (columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }))
  }

  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetColumnId: string) => {
    if (!draggedColumn || draggedColumn === targetColumnId) return

    setColumnOrder(prevOrder => {
      const newOrder = [...prevOrder]
      const draggedIndex = newOrder.indexOf(draggedColumn)
      const targetIndex = newOrder.indexOf(targetColumnId)
      
      // Remove dragged column and insert at target position
      newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, draggedColumn)
      
      return newOrder
    })
    
    setDraggedColumn(null)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Delete Time Entry',
      description: 'Are you sure you want to delete this time entry? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    })
    if (!confirmed) {
      return
    }
    try {
      await deleteEntry.mutateAsync(id)
      toast.success('Time entry deleted successfully')
    } catch (error) {
      console.error('Failed to delete time entry:', error)
      toast.error('Failed to delete time entry. Please try again.')
    }
  }

  const handleSubmit = async (id: number) => {
    try {
      await submitEntry.mutateAsync(id)
      toast.success('Time entry submitted successfully')
    } catch (error) {
      console.error('Failed to submit time entry:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit entry')
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await approveEntry.mutateAsync(id)
      toast.success('Time entry approved successfully')
    } catch (error) {
      console.error('Failed to approve time entry:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to approve entry')
    }
  }

  const handleReject = async (id: number) => {
    const reason = prompt('Reason for rejection (optional):')?.trim() || undefined

    try {
      await rejectEntry.mutateAsync({ id, reason })
      toast.success('Time entry rejected')
    } catch (error) {
      console.error('Failed to reject time entry:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reject entry')
    }
  }

  const handleLock = async (id: number) => {
    try {
      await lockEntry.mutateAsync(id)
      toast.success('Time entry locked successfully')
    } catch (error) {
      console.error('Failed to lock time entry:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to lock entry')
    }
  }

  const handleReopen = async (id: number) => {
    try {
      await reopenEntry.mutateAsync(id)
      toast.success('Time entry reopened successfully')
    } catch (error) {
      console.error('Failed to reopen time entry:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reopen entry')
    }
  }

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(key => filteredEntries[parseInt(key)].id)
    
    if (selectedIds.length === 0) return
    
    const confirmed = await confirm({
      title: 'Delete Time Entries',
      description: `Are you sure you want to delete ${selectedIds.length} time entries? This action cannot be undone.`,
      confirmText: 'Delete All',
      variant: 'destructive',
    })
    if (!confirmed) {
      return
    }

    try {
      await bulkDelete.mutateAsync(selectedIds)
      setRowSelection({})
      toast.success(`Successfully deleted ${selectedIds.length} time entries`)
    } catch (error) {
      console.error('Failed to delete time entries:', error)
      toast.error('Failed to delete time entries. Please try again.')
    }
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setStartDateInput('')
    setEndDateInput('')
  }

  const applySmartDate = (value: string, target: 'start' | 'end') => {
    const parsed = parseSmartDateInput(value)

    if (!value.trim()) {
      if (target === 'start') {
        setStartDate('')
        setStartDateInput('')
      } else {
        setEndDate('')
        setEndDateInput('')
      }
      return
    }

    if (!parsed) {
      return
    }

    const formattedDisplay = formatDateForDisplay(parsed)
    const formattedIso = formatDateForIso(parsed)

    if (target === 'start') {
      setStartDate(formattedIso)
      setStartDateInput(formattedDisplay)
      return
    }

    setEndDate(formattedIso)
    setEndDateInput(formattedDisplay)
  }

  const handleExport = async () => {
    try {
      await exportApi.exportExcel({})
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const totalHours = useMemo(() => {
    const totalMinutes = filteredEntries.reduce((sum, entry) => {
      return sum + (entry.durationMinutes || 0)
    }, 0)
    return (totalMinutes / 60).toFixed(2)
  }, [filteredEntries])

  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Entries</h1>
          <p className="text-muted-foreground">
            View and manage all time entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Columns
          </Button>
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedCount})
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-purple-500/50 bg-purple-500/10">
        <CardContent className="flex items-start gap-3 pt-6">
          <Clock className="h-5 w-5 mt-0.5 text-purple-600" />
          <div>
            <p className="font-medium">Tip: Use the timer to create entries</p>
            <p className="text-sm text-muted-foreground mt-1">
              Go to the Dashboard to start the timer for automatic time tracking. Entries appear here once the timer is stopped.
            </p>
          </div>
        </CardContent>
      </Card>

      {isManagerOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval Queue</CardTitle>
            <CardDescription>
              Submitted entries waiting for review
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Badge variant="secondary">{submittedCount} Submitted</Badge>
            <Button
              variant="outline"
              onClick={() => setStatusFilter('Submitted')}
              disabled={submittedCount === 0}
            >
              Review Queue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Date Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter by Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="startDate" className="text-sm font-medium mb-2 block">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="text"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    onBlur={(e) => applySmartDate(e.target.value, 'start')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applySmartDate((e.target as HTMLInputElement).value, 'start')
                      }
                    }}
                    placeholder="h, -1, +7, 24, 24.02, 24.02.2026"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor="endDate" className="text-sm font-medium mb-2 block">
                  End Date
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="text"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    onBlur={(e) => applySmartDate(e.target.value, 'end')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applySmartDate((e.target as HTMLInputElement).value, 'end')
                      }
                    }}
                    placeholder="h, -1, +7, 24, 24.02, 24.02.2026"
                    className="pl-9"
                  />
                </div>
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="gap-2 mt-7"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
              <div className="flex-1">
                <label htmlFor="statusFilter" className="text-sm font-medium mb-2 block">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="statusFilter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(startDate || endDate || statusFilter !== 'all') && (
              <p className="text-sm text-muted-foreground mt-3">
                Showing {filteredEntries.length} of {entries.length} entries
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Settings */}
      {showColumnSettings && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Column Settings</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetColumns}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Default
              </Button>
            </div>
            <CardDescription>
              Toggle visibility, drag to reorder, and resize columns from table header borders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Column Visibility */}
            <div>
              <h4 className="text-sm font-medium mb-3">Column Visibility</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {table.getAllColumns()
                  .filter(col => col.id !== 'select' && col.id !== 'actions')
                  .map(column => (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={columnVisibility[column.id] !== false}
                        onChange={() => handleToggleColumn(column.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">
                        {column.id === 'startTime' && 'Date & Time'}
                        {column.id === 'customerName' && 'Customer'}
                        {column.id === 'projectName' && 'Project'}
                        {column.id === 'taskName' && 'Task'}
                        {column.id === 'taskProcurementNumber' && 'Procurement'}
                        {column.id === 'status' && 'Status'}
                        {column.id === 'notes' && 'Notes'}
                        {column.id === 'billedHours' && 'Billed Hours'}
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            {/* Column Order */}
            <div>
              <h4 className="text-sm font-medium mb-3">Column Order</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Drag and drop to reorder columns
              </p>
              <div className="flex flex-wrap gap-2">
                {columnOrder
                  .filter(colId => colId !== 'select' && colId !== 'actions')
                  .filter(colId => columnVisibility[colId] !== false)
                  .map((columnId, index) => (
                    <div
                      key={columnId}
                      draggable
                      onDragStart={() => handleDragStart(columnId)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(columnId)}
                      className={`
                        flex items-center gap-2 px-3 py-2 bg-accent rounded-md cursor-move
                        transition-all hover:bg-accent/70 border
                        ${draggedColumn === columnId ? 'opacity-50' : ''}
                      `}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {columnId === 'startTime' && 'Date & Time'}
                        {columnId === 'customerName' && 'Customer'}
                        {columnId === 'projectName' && 'Project'}
                        {columnId === 'taskName' && 'Task'}
                        {columnId === 'taskProcurementNumber' && 'Procurement'}
                        {columnId === 'status' && 'Status'}
                        {columnId === 'notes' && 'Notes'}
                        {columnId === 'billedHours' && 'Billed Hours'}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {index + 1}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Time Entries</CardTitle>
              <CardDescription>
                {filteredEntries.length} entries • Total: <span className="font-mono font-semibold">{totalHours}h</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entries..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 w-[260px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading entries...</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No time entries yet</p>
              <p className="text-muted-foreground mb-4">
                Start tracking time from the Dashboard to see entries here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full min-w-[920px] table-fixed">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b bg-muted/50">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="relative h-10 px-2 text-left align-middle text-xs font-medium text-muted-foreground"
                            style={{ width: header.getSize() }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}

                            {header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none ${
                                  header.column.getIsResizing()
                                    ? 'bg-primary'
                                    : 'bg-border/60 hover:bg-primary/60'
                                }`}
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-2 py-2 align-middle text-sm" style={{ width: cell.column.getSize() }}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of{' '}
                  {table.getPageCount()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          resetEditDialog()
          return
        }
        setEditDialogOpen(open)
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
              <Button variant="outline" onClick={resetEditDialog}>Cancel</Button>
              <Button onClick={handleSaveEditedEntry} disabled={updateEntry.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onOpenChange={handleCancel}
        onConfirm={handleConfirm}
        title={confirmState.title}
        description={confirmState.description}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
    </div>
  )
}
