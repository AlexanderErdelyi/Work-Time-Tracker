/**
 * Activity Detection Service
 * Tracks user activity (mouse, keyboard, page visibility) to detect idle periods
 */

interface ActivitySettings {
  enableIdleDetection: boolean;
  idleThresholdMinutes: number;
  autoResumeOnActivity: boolean;
}

export interface IdleState {
  isIdle: boolean;
  idleSince: Date | null;
  idleDurationMs: number;
}

type ActivityCallback = (isIdle: boolean, idleDurationMs: number) => void;
type IdleStartCallback = (idleStartTime: Date) => void;

class ActivityDetectionService {
  private lastActivityTime: number = Date.now();
  private isCurrentlyIdle: boolean = false;
  private idleStartTime: Date | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private activityCallbacks: ActivityCallback[] = [];
  private idleStartCallbacks: IdleStartCallback[] = [];
  private isInitialized: boolean = false;

  /**
   * Initialize activity detection
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log('[ActivityDetection] Already initialized');
      return;
    }

    const settings = this.getSettings();
    console.log('[ActivityDetection] Initializing...', {
      enabled: settings.enableIdleDetection,
      thresholdMinutes: settings.idleThresholdMinutes,
      autoResume: settings.autoResumeOnActivity
    });
    
    if (!settings.enableIdleDetection) {
      console.warn('[ActivityDetection] Idle detection is DISABLED in settings');
      return;
    }
    
    // Track mouse movements
    document.addEventListener('mousemove', this.recordActivity);
    document.addEventListener('mousedown', this.recordActivity);
    document.addEventListener('mouseup', this.recordActivity);
    document.addEventListener('wheel', this.recordActivity);
    
    // Track keyboard activity
    document.addEventListener('keydown', this.recordActivity);
    document.addEventListener('keyup', this.recordActivity);
    
    // Track touch events (mobile/tablet)
    document.addEventListener('touchstart', this.recordActivity);
    document.addEventListener('touchmove', this.recordActivity);
    document.addEventListener('touchend', this.recordActivity);
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Track window focus
    window.addEventListener('focus', this.recordActivity);
    window.addEventListener('blur', this.handleBlur);

    // Start checking for idle state
    this.startIdleCheck();
    
    this.isInitialized = true;
    console.log('[ActivityDetection] Initialized successfully');
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    console.log('[ActivityDetection] Destroying...');
    
    document.removeEventListener('mousemove', this.recordActivity);
    document.removeEventListener('mousedown', this.recordActivity);
    document.removeEventListener('mouseup', this.recordActivity);
    document.removeEventListener('wheel', this.recordActivity);
    document.removeEventListener('keydown', this.recordActivity);
    document.removeEventListener('keyup', this.recordActivity);
    document.removeEventListener('touchstart', this.recordActivity);
    document.removeEventListener('touchmove', this.recordActivity);
    document.removeEventListener('touchend', this.recordActivity);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.recordActivity);
    window.removeEventListener('blur', this.handleBlur);
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.isInitialized = false;
  }

  /**
   * Record user activity
   */
  private recordActivity = (): void => {
    const wasIdle = this.isCurrentlyIdle;
    this.lastActivityTime = Date.now();
    
    // If user was idle and now active, notify
    if (wasIdle) {
      console.log('[ActivityDetection] User returned from idle');
      this.isCurrentlyIdle = false;
      const idleDuration = this.idleStartTime ? Date.now() - this.idleStartTime.getTime() : 0;
      this.idleStartTime = null;
      
      // Notify all callbacks
      this.activityCallbacks.forEach(callback => callback(false, idleDuration));
    }
  };

  /**
   * Handle page visibility change (tab switch, minimize)
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      console.log('[ActivityDetection] Page hidden');
      // Don't immediately mark as idle, let the idle check handle it
    } else {
      console.log('[ActivityDetection] Page visible');
      this.recordActivity();
    }
  };

  /**
   * Handle window blur (lost focus)
   */
  private handleBlur = (): void => {
    console.log('[ActivityDetection] Window lost focus');
    // Don't immediately mark as idle, let the idle check handle it
  };

  /**
   * Start checking for idle state
   */
  private startIdleCheck(): void {
    console.log('[ActivityDetection] Starting idle checks (every 30 seconds)');
    
    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkIdleState();
    }, 30000);
    
    // Also do an immediate check
    this.checkIdleState();
  }

  /**
   * Check if user is idle
   */
  private checkIdleState(): void {
    const settings = this.getSettings();
    
    if (!settings.enableIdleDetection) {
      return;
    }

    const now = Date.now();
    const timeSinceActivityMs = now - this.lastActivityTime;
    const idleThresholdMs = settings.idleThresholdMinutes * 60 * 1000;
    const timeSinceActivitySeconds = Math.floor(timeSinceActivityMs / 1000);
    
    console.log('[ActivityDetection] Idle check:', {
      secondsSinceActivity: timeSinceActivitySeconds,
      thresholdSeconds: settings.idleThresholdMinutes * 60,
      isCurrentlyIdle: this.isCurrentlyIdle,
      willTriggerIdle: timeSinceActivityMs >= idleThresholdMs && !this.isCurrentlyIdle
    });

    // Check if user has been idle long enough
    if (timeSinceActivityMs >= idleThresholdMs && !this.isCurrentlyIdle) {
      console.log('[ActivityDetection] User idle detected', {
        idleMinutes: Math.floor(timeSinceActivityMs / 60000),
        threshold: settings.idleThresholdMinutes
      });
      
      this.isCurrentlyIdle = true;
      this.idleStartTime = new Date(this.lastActivityTime);
      
      // Notify callbacks about idle start
      this.idleStartCallbacks.forEach(callback => callback(this.idleStartTime!));
      
      // Notify general callbacks
      this.activityCallbacks.forEach(callback => callback(true, timeSinceActivityMs));
    }
  }

  /**
   * Subscribe to activity state changes
   */
  onActivityChange(callback: ActivityCallback): () => void {
    this.activityCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.activityCallbacks = this.activityCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to idle start events
   */
  onIdleStart(callback: IdleStartCallback): () => void {
    this.idleStartCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.idleStartCallbacks = this.idleStartCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current idle state
   */
  getIdleState(): IdleState {
    const idleDurationMs = this.isCurrentlyIdle && this.idleStartTime
      ? Date.now() - this.idleStartTime.getTime()
      : 0;

    return {
      isIdle: this.isCurrentlyIdle,
      idleSince: this.idleStartTime,
      idleDurationMs
    };
  }

  /**
   * Manually mark as active (useful for testing or override)
   */
  markActive(): void {
    this.recordActivity();
  }

  /**
   * Get settings from localStorage
   */
  private getSettings(): ActivitySettings {
    return {
      enableIdleDetection: localStorage.getItem('timekeeper_enableIdleDetection') === 'true',
      idleThresholdMinutes: parseInt(localStorage.getItem('timekeeper_idleThresholdMinutes') || '5'),
      autoResumeOnActivity: localStorage.getItem('timekeeper_autoResumeOnActivity') === 'true',
    };
  }

  /**
   * Get time since last activity in milliseconds
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Check if currently idle
   */
  isIdle(): boolean {
    return this.isCurrentlyIdle;
  }
}

// Export singleton instance
export const activityDetectionService = new ActivityDetectionService();
