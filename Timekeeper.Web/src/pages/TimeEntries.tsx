import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { 
  useTimeEntries, 
  useDeleteTimeEntry 
} from '../hooks/useTimeEntries'
import { exportApi } from '../api'
import type { TimeEntry } from '../types'
import { formatDate } from '../lib/dateUtils'

export function TimeEntries() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'startTime', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const { data: entries = [], isLoading } = useTimeEntries({})
  const deleteEntry = useDeleteTimeEntry()

  const columns = useMemo<ColumnDef<TimeEntry>[]>(
    () => [
      {
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
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <div className="max-w-[150px] truncate">{row.original.customerName || '—'}</div>
        ),
      },
      {
        accessorKey: 'projectName',
        header: 'Project',
        cell: ({ row }) => (
          <div className="max-w-[150px] truncate">{row.original.projectName || '—'}</div>
        ),
      },
      {
        accessorKey: 'taskName',
        header: 'Task',
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate font-medium">{row.original.taskName || 'No task'}</div>
        ),
      },
      {
        accessorKey: 'durationMinutes',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Duration
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
          const minutes = row.original.durationMinutes || 0
          const hours = Math.floor(minutes / 60)
          const mins = Math.floor(minutes % 60)
          return (
            <Badge variant="outline" className="font-mono">
              {hours}h {mins}m
            </Badge>
          )
        },
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => (
          <div className="max-w-[300px] truncate text-sm text-muted-foreground">
            {row.original.notes || '—'}
          </div>
        ),
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
    data: entries,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
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

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this time entry?')) {
      try {
        await deleteEntry.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete time entry:', error)
      }
    }
  }

  const handleExport = async () => {
    try {
      await exportApi.exportExcel({})
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const totalHours = useMemo(() => {
    const totalMinutes = entries.reduce((sum, entry) => {
      return sum + (entry.durationMinutes || 0)
    }, 0)
    return (totalMinutes / 60).toFixed(2)
  }, [entries])

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Time Entries</CardTitle>
              <CardDescription>
                {entries.length} entries • Total: <span className="font-mono font-semibold">{totalHours}h</span>
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
