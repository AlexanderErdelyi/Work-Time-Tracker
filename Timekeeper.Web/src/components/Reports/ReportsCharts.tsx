import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
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
}

export function ReportsCharts({ customerData, projectData, dailyData }: ReportsChartsProps) {
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
    </>
  )
}
