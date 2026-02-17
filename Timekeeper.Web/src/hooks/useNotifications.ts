import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { notificationService } from '../services/notificationService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  // Check if notifications are enabled
  const notificationsEnabled = localStorage.getItem('timekeeper_enableNotifications') === 'true';

  // Fetch work day status
  const { data: workDayStatus } = useQuery<WorkDayStatus>({
    queryKey: ['workday-status'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/workdays/status`);
      return response.data;
    },
    refetchInterval: notificationsEnabled ? 10000 : false, // Check every 10 seconds for testing
    enabled: notificationsEnabled,
  });

  // Fetch break status
  const { data: breakStatus } = useQuery<BreakStatus>({
    queryKey: ['break-status'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/breaks/status`);
      return response.data;
    },
    refetchInterval: notificationsEnabled ? 10000 : false, // Check every 10 seconds for testing
    enabled: notificationsEnabled,
  });

  // Fetch active timer
  const { data: activeTimer } = useQuery<ActiveTimer | null>({
    queryKey: ['active-timer'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/timeentries/running`);
      return response.data || null;
    },
    refetchInterval: notificationsEnabled ? 10000 : false, // Check every 10 seconds for testing
    enabled: notificationsEnabled,
  });

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

    const isTimerRunning = activeTimer?.isRunning || false;
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
