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
      console.warn('[Notifications] Browser does not support notifications');
      return false;
    }

    console.log('[Notifications] Current permission:', Notification.permission);
    
    if (Notification.permission === 'granted') {
      console.log('[Notifications] Permission already granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      console.log('[Notifications] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('[Notifications] Permission result:', permission);
      return permission === 'granted';
    }

    console.warn('[Notifications] Permission denied');
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
   * Show a browser notification with sound
   */
  showNotification(title: string, body: string, tag: string): void {
    console.log('[Notifications] showNotification called', { 
      title, 
      body, 
      tag, 
      permission: Notification.permission,
      isDocumentFocused: document.hasFocus()
    });

    if (Notification.permission !== 'granted') {
      console.warn('[Notifications] Cannot show notification - permission not granted');
      return;
    }

    try {
      console.log('[Notifications] Creating Notification object...');
      
      // Try creating notification without tag first (tags can cause issues)
      const notification = new Notification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        requireInteraction: true,
        silent: true, // We'll play our own custom sound
        // Don't use tag - it can suppress notifications if one with same tag exists
      });

      console.log('[Notifications] Notification object created:', notification);

      notification.onshow = () => {
        console.log('[Notifications] ✅ Notification shown successfully!');
      };

      notification.onclick = () => {
        console.log('[Notifications] Notification clicked');
        window.focus();
        notification.close();
      };

      notification.onclose = () => {
        console.log('[Notifications] Notification closed');
      };

      notification.onerror = (error) => {
        console.error('[Notifications] ❌ Notification error:', error);
      };

      // Play custom musical sound
      this.playNotificationSound();
      
      // Check if notification is showing after a short delay
      setTimeout(() => {
        console.log('[Notifications] Notification check - state:', {
          tag: notification.tag,
          data: notification.data
        });
      }, 500);
      
    } catch (error) {
      console.error('[Notifications] Failed to create notification:', error);
    }
  }

  /**
   * Play notification sound using audio file or fallback
   */
  private playNotificationSound(): void {
    try {
      // Get selected sound from settings
      const selectedSound = localStorage.getItem('timekeeper_notificationSound') || 'default';
      
      if (selectedSound === 'default') {
        // Use fallback beep for default
        this.playFallbackBeep();
        return;
      }
      
      // Try to play custom notification sound file
      const audio = new Audio(`/sounds/${selectedSound}`);
      audio.volume = 0.5; // 50% volume
      
      audio.play().then(() => {
        console.log('[Notifications] Notification sound played:', selectedSound);
      }).catch(error => {
        console.warn('[Notifications] Could not play sound file, using fallback beep:', error);
        // Fallback to simple beep if file not found
        this.playFallbackBeep();
      });
      
    } catch (error) {
      console.warn('[Notifications] Could not play sound:', error);
      this.playFallbackBeep();
    }
  }

  /**
   * Fallback beep sound if audio file not available
   */
  private playFallbackBeep(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('[Notifications] Fallback beep also failed:', error);
    }
  }

  /**
   * Check if timer reminder should be shown
   * Shows reminder when checked in but no timer is running for X minutes
   */
  checkTimerReminder(isCheckedIn: boolean, checkInTime: string | undefined, isTimerRunning: boolean): void {
    const settings = this.getSettings();
    
    const now = Date.now();
    
    // Don't show reminder if not checked in or timer is already running
    if (!settings.enableNotifications || !isCheckedIn || isTimerRunning || !checkInTime) {
      // When timer starts or user checks out, reset the countdown
      // Set to current time so when timer stops, we start counting from then
      if (isTimerRunning) {
        this.lastReminderTime = now;
      } else if (!isCheckedIn) {
        this.lastReminderTime = 0;
      }
      return;
    }

    const intervalMs = settings.reminderInterval * 60 * 1000;
    
    // If this is the first check after check-in or timer stop, start counting from now
    if (this.lastReminderTime === 0) {
      this.lastReminderTime = now;
      console.log('[Notifications] Starting timer reminder countdown');
      return;
    }
    
    const timeSinceLastReminderMs = now - this.lastReminderTime;
    
    console.log('[Notifications] checkTimerReminder', { 
      enabled: settings.enableNotifications, 
      isCheckedIn,
      checkInTime,
      isTimerRunning,
      intervalMinutes: settings.reminderInterval,
      timeSinceLastReminderMinutes: Math.floor(timeSinceLastReminderMs / 60000),
      shouldNotify: timeSinceLastReminderMs >= intervalMs
    });

    // Show reminder if idle for X minutes
    if (timeSinceLastReminderMs >= intervalMs) {
      console.log('[Notifications] Showing timer reminder - idle without timer');
      this.showNotification(
        'Time Tracking Reminder',
        `You've been idle for ${settings.reminderInterval} minutes. Start a timer to track your work!`,
        'timer-reminder'
      );
      this.lastReminderTime = now; // Reset the countdown
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
    isCheckedIn: boolean;
    checkInTime?: string;
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
    this.checkTimerReminder(status.isCheckedIn, status.checkInTime, status.isTimerRunning);
    this.checkBreakReminder(status.isTimerRunning, status.isOnBreak, status.continuousWorkMinutes);
    this.checkContinuousWorkAlert(status.isTimerRunning, status.isOnBreak, status.timeSinceLastBreakMinutes);
    this.checkDailyGoalNotification(status.totalWorkedMinutesToday);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
