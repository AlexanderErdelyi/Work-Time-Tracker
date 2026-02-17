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
} from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { 
  Trash2, 
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
} from 'lucide-react'
import { 
  useTimeEntries, 
  useDeleteTimeEntry,
  useBulkDeleteTimeEntries 
} from '../hooks/useTimeEntries'
import { exportApi } from '../api'
import type { TimeEntry } from '../types'
import { formatDate } from '../lib/dateUtils'

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
  actions: true,
}

export function TimeEntries() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'startTime', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([ ])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)

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

  const { data: entries = [], isLoading } = useTimeEntries({})
  const deleteEntry = useDeleteTimeEntry()
  const bulkDelete = useBulkDeleteTimeEntries()

  // Check if billing is enabled
  const isBillingEnabled = localStorage.getItem('timekeeper_enableBilling') === 'true'

  // Filter entries by date range
  const filteredEntries = useMemo(() => {
    if (!startDate && !endDate) return entries
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.startTime)
      const start = startDate ? new Date(startDate) : null
      const end = endDate ? new Date(endDate + 'T23:59:59') : null
      
      if (start && entryDate < start) return false
      if (end && entryDate > end) return false
      return true
    })
  }, [entries, startDate, endDate])

  const columns = useMemo<ColumnDef<TimeEntry>[]>(
    () => [
      {
        id: 'select',
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
          <div className="font-medium">
            {formatDate(row.original.startTime, 'MMM d, yyyy HH:mm')}
            {row.original.isRunning && (
              <Badge variant="success" className="ml-2">Running</Badge>
            )}
          </div>
        ),
      },
      {
        id: 'customerName',
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <div className="max-w-[150px] truncate">{row.original.customerName || '—'}</div>
        ),
      },
      {
        id: 'projectName',
        accessorKey: 'projectName',
        header: 'Project',
        cell: ({ row }) => (
          <div className="max-w-[150px] truncate">{row.original.projectName || '—'}</div>
        ),
      },
      {
        id: 'taskName',
        accessorKey: 'taskName',
        header: 'Task',
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate font-medium">{row.original.taskName || 'No task'}</div>
        ),
      },
      {
        id: 'taskProcurementNumber',
        accessorKey: 'taskProcurementNumber',
        header: 'Procurement',
        cell: ({ row }) => (
          <div className="max-w-[150px] truncate">{row.original.taskProcurementNumber || '—'}</div>
        ),
      },
      {
        id: 'notes',
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => (
          <div className="max-w-[300px] truncate text-sm text-muted-foreground">
            {row.original.notes || '—'}
          </div>
        ),
      },
      {
        id: 'billedHours',
        accessorKey: 'billedHours',
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
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(row.original.id)}
              disabled={row.original.isRunning}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
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
    },
    enableRowSelection: (row) => !row.original.isRunning,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
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
    if (confirm('Are you sure you want to delete this time entry?')) {
      try {
        await deleteEntry.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete time entry:', error)
      }
    }
  }

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(key => filteredEntries[parseInt(key)].id)
    
    if (selectedIds.length === 0) return
    
    if (confirm(`Are you sure you want to delete ${selectedIds.length} time entries?`)) {
      try {
        await bulkDelete.mutateAsync(selectedIds)
        setRowSelection({})
      } catch (error) {
        console.error('Failed to delete time entries:', error)
      }
    }
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
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
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start date"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="endDate" className="text-sm font-medium mb-2 block">
                  End Date
                </label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End date"
                />
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
            </div>
            {(startDate || endDate) && (
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
              Toggle column visibility and drag to reorder columns
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
                  className="pl-8 w-[300px]"
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
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b bg-muted/50">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
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
                          <td key={cell.id} className="p-4 align-middle">
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
    </div>
  )
}
