import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { useState } from 'react'
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

interface ChartDataItem {
  name: string
  hours: number
}

interface DailyDataItem {
  date: string
  hours: number
}

interface ReportsChartsProps {
  customerData: ChartDataItem[]
  projectData: ChartDataItem[]
  dailyData: DailyDataItem[]
  weeklyData: DailyDataItem[]
  taskData: ChartDataItem[]
  billableData: ChartDataItem[]
}

export function ReportsCharts({ customerData, projectData, dailyData, weeklyData, taskData, billableData }: ReportsChartsProps) {
  const [showWeekly, setShowWeekly] = useState(false)
  const trendData = showWeekly ? weeklyData : dailyData
  const trendLabel = showWeekly ? 'Weekly Hours Trend' : 'Daily Hours Trend'
  const trendDescription = showWeekly ? 'Hours tracked per week' : 'Hours tracked over time (last 30 days)'
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billable vs. Non-Billable</CardTitle>
            <CardDescription>Comparison of billable and non-billable hours</CardDescription>
          </CardHeader>
          <CardContent>
            {billableData.length === 0 || billableData.every(d => d.hours === 0) ? (
              <p className="text-center text-muted-foreground py-8">
                No data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={billableData}
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
                    <Cell fill="#43e97b" />
                    <Cell fill="#f093fb" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Tasks</CardTitle>
            <CardDescription>Hours tracked per task</CardDescription>
          </CardHeader>
          <CardContent>
            {taskData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#764ba2" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{trendLabel}</CardTitle>
              <CardDescription>{trendDescription}</CardDescription>
            </div>
            {weeklyData.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWeekly(!showWeekly)}
              >
                {showWeekly ? 'Show Daily' : 'Show Weekly'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No data available
            </p>
          ) : showWeekly ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
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
    </>
  )
}
