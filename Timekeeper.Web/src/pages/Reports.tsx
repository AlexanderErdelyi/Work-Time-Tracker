import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Download, Calendar, TrendingUp } from 'lucide-react'
import { useTimeEntries } from '../hooks/useTimeEntries'
import { exportApi } from '../api'
import { formatDate } from '../lib/dateUtils'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0']

export function Reports() {
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

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Time Period</CardTitle>
          <CardDescription>Filter reports by date range</CardDescription>
        </CardHeader>
        <CardContent>
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Time by Customer</CardTitle>
            <CardDescription>Hours tracked per customer</CardDescription>
          </CardHeader>
          <CardContent>
            {customerData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={customerData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="hours"
                  >
                    {customerData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Projects</CardTitle>
            <CardDescription>Hours tracked per project</CardDescription>
          </CardHeader>
          <CardContent>
            {projectData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#667eea" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Hours Trend</CardTitle>
          <CardDescription>Hours tracked over time (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#667eea"
                  strokeWidth={2}
                  dot={{ fill: '#667eea' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
