import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Calendar, Clock, LogIn, LogOut, Filter } from 'lucide-react';
import { useWorkDays } from '../hooks/useWorkDays';
import { formatDate, formatTime } from '../lib/dateUtils';

export function WorkDays() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterApplied, setFilterApplied] = useState(false);
  
  const { data: workDays = [], isLoading } = useWorkDays(
    filterApplied ? startDate : undefined,
    filterApplied ? endDate : undefined
  );

  const handleApplyFilter = () => {
    setFilterApplied(true);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setFilterApplied(false);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Work Days</h1>
        <p className="text-muted-foreground">
          View your work day history and attendance
        </p>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Work Days
          </CardTitle>
          <CardDescription>
            Filter by date range (leave empty to show all)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyFilter}>
                Apply Filter
              </Button>
              {filterApplied && (
                <Button variant="outline" onClick={handleClearFilter}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Days List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Work Day History</CardTitle>
              <CardDescription>
                Your check-in and check-out records
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {workDays.length} {workDays.length === 1 ? 'day' : 'days'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading work days...
            </div>
          ) : workDays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No work days found. Start tracking by checking in!
            </div>
          ) : (
            <div className="space-y-3">
              {workDays.map((workDay) => (
                <div
                  key={workDay.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDate(workDay.date, 'EEEE, MMMM d, yyyy')}
                        </span>
                        {workDay.isCheckedIn && (
                          <Badge variant="default" className="ml-2">
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              Active
                            </span>
                          </Badge>
                        )}
                      </div>

                      {/* Check In/Out Times */}
                      <div className="flex flex-wrap gap-6 text-sm">
                        {workDay.checkInTime && (
                          <div className="flex items-center gap-2">
                            <LogIn className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">Check In:</span>
                            <span className="font-medium">
                              {formatTime(workDay.checkInTime)}
                            </span>
                          </div>
                        )}
                        {workDay.checkOutTime && (
                          <div className="flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-red-600" />
                            <span className="text-muted-foreground">Check Out:</span>
                            <span className="font-medium">
                              {formatTime(workDay.checkOutTime)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {workDay.notes && (
                        <div className="text-sm text-muted-foreground italic">
                          {workDay.notes}
                        </div>
                      )}
                    </div>

                    {/* Total Hours */}
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-2xl font-bold">
                            {formatDuration(workDay.totalWorkedMinutes)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total Worked
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
