/**
 * System Idle Detection Service
 * Uses the Idle Detection API for system-level activity monitoring
 * Works across all applications and monitors (Chrome/Edge only)
 */

// Idle Detection API types (not yet in TypeScript lib by default)
interface IdleDetector extends EventTarget {
  userState: 'active' | 'idle';
  screenState: 'locked' | 'unlocked';
  start(options?: IdleOptions): Promise<void>;
  addEventListener(
    type: 'change',
    listener: (this: IdleDetector, ev: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: 'change',
    listener: (this: IdleDetector, ev: Event) => void,
    options?: boolean | EventListenerOptions
  ): void;
}

interface IdleOptions {
  threshold: number; // milliseconds, minimum 60000 (1 minute)
  signal?: AbortSignal;
}

interface IdleDetectorConstructor {
  new(): IdleDetector;
  requestPermission(): Promise<PermissionState>;
}

declare global {
  interface Window {
    IdleDetector?: IdleDetectorConstructor;
  }
}

export type SystemIdleState = 'active' | 'idle' | 'locked';
export type IdleChangeCallback = (state: SystemIdleState) => void;

export interface SystemIdleDetectionConfig {
  thresholdMinutes: number;
  onIdleChange?: IdleChangeCallback;
}

/**
 * System Idle Detection Service
 * Provides system-level idle detection using the Idle Detection API
 */
export class SystemIdleDetectionService {
  private detector: IdleDetector | null = null;
  private abortController: AbortController | null = null;
  private callbacks: IdleChangeCallback[] = [];
  private currentState: SystemIdleState = 'active';
  private isRunning: boolean = false;

  /**
   * Check if Idle Detection API is supported in this browser
   */
  static isSupported(): boolean {
    return 'IdleDetector' in window;
  }

  /**
   * Request permission to use the Idle Detection API
   * @returns Promise that resolves to true if permission granted
   */
  static async requestPermission(): Promise<boolean> {
    if (!SystemIdleDetectionService.isSupported()) {
      console.warn('[SystemIdleDetection] Idle Detection API not supported in this browser');
      return false;
    }

    try {
      const IdleDetector = window.IdleDetector!;
      const status = await IdleDetector.requestPermission();
      
      console.log('[SystemIdleDetection] Permission status:', status);
      
      return status === 'granted';
    } catch (error) {
      console.error('[SystemIdleDetection] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check current permission status without requesting
   */
  static async checkPermission(): Promise<PermissionState> {
    if (!SystemIdleDetectionService.isSupported()) {
      return 'denied';
    }

    try {
      // Query the permission status
      const permissionStatus = await navigator.permissions.query({ name: 'idle-detection' as PermissionName });
      return permissionStatus.state;
    } catch (error) {
      console.warn('[SystemIdleDetection] Could not query permission:', error);
      return 'prompt';
    }
  }

  /**
   * Start monitoring system idle state
   */
  async start(config: SystemIdleDetectionConfig): Promise<boolean> {
    if (!SystemIdleDetectionService.isSupported()) {
      console.error('[SystemIdleDetection] API not supported');
      return false;
    }

    if (this.isRunning) {
      console.warn('[SystemIdleDetection] Already running');
      return true;
    }

    try {
      const IdleDetector = window.IdleDetector!;

      // Check permission first
      const permissionStatus = await SystemIdleDetectionService.checkPermission();
      if (permissionStatus !== 'granted') {
        console.error('[SystemIdleDetection] Permission not granted:', permissionStatus);
        return false;
      }

      // Create detector instance
      this.detector = new IdleDetector();
      this.abortController = new AbortController();

      // Set up change listener
      this.detector.addEventListener('change', this.handleIdleChange);

      // Calculate threshold (minimum 60 seconds / 1 minute)
      const thresholdMs = Math.max(config.thresholdMinutes * 60 * 1000, 60000);

      if (thresholdMs > config.thresholdMinutes * 60 * 1000) {
        console.warn(
          `[SystemIdleDetection] Requested threshold ${config.thresholdMinutes} min, ` +
          `but API minimum is 1 minute. Using 1 minute.`
        );
      }

      // Start detection
      await this.detector.start({
        threshold: thresholdMs,
        signal: this.abortController.signal
      });

      this.isRunning = true;

      // Get initial state
      this.currentState = this.determineState(this.detector.userState, this.detector.screenState);

      console.log('[SystemIdleDetection] Started successfully', {
        thresholdMinutes: thresholdMs / 60000,
        initialUserState: this.detector.userState,
        initialScreenState: this.detector.screenState,
        combinedState: this.currentState
      });

      // If config has callback, add it
      if (config.onIdleChange) {
        this.callbacks.push(config.onIdleChange);
      }

      return true;
    } catch (error) {
      console.error('[SystemIdleDetection] Failed to start:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    console.log('[SystemIdleDetection] Stopping...');
    
    if (this.abortController) {
      this.abortController.abort();
    }

    this.cleanup();
  }

  /**
   * Handle idle state change from the API
   */
  private handleIdleChange = (): void => {
    if (!this.detector) return;

    const newState = this.determineState(this.detector.userState, this.detector.screenState);
    const oldState = this.currentState;

    if (newState !== oldState) {
      console.log('[SystemIdleDetection] State changed:', {
        from: oldState,
        to: newState,
        userState: this.detector.userState,
        screenState: this.detector.screenState
      });

      this.currentState = newState;

      // Notify all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(newState);
        } catch (error) {
          console.error('[SystemIdleDetection] Callback error:', error);
        }
      });
    }
  };

  /**
   * Determine combined state from user and screen states
   */
  private determineState(userState: 'active' | 'idle', screenState: 'locked' | 'unlocked'): SystemIdleState {
    // Screen locked takes precedence
    if (screenState === 'locked') {
      return 'locked';
    }

    // User is either active or idle
    return userState;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: IdleChangeCallback): () => void {
    this.callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current state
   */
  getState(): SystemIdleState {
    return this.currentState;
  }

  /**
   * Check if currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.detector) {
      this.detector.removeEventListener('change', this.handleIdleChange);
      this.detector = null;
    }

    this.abortController = null;
    this.isRunning = false;
    this.currentState = 'active';

    console.log('[SystemIdleDetection] Cleaned up');
  }
}

// Singleton instance
let instance: SystemIdleDetectionService | null = null;

/**
 * Get singleton instance of SystemIdleDetectionService
 */
export function getSystemIdleDetection(): SystemIdleDetectionService {
  if (!instance) {
    instance = new SystemIdleDetectionService();
  }
  return instance;
}

/**
 * Helper to check if system idle detection is available and permitted
 */
export async function isSystemIdleDetectionAvailable(): Promise<boolean> {
  if (!SystemIdleDetectionService.isSupported()) {
    return false;
  }

  const permission = await SystemIdleDetectionService.checkPermission();
  return permission === 'granted';
}
