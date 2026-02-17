import { Coffee, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useBreakStatus, useStartBreak, useEndBreak } from '../../hooks/useBreaks';
import { formatTime } from '../../lib/dateUtils';
import { useEffect, useState } from 'react';

export function BreakCard() {
  const { data: status, isLoading } = useBreakStatus();
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    if (!status?.isOnBreak || !status?.activeBreak) {
      setElapsed('00:00');
      return;
    }

    const updateElapsed = () => {
      const start = new Date(status.activeBreak!.startTime);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [status]);

  const handleStartBreak = () => {
    startBreak.mutate(undefined);
  };

  const handleEndBreak = () => {
    endBreak.mutate(undefined);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Break Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const isOnBreak = status?.isOnBreak ?? false;
  const activeBreak = status?.activeBreak;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5" />
          Break Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOnBreak ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Take a break to refresh
            </p>
            <Button
              onClick={handleStartBreak}
              disabled={startBreak.isPending}
              className="w-full"
              variant="outline"
            >
              <Coffee className="mr-2 h-4 w-4" />
              Start Break
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">On Break</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  {activeBreak?.startTime && formatTime(activeBreak.startTime)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className="text-lg font-mono font-medium">
                {elapsed}
              </span>
            </div>

            <Button
              onClick={handleEndBreak}
              disabled={endBreak.isPending}
              className="w-full"
            >
              <Play className="mr-2 h-4 w-4" />
              End Break
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
