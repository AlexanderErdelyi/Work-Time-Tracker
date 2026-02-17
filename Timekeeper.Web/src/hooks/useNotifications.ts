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
  continuousWorkMinutes: number;
  timeSinceLastBreakMinutes: number;
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
    refetchInterval: notificationsEnabled ? 60000 : false, // Check every minute
    enabled: notificationsEnabled,
  });

  // Fetch break status
  const { data: breakStatus } = useQuery<BreakStatus>({
    queryKey: ['break-status'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/breaks/status`);
      return response.data;
    },
    refetchInterval: notificationsEnabled ? 60000 : false, // Check every minute
    enabled: notificationsEnabled,
  });

  // Fetch active timer
  const { data: activeTimer } = useQuery<ActiveTimer | null>({
    queryKey: ['active-timer'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/timeentries/active`);
      return response.data || null;
    },
    refetchInterval: notificationsEnabled ? 60000 : false, // Check every minute
    enabled: notificationsEnabled,
  });

  // Run notification checks
  useEffect(() => {
    if (!notificationsEnabled || !workDayStatus || !breakStatus) {
      return;
    }

    const isTimerRunning = activeTimer?.isRunning || false;
    const isOnBreak = breakStatus.isOnBreak;
    const continuousWorkMinutes = breakStatus.continuousWorkMinutes;
    const timeSinceLastBreakMinutes = breakStatus.timeSinceLastBreakMinutes;
    const totalWorkedMinutesToday = workDayStatus.totalMinutesToday;

    // Run all notification checks
    notificationService.checkAll({
      isTimerRunning,
      isOnBreak,
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
