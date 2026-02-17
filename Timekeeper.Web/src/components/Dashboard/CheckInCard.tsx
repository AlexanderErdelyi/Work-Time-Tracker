import { LogIn, LogOut, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useWorkDayStatus, useCheckIn, useCheckOut } from '../../hooks/useWorkDays';
import { formatTime } from '../../lib/dateUtils';

export function CheckInCard() {
  const { data: status, isLoading } = useWorkDayStatus();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const handleCheckIn = () => {
    checkIn.mutate();
  };

  const handleCheckOut = () => {
    checkOut.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Work Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const isCheckedIn = status?.isCheckedIn ?? false;
  const workDay = status?.workDay;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Work Day
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCheckedIn ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You haven't checked in today
            </p>
            <Button
              onClick={handleCheckIn}
              disabled={checkIn.isPending}
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Check In
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Checked In</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  {workDay?.checkInTime && formatTime(new Date(workDay.checkInTime))}
                </span>
              </div>
            </div>
            
            {workDay && workDay.totalWorkedMinutes > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Worked Today</span>
                <span className="text-sm font-medium">
                  {Math.floor(workDay.totalWorkedMinutes / 60)}h {workDay.totalWorkedMinutes % 60}m
                </span>
              </div>
            )}

            <Button
              onClick={handleCheckOut}
              disabled={checkOut.isPending}
              variant="outline"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Check Out
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
