import { useEffect, useState, useCallback, useRef } from 'react';
import { activityDetectionService } from '../services/activityDetection';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { timeEntriesApi } from '../api/timeEntries';
import { notificationService } from '../services/notificationService';
import { timeEntriesKeys } from './useTimeEntries';

interface IdleDialogState {
  isOpen: boolean;
  idleStartTime: Date | null;
  idleDurationMs: number;
  pausedTimerId: number | null;
}

export function useIdleDetection() {
  const queryClient = useQueryClient();
  const [dialogState, setDialogState] = useState<IdleDialogState>({
    isOpen: false,
    idleStartTime: null,
    idleDurationMs: 0,
    pausedTimerId: null,
  });

  // Mutation to pause timer
  const pauseTimerMutation = useMutation({
    mutationFn: (id: number) => timeEntriesApi.pause(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });

  // Use ref to keep stable reference
  const pauseTimerRef = useRef(pauseTimerMutation.mutate);
  pauseTimerRef.current = pauseTimerMutation.mutate;

  // Keep dialogState in ref for callbacks
  const dialogStateRef = useRef(dialogState);
  dialogStateRef.current = dialogState;

  // Handle idle start
  const handleIdleStart = useCallback((idleStartTime: Date) => {
    const settings = {
      enableIdleDetection: localStorage.getItem('timekeeper_enableIdleDetection') === 'true',
      autoResumeOnActivity: localStorage.getItem('timekeeper_autoResumeOnActivity') === 'true',
    };

    if (!settings.enableIdleDetection) {
      return;
    }

    console.log('[IdleDetection] User went idle', { idleStartTime });

    // Get current running timer from cache (not from closure)
    const currentRunningTimer = queryClient.getQueryData<any>(timeEntriesKeys.running());
    
    // If timer is running, pause it
    if (currentRunningTimer) {
      console.log('[IdleDetection] Pausing running timer', { timerId: currentRunningTimer.id });
      
      pauseTimerRef.current(currentRunningTimer.id, {
        onSuccess: () => {
          console.log('[IdleDetection] ✅ Timer paused successfully');
          
          // Immediately update cache to show paused timer
          queryClient.setQueryData(timeEntriesKeys.running(), { ...currentRunningTimer, isPaused: true, pausedAt: new Date().toISOString() });
          queryClient.invalidateQueries({ queryKey: timeEntriesKeys.running() });
          
          // Store the paused timer info
          setDialogState((prev) => ({
            ...prev,
            isOpen: false, // Don't open dialog yet, wait for return
            idleStartTime,
            idleDurationMs: 0,
            pausedTimerId: currentRunningTimer.id,
          }));

          // Show notification
          notificationService.showNotification(
            'Timer Paused',
            `Your timer was paused due to ${Math.floor((Date.now() - idleStartTime.getTime()) / 60000)} minutes of inactivity`,
            'idle-pause'
          );
        },
        onError: (error) => {
          console.error('[IdleDetection] ❌ Failed to stop timer:', error);
        },
      });
    } else {
      console.log('[IdleDetection] No running timer to pause');
    }
  }, []); // No dependencies - stable callback

  // Handle activity return
  const handleActivityReturn = useCallback((wasIdle: boolean, idleDurationMs: number) => {
    const settings = {
      enableIdleDetection: localStorage.getItem('timekeeper_enableIdleDetection') === 'true',
      autoResumeOnActivity: localStorage.getItem('timekeeper_autoResumeOnActivity') === 'true',
    };

    if (!settings.enableIdleDetection || !wasIdle) {
      return;
    }

    console.log('[IdleDetection] User returned from idle', {
      idleDurationMs,
      idleMinutes: Math.floor(idleDurationMs / 60000),
    });

    const idleState = activityDetectionService.getIdleState();
    const currentDialogState = dialogStateRef.current;
    
    // If there was a paused timer
    if (currentDialogState.pausedTimerId || idleState.idleSince) {
      const idleStartTime = idleState.idleSince || currentDialogState.idleStartTime;
      
      if (settings.autoResumeOnActivity) {
        // Auto resume without dialog
        console.log('[IdleDetection] Auto-resuming timer');
        // Timer will auto-restart when user initiates action
        notificationService.showNotification(
          'Welcome Back!',
          'Activity detected. Start a timer to continue tracking.',
          'idle-return'
        );
      } else {
        // Show dialog to ask user
        console.log('[IdleDetection] Showing resume dialog');
        setDialogState((prev) => ({
          ...prev,
          isOpen: true,
          idleStartTime: idleStartTime,
          idleDurationMs,
        }));
      }
    }
  }, []); // No dependencies - stable callback

  // Initialize activity detection
  useEffect(() => {
    const settings = {
      enableIdleDetection: localStorage.getItem('timekeeper_enableIdleDetection') === 'true',
    };

    if (!settings.enableIdleDetection) {
      console.log('[IdleDetection] Disabled in settings');
      return;
    }

    console.log('[IdleDetection] Initializing...');
    
    // Initialize async (try system-level detection, fallback to browser-only)
    activityDetectionService.initialize().then(() => {
      const detectionMethod = activityDetectionService.getDetectionMethod();
      console.log(`[IdleDetection] Initialized with ${detectionMethod} detection`);
    });

    // Subscribe to idle start events
    const unsubscribeIdleStart = activityDetectionService.onIdleStart(handleIdleStart);
    
    // Subscribe to activity changes
    const unsubscribeActivity = activityDetectionService.onActivityChange(handleActivityReturn);

    return () => {
      console.log('[IdleDetection] Cleaning up...');
      unsubscribeIdleStart();
      unsubscribeActivity();
      activityDetectionService.destroy();
    };
  }, [handleIdleStart, handleActivityReturn]);

  // Handle dialog actions
  const handleKeepIdleTime = useCallback(() => {
    console.log('[IdleDetection] User chose to keep idle time');
    // Close dialog - user can manually start a new timer
    setDialogState(prev => ({ ...prev, isOpen: false }));
    
    notificationService.showNotification(
      'Idle Time Kept',
      'Your idle time has been counted. Start a new timer to continue tracking.',
      'idle-keep'
    );
  }, []);

  const handleDiscardIdleTime = useCallback(() => {
    console.log('[IdleDetection] User chose to discard idle time');
    // Close dialog - idle time discarded
    setDialogState(prev => ({ ...prev, isOpen: false }));
    
    notificationService.showNotification(
      'Idle Time Discarded',
      'Your idle time was not counted. Start a new timer to continue tracking.',
      'idle-discard'
    );
  }, []);

  const handleCancelResume = useCallback(() => {
    console.log('[IdleDetection] User chose to keep timer paused');
    setDialogState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    dialogState,
    handleKeepIdleTime,
    handleDiscardIdleTime,
    handleCancelResume,
    isIdle: activityDetectionService.isIdle(),
    idleState: activityDetectionService.getIdleState(),
  };
}
