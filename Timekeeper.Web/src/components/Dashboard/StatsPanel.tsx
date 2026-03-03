import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

interface StatsPanelProps {
  todayWorkedMinutes: number
  thisWeekWorkedMinutes: number
  activeProjectCount: number
  totalBreakMinutesToday: number
  todayBilledHours: number
  isBillingEnabled: boolean
}

export function StatsPanel({
  todayWorkedMinutes,
  thisWeekWorkedMinutes,
  activeProjectCount,
  totalBreakMinutesToday,
  todayBilledHours,
  isBillingEnabled,
}: StatsPanelProps) {
  const formatMinutesAsHoursMinutes = (minutes: number) => {
    const safeMinutes = Math.max(0, Math.round(minutes))
    const hours = Math.floor(safeMinutes / 60)
    const remainingMinutes = safeMinutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return (
    <div className={`grid gap-4 md:grid-cols-3 ${isBillingEnabled ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMinutesAsHoursMinutes(todayWorkedMinutes)}</div>
          <p className="text-xs text-muted-foreground">of 8.00h target</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMinutesAsHoursMinutes(thisWeekWorkedMinutes)}</div>
          <p className="text-xs text-muted-foreground">of 40.00h target</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeProjectCount}</div>
          <p className="text-xs text-muted-foreground">currently tracking</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Break</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMinutesAsHoursMinutes(totalBreakMinutesToday)}</div>
          <p className="text-xs text-muted-foreground">Breaks today</p>
        </CardContent>
      </Card>

      {isBillingEnabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayBilledHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">Billed today</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
