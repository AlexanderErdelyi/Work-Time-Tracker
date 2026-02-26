import { lazy, Suspense, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { Download, Calendar, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTimeEntries } from '../hooks/useTimeEntries'
import { useCustomers } from '../hooks/useCustomers'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { exportApi } from '../api'
import { formatDate } from '../lib/dateUtils'
import { startOfWeek, parseISO, format } from 'date-fns'

const ReportsCharts = lazy(() => import('../components/Reports/ReportsCharts').then(module => ({ default: module.ReportsCharts })))

export function Reports() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [customerId, setCustomerId] = useState<number | undefined>(undefined)
  const [projectId, setProjectId] = useState<number | undefined>(undefined)
  const [taskId, setTaskId] = useState<number | undefined>(undefined)

  const { data: customers = [] } = useCustomers({ isActive: true })
  const { data: projects = [] } = useProjects({ 
    isActive: true,
    customerId: customerId || undefined
  })
  const { data: tasks = [] } = useTasks({ 
    isActive: true,
    projectId: projectId || undefined
  })

  const { data: entries = [] } = useTimeEntries({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    customerId: customerId || undefined,
    projectId: projectId || undefined,
    taskId: taskId || undefined,
  })

  // Calculate total hours per customer
  const customerData = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      const customer = entry.customerName || 'Unknown'
      if (!acc[customer]) {
        acc[customer] = 0
      }
      const hours = (entry.durationMinutes || 0) / 60
      acc[customer] += hours
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([name, hours]) => ({
        name,
        hours: parseFloat(hours.toFixed(2)),
      }))
      .sort((a, b) => b.hours - a.hours)
  }, [entries])

  // Calculate total hours per project
  const projectData = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      const project = entry.projectName || 'Unknown'
      if (!acc[project]) {
        acc[project] = 0
      }
      const hours = (entry.durationMinutes || 0) / 60
      acc[project] += hours
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([name, hours]) => ({
        name,
        hours: parseFloat(hours.toFixed(2)),
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10) // Top 10 projects
  }, [entries])

  // Calculate total hours per task
  const taskData = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      const task = entry.taskName || 'Unknown'
      if (!acc[task]) {
        acc[task] = 0
      }
      const hours = (entry.durationMinutes || 0) / 60
      acc[task] += hours
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([name, hours]) => ({
        name,
        hours: parseFloat(hours.toFixed(2)),
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10) // Top 10 tasks
  }, [entries])

  // Calculate billable vs non-billable hours
  const billableData = useMemo(() => {
    const billable = entries.reduce((sum, entry) => {
      return sum + (entry.billedHours || 0)
    }, 0)
    
    const total = entries.reduce((sum, entry) => {
      return sum + (entry.durationMinutes || 0)
    }, 0) / 60
    
    const nonBillable = total - billable

    return [
      { name: 'Billable', hours: parseFloat(billable.toFixed(2)) },
      { name: 'Non-Billable', hours: parseFloat(nonBillable.toFixed(2)) },
    ]
  }, [entries])

  // Calculate daily hours
  const dailyData = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      const date = formatDate(entry.startTime, 'MMM d')
      if (!acc[date]) {
        acc[date] = 0
      }
      const hours = (entry.durationMinutes || 0) / 60
      acc[date] += hours
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([date, hours]) => ({
        date,
        hours: parseFloat(hours.toFixed(2)),
      }))
      .slice(-30) // Last 30 days
  }, [entries])

  // Calculate weekly hours
  const weeklyData = useMemo(() => {
    if (!startDate || !endDate || entries.length === 0) return []
    
    const grouped = entries.reduce((acc, entry) => {
      const entryDate = parseISO(entry.startTime)
      const weekStart = startOfWeek(entryDate, { weekStartsOn: 1 })
      const weekLabel = format(weekStart, 'MMM d')
      
      if (!acc[weekLabel]) {
        acc[weekLabel] = 0
      }
      const hours = (entry.durationMinutes || 0) / 60
      acc[weekLabel] += hours
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([date, hours]) => ({
        date,
        hours: parseFloat(hours.toFixed(2)),
      }))
  }, [entries, startDate, endDate])

  const hasChartData = customerData.length > 0 || projectData.length > 0 || dailyData.length > 0 || taskData.length > 0

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalMinutes = entries.reduce((sum, entry) => {
      return sum + (entry.durationMinutes || 0)
    }, 0)

    const totalHours = totalMinutes / 60
    const avgHoursPerDay = dailyData.length > 0 
      ? totalHours / dailyData.length 
      : 0

    return {
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalEntries: entries.length,
      avgHoursPerDay: parseFloat(avgHoursPerDay.toFixed(2)),
      uniqueCustomers: new Set(entries.map(e => e.customerName)).size,
      uniqueProjects: new Set(entries.map(e => e.projectName)).size,
    }
  }, [entries, dailyData])

  const handleExport = async () => {
    try {
      await exportApi.exportExcel({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: customerId || undefined,
        projectId: projectId || undefined,
        taskId: taskId || undefined,
      })
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Analyze your time tracking data
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter reports by date range and project details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select
                value={customerId?.toString() || ''}
                onValueChange={(value) => {
                  setCustomerId(value ? parseInt(value) : undefined)
                  setProjectId(undefined)
                  setTaskId(undefined)
                }}
              >
                <SelectTrigger id="customer">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={projectId?.toString() || ''}
                onValueChange={(value) => {
                  setProjectId(value ? parseInt(value) : undefined)
                  setTaskId(undefined)
                }}
                disabled={!customerId}
              >
                <SelectTrigger id="project" disabled={!customerId}>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task">Task</Label>
              <Select
                value={taskId?.toString() || ''}
                onValueChange={(value) => setTaskId(value ? parseInt(value) : undefined)}
                disabled={!projectId}
              >
                <SelectTrigger id="task" disabled={!projectId}>
                  <SelectValue placeholder="All Tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Tasks</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                  setCustomerId(undefined)
                  setProjectId(undefined)
                  setTaskId(undefined)
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}</div>
            <p className="text-xs text-muted-foreground">hours tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entries</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">time entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg/Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgHoursPerDay}</div>
            <p className="text-xs text-muted-foreground">hours per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueProjects}</div>
            <p className="text-xs text-muted-foreground">active projects</p>
          </CardContent>
        </Card>
      </div>

      {hasChartData ? (
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Charts</CardTitle>
                <CardDescription>Loading report visualizations...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground py-8">Loading charts...</p>
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => navigate('/entries')}>
                    View All Time Entries
                  </Button>
                </div>
              </CardContent>
            </Card>
          }
        >
          <ReportsCharts
            customerData={customerData}
            projectData={projectData}
            dailyData={dailyData}
            weeklyData={weeklyData}
            taskData={taskData}
            billableData={billableData}
          />
        </Suspense>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Report Data</CardTitle>
            <CardDescription>There are no tracked entries in the selected date range.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Update the date range above or clear filters to view all available data.
            </p>
            <div className="flex flex-wrap gap-2">
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                >
                  Clear Date Filters
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/entries')}>
                View All Time Entries
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
