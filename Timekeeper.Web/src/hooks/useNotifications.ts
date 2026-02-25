import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import { supportApi } from '../api';
import { notificationService } from '../services/notificationService';

interface WorkDayStatus {
  isCheckedIn: boolean;
  checkInTime?: string;
  totalMinutesToday: number;
}

interface BreakStatus {
  isOnBreak: boolean;
  breakStartTime?: string;
  totalBreakMinutesToday: number;
  continuousWorkMinutes?: number;
  timeSinceLastBreakMinutes?: number;
}

interface ActiveTimer {
  id: number;
  startTime: string;
  isRunning: boolean;
}

/**
 * Hook to manage notifications
 * Checks work status periodically and triggers appropriate notifications
 */
export function useNotifications() {
    const previousSupportUnreadCount = useRef<number>(0)

  // Check if notifications are enabled
  const notificationsEnabled = localStorage.getItem('timekeeper_enableNotifications') === 'true';

  // Fetch work day status
  const { data: workDayStatus } = useQuery<WorkDayStatus>({
    queryKey: ['workday-status'],
    queryFn: async () => {
      return fetchApi<WorkDayStatus>('/workdays/status');
    },
    refetchInterval: notificationsEnabled ? 10000 : false, // Check every 10 seconds for testing
    enabled: notificationsEnabled,
  });

  // Fetch break status
  const { data: breakStatus } = useQuery<BreakStatus>({
    queryKey: ['break-status'],
    queryFn: async () => {
      return fetchApi<BreakStatus>('/breaks/status');
    },
    refetchInterval: notificationsEnabled ? 10000 : false, // Check every 10 seconds for testing
    enabled: notificationsEnabled,
  });

  // Fetch active timer
  const { data: activeTimer } = useQuery<ActiveTimer | null>({
    queryKey: ['active-timer'],
    queryFn: async () => {
      const data = await fetchApi<ActiveTimer | null>('/timeentries/running');
      return data || null;
    },
    refetchInterval: notificationsEnabled ? 10000 : false, // Check every 10 seconds for testing
    enabled: notificationsEnabled,
  });

  const { data: unreadSupport } = useQuery({
    queryKey: ['support', 'unread-count'],
    queryFn: supportApi.getUnreadCount,
    refetchInterval: notificationsEnabled ? 20000 : false,
    enabled: notificationsEnabled,
  })

  // Run notification checks
  useEffect(() => {
    console.log('[Notifications] Hook triggered', { 
      notificationsEnabled, 
      hasWorkDayStatus: !!workDayStatus, 
      hasBreakStatus: !!breakStatus,
      activeTimer 
    });
    
    if (!notificationsEnabled) {
      return;
    }

    const isTimerRunning = !!activeTimer;
    const isOnBreak = breakStatus?.isOnBreak || false;
    const isCheckedIn = workDayStatus?.isCheckedIn || false;
    const checkInTime = workDayStatus?.checkInTime;
    const continuousWorkMinutes = breakStatus?.continuousWorkMinutes || 0;
    const timeSinceLastBreakMinutes = breakStatus?.timeSinceLastBreakMinutes || 0;
    const totalWorkedMinutesToday = workDayStatus?.totalMinutesToday || 0;
    
    console.log('[Notifications] Calling checkAll with:', {
      isTimerRunning,
      isOnBreak,
      isCheckedIn,
      checkInTime,
      continuousWorkMinutes,
      timeSinceLastBreakMinutes,
      totalWorkedMinutesToday
    });

    // Run all notification checks
    notificationService.checkAll({
      isTimerRunning,
      isOnBreak,
      isCheckedIn,
      checkInTime,
      continuousWorkMinutes,
      timeSinceLastBreakMinutes,
      totalWorkedMinutesToday,
    });
  }, [notificationsEnabled, workDayStatus, breakStatus, activeTimer]);

  useEffect(() => {
    if (!notificationsEnabled || !unreadSupport) {
      return
    }

    if (
      unreadSupport.unreadCount > 0
      && unreadSupport.unreadCount > previousSupportUnreadCount.current
    ) {
      notificationService.showNotification(
        'Support Update',
        `You have ${unreadSupport.unreadCount} ticket update${unreadSupport.unreadCount === 1 ? '' : 's'}.`,
        'support-updates'
      )
    }

    previousSupportUnreadCount.current = unreadSupport.unreadCount
  }, [notificationsEnabled, unreadSupport])

  // Request permission on mount
  useEffect(() => {
    if (notificationsEnabled) {
      notificationService.requestPermission();
    }
  }, [notificationsEnabled]);

  return {
    isEnabled: notificationsEnabled,
  };
}
