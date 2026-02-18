import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { Activity, Clock, AlertCircle } from 'lucide-react';

interface IdleResumeDialogProps {
  isOpen: boolean;
  idleStartTime: Date;
  idleDurationMs: number;
  onKeepIdleTime: () => void;
  onDiscardIdleTime: () => void;
  onCancel: () => void;
}

export const IdleResumeDialog: React.FC<IdleResumeDialogProps> = ({
  isOpen,
  idleStartTime,
  idleDurationMs,
  onKeepIdleTime,
  onDiscardIdleTime,
  onCancel,
}) => {
  const idleMinutes = Math.floor(idleDurationMs / 60000);
  const idleHours = Math.floor(idleMinutes / 60);
  const remainingMinutes = idleMinutes % 60;

  const formatIdleDuration = () => {
    if (idleHours > 0) {
      return `${idleHours} hour${idleHours > 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    }
    return `${idleMinutes} minute${idleMinutes !== 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            Idle Time Detected
          </DialogTitle>
          <DialogDescription>
            Your timer was paused due to inactivity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Idle Information */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 mb-2">
                  You've been idle for {formatIdleDuration()}
                </p>
                <div className="text-sm text-orange-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      Idle since: {idleStartTime.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>
                      Activity resumed: {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Options Explanation */}
          <div className="space-y-3">
            <div className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
              <p className="font-medium text-sm mb-1">Keep Idle Time</p>
              <p className="text-xs text-muted-foreground">
                The timer will resume from when you became idle. Idle time will be counted as work time.
              </p>
            </div>
            
            <div className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
              <p className="font-medium text-sm mb-1">Discard Idle Time</p>
              <p className="text-xs text-muted-foreground">
                The timer will resume from now. Idle time ({formatIdleDuration()}) will not be counted.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Keep Paused
          </Button>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onDiscardIdleTime}
              className="gap-2"
            >
              Discard Idle Time
            </Button>
            <Button 
              type="button" 
              onClick={onKeepIdleTime}
              className="gap-2"
            >
              Keep & Resume
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
