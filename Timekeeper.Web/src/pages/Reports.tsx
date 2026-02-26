import { lazy, Suspense, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Download, Calendar, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTimeEntries } from '../hooks/useTimeEntries'
import { exportApi } from '../api'
import { formatDate } from '../lib/dateUtils'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays, eachDayOfInterval, parseISO, differenceInCalendarDays } from 'date-fns'

const ReportsCharts = lazy(() => import('../components/Reports/ReportsCharts').then(module => ({ default: module.ReportsCharts })))

export function Reports() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: entries = [] } = useTimeEntries({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
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

  // Calculate daily hours
  const dailyData = useMemo(() => {
    // Determine the date range
    let rangeStart: Date
    let rangeEnd: Date
    
    if (startDate && endDate) {
      // Use selected range
      rangeStart = startOfDay(parseISO(startDate))
      rangeEnd = endOfDay(parseISO(endDate))
    } else if (startDate) {
      // Start date only - go to today
      rangeStart = startOfDay(parseISO(startDate))
      rangeEnd = endOfDay(new Date())
    } else if (endDate) {
      // End date only - show 30 days before end date
      rangeEnd = endOfDay(parseISO(endDate))
      rangeStart = startOfDay(subDays(rangeEnd, 29))
    } else if (entries.length > 0) {
      // No date filters - use last 30 calendar days from the most recent entry
      const latestEntryDate = new Date(Math.max(...entries.map(e => new Date(e.startTime).getTime())))
      rangeEnd = endOfDay(latestEntryDate)
      rangeStart = startOfDay(subDays(rangeEnd, 29))
    } else {
      // No entries at all
      rangeEnd = endOfDay(new Date())
      rangeStart = startOfDay(subDays(rangeEnd, 29))
    }
    
    // Group entries by date
    const grouped = entries.reduce((acc, entry) => {
      const dateKey = formatDate(entry.startTime, 'yyyy-MM-dd')
      if (!acc[dateKey]) {
        acc[dateKey] = 0
      }
      const hours = (entry.durationMinutes || 0) / 60
      acc[dateKey] += hours
      return acc
    }, {} as Record<string, number>)
    
    // Fill in all days in the range
    const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
    
    return allDays.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const displayDate = format(day, 'MMM d')
      return {
        date: displayDate,
        hours: parseFloat((grouped[dateKey] || 0).toFixed(2)),
      }
    })
  }, [entries, startDate, endDate])

  const hasChartData = customerData.length > 0 || projectData.length > 0 || dailyData.length > 0

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalMinutes = entries.reduce((sum, entry) => {
      return sum + (entry.durationMinutes || 0)
    }, 0)

    const totalHours = totalMinutes / 60
    
    // Calculate average using total calendar days in range (not just days with entries)
    let totalDaysInRange = 1 // Default to 1 to avoid division by zero
    if (startDate && endDate) {
      const start = parseISO(startDate)
      const end = parseISO(endDate)
      totalDaysInRange = Math.max(1, differenceInCalendarDays(end, start) + 1)
    } else if (startDate) {
      const start = parseISO(startDate)
      const today = new Date()
      totalDaysInRange = Math.max(1, differenceInCalendarDays(today, start) + 1)
    } else if (endDate) {
      totalDaysInRange = 30 // Show 30 days before end date
    } else {
      totalDaysInRange = dailyData.length // Use the actual range calculated in dailyData
    }
    
    const avgHoursPerDay = totalHours / totalDaysInRange

    return {
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalEntries: entries.length,
      avgHoursPerDay: parseFloat(avgHoursPerDay.toFixed(2)),
      uniqueCustomers: new Set(entries.map(e => e.customerName)).size,
      uniqueProjects: new Set(entries.map(e => e.projectName)).size,
    }
  }, [entries, dailyData, startDate, endDate])

  const handleExport = async () => {
    try {
      await exportApi.exportExcel({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please try again.')
    }
  }

  const setDateRange = (start: Date, end: Date) => {
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }

  const handleToday = () => {
    const today = new Date()
    setDateRange(startOfDay(today), endOfDay(today))
  }

  const handleThisWeek = () => {
    const today = new Date()
    setDateRange(startOfWeek(today, { weekStartsOn: 1 }), endOfWeek(today, { weekStartsOn: 1 }))
  }

  const handleThisMonth = () => {
    const today = new Date()
    setDateRange(startOfMonth(today), endOfMonth(today))
  }

  const handleLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1)
    setDateRange(startOfMonth(lastMonth), endOfMonth(lastMonth))
  }

  const handleLast30Days = () => {
    const today = new Date()
    const thirtyDaysAgo = subDays(today, 29) // 29 days ago + today = 30 days
    setDateRange(startOfDay(thirtyDaysAgo), endOfDay(today))
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

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Time Period</CardTitle>
          <CardDescription>Filter reports by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Date Shortcuts */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleThisWeek}
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleThisMonth}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLastMonth}
              >
                Last Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLast30Days}
              >
                Last 30 Days
              </Button>
            </div>
            
            {/* Date Range Inputs */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                >
                  Clear
                </Button>
              </div>
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
