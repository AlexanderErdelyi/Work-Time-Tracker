/**
 * Notification Service
 * Handles browser notifications for work reminders and alerts
 */

interface NotificationSettings {
  enableNotifications: boolean;
  reminderInterval: number;
  breakReminderEnabled: boolean;
  breakReminderInterval: number;
  dailyGoalNotification: boolean;
  continuousWorkAlert: boolean;
  continuousWorkDuration: number;
}

class NotificationService {
  private lastReminderTime: number = 0;
  private lastBreakReminderTime: number = 0;
  private lastContinuousWorkAlertTime: number = 0;
  private dailyGoalNotifiedToday: boolean = false;

  /**
   * Request notification permission from browser
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Get notification settings from localStorage
   */
  private getSettings(): NotificationSettings {
    return {
      enableNotifications: localStorage.getItem('timekeeper_enableNotifications') === 'true',
      reminderInterval: parseInt(localStorage.getItem('timekeeper_reminderInterval') || '60'),
      breakReminderEnabled: localStorage.getItem('timekeeper_breakReminderEnabled') === 'true',
      breakReminderInterval: parseInt(localStorage.getItem('timekeeper_breakReminderInterval') || '120'),
      dailyGoalNotification: localStorage.getItem('timekeeper_dailyGoalNotification') === 'true',
      continuousWorkAlert: localStorage.getItem('timekeeper_continuousWorkAlert') === 'true',
      continuousWorkDuration: parseInt(localStorage.getItem('timekeeper_continuousWorkDuration') || '240'),
    };
  }

  /**
   * Show a browser notification
   */
  private showNotification(title: string, body: string, tag: string): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        tag,
        icon: '/vite.svg',
        badge: '/vite.svg',
        requireInteraction: false,
      });
    }
  }

  /**
   * Check if timer reminder should be shown
   * Shows reminder when no timer is running for X minutes
   */
  checkTimerReminder(isTimerRunning: boolean): void {
    const settings = this.getSettings();
    
    if (!settings.enableNotifications || isTimerRunning) {
      return;
    }

    const now = Date.now();
    const intervalMs = settings.reminderInterval * 60 * 1000;

    if (now - this.lastReminderTime >= intervalMs) {
      this.showNotification(
        'Time Tracking Reminder',
        'You haven\'t started tracking time yet. Don\'t forget to track your work!',
        'timer-reminder'
      );
      this.lastReminderTime = now;
    }
  }

  /**
   * Check if break reminder should be shown
   * Shows reminder after X minutes of continuous work
   */
  checkBreakReminder(
    isTimerRunning: boolean,
    isOnBreak: boolean,
    continuousWorkMinutes: number
  ): void {
    const settings = this.getSettings();
    
    if (!settings.enableNotifications || !settings.breakReminderEnabled) {
      return;
    }

    // Reset reminder if not working or on break
    if (!isTimerRunning || isOnBreak) {
      this.lastBreakReminderTime = 0;
      return;
    }

    const now = Date.now();
    const intervalMs = settings.breakReminderInterval * 60 * 1000;

    // Check if it's time for a break reminder based on continuous work time
    if (continuousWorkMinutes >= settings.breakReminderInterval) {
      if (now - this.lastBreakReminderTime >= intervalMs) {
        this.showNotification(
          'Break Time! 🧘',
          `You've been working for ${Math.floor(continuousWorkMinutes)} minutes. Time to take a break!`,
          'break-reminder'
        );
        this.lastBreakReminderTime = now;
      }
    }
  }

  /**
   * Check if continuous work alert should be shown
   * Shows alert when working too long without a break
   */
  checkContinuousWorkAlert(
    isTimerRunning: boolean,
    isOnBreak: boolean,
    timeSinceLastBreakMinutes: number
  ): void {
    const settings = this.getSettings();
    
    if (!settings.enableNotifications || !settings.continuousWorkAlert) {
      return;
    }

    // Reset alert if not working or on break
    if (!isTimerRunning || isOnBreak) {
      this.lastContinuousWorkAlertTime = 0;
      return;
    }

    const now = Date.now();
    const thresholdMinutes = settings.continuousWorkDuration;

    // Show alert if working longer than threshold without break
    if (timeSinceLastBreakMinutes >= thresholdMinutes) {
      // Show alert every hour after threshold is reached
      if (now - this.lastContinuousWorkAlertTime >= 60 * 60 * 1000) {
        this.showNotification(
          '⚠️ Long Work Session',
          `You've been working for ${Math.floor(timeSinceLastBreakMinutes)} minutes without a break. Please take a rest!`,
          'continuous-work-alert'
        );
        this.lastContinuousWorkAlertTime = now;
      }
    }
  }

  /**
   * Check if daily goal notification should be shown
   * Shows notification when reaching daily work goal
   */
  checkDailyGoalNotification(totalWorkedMinutesToday: number): void {
    const settings = this.getSettings();
    
    if (!settings.enableNotifications || !settings.dailyGoalNotification) {
      return;
    }

    // Get daily goal from settings (default 8 hours = 480 minutes)
    const dailyGoalMinutes = parseInt(localStorage.getItem('timekeeper_dailyGoalHours') || '8') * 60;

    // Check if goal is reached and we haven't notified today
    if (totalWorkedMinutesToday >= dailyGoalMinutes && !this.dailyGoalNotifiedToday) {
      const hours = Math.floor(totalWorkedMinutesToday / 60);
      const minutes = totalWorkedMinutesToday % 60;
      
      this.showNotification(
        '🎯 Daily Goal Reached!',
        `Congratulations! You've completed ${hours}h ${minutes}m of work today. Time to wrap up!`,
        'daily-goal'
      );
      this.dailyGoalNotifiedToday = true;
    }
  }

  /**
   * Reset daily goal notification flag (call this at midnight or app start)
   */
  resetDailyGoalNotification(): void {
    this.dailyGoalNotifiedToday = false;
  }

  /**
   * Check if we need to reset daily notification flag
   */
  private checkDailyReset(): void {
    const lastResetDate = localStorage.getItem('timekeeper_lastNotificationReset');
    const today = new Date().toDateString();

    if (lastResetDate !== today) {
      this.resetDailyGoalNotification();
      localStorage.setItem('timekeeper_lastNotificationReset', today);
    }
  }

  /**
   * Main check function - call this periodically (e.g., every minute)
   */
  async checkAll(status: {
    isTimerRunning: boolean;
    isOnBreak: boolean;
    continuousWorkMinutes: number;
    timeSinceLastBreakMinutes: number;
    totalWorkedMinutesToday: number;
  }): Promise<void> {
    const settings = this.getSettings();

    if (!settings.enableNotifications) {
      return;
    }

    // Ensure we have permission
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return;
    }

    // Check for daily reset
    this.checkDailyReset();

    // Run all checks
    this.checkTimerReminder(status.isTimerRunning);
    this.checkBreakReminder(status.isTimerRunning, status.isOnBreak, status.continuousWorkMinutes);
    this.checkContinuousWorkAlert(status.isTimerRunning, status.isOnBreak, status.timeSinceLastBreakMinutes);
    this.checkDailyGoalNotification(status.totalWorkedMinutesToday);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
