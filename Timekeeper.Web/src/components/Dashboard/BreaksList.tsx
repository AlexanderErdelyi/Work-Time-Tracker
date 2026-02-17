import { Coffee, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useTodayBreaks } from '../../hooks/useBreaks';
import { formatTime } from '../../lib/dateUtils';

export function BreaksList() {
  const { data: breaks = [], isLoading } = useTodayBreaks();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Ensure breaks is always an array
  const breaksList = Array.isArray(breaks) ? breaks : [];
  const totalBreakMinutes = breaksList.reduce((sum, breakItem) => sum + breakItem.durationMinutes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Today's Breaks
            </CardTitle>
            <CardDescription>
              Your break history for today
            </CardDescription>
          </div>
          {breaksList.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-lg font-semibold">{formatDuration(totalBreakMinutes)}</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading breaks...
          </div>
        ) : breaksList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No breaks taken today
          </div>
        ) : (
          <div className="space-y-2">
            {breaksList.map((breakItem) => (
              <div
                key={breakItem.id}
                className="border rounded-lg p-3 flex items-center justify-between hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Coffee className={`h-4 w-4 ${breakItem.isActive ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatTime(breakItem.startTime)}
                      </span>
                      {breakItem.endTime && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm font-medium">
                            {formatTime(breakItem.endTime)}
                          </span>
                        </>
                      )}
                      {breakItem.isActive && (
                        <Badge variant="default" className="ml-2">
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                            Active
                          </span>
                        </Badge>
                      )}
                    </div>
                    {breakItem.notes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {breakItem.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {formatDuration(breakItem.durationMinutes)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
