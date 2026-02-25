import { useState, useEffect, useCallback } from 'react';

// Extend the Window interface to include the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

type InstallState = 'not-supported' | 'not-installed' | 'installed' | 'installing';

interface UsePWAReturn {
  isSupported: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  canInstall: boolean;
  installState: InstallState;
  installPWA: () => Promise<boolean>;
}

export function usePWA(): UsePWAReturn {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if running as PWA (standalone mode)
    const checkIfInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      const webAppCapable = (navigator as any).standalone === true; // iOS
      return standalone || webAppCapable;
    };

    setIsInstalled(checkIfInstalled());

    // Check if PWA installation is supported
    const checkSupport = () => {
      return 'serviceWorker' in navigator && window.isSecureContext;
    };

    setIsSupported(checkSupport());

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('[PWA] beforeinstallprompt event fired');
      // Prevent the default browser install prompt
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Listen for display mode changes
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    
    if (displayModeQuery.addEventListener) {
      displayModeQuery.addEventListener('change', handleDisplayModeChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (displayModeQuery.removeEventListener) {
        displayModeQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    try {
      setIsInstalling(true);
      
      // Show the install prompt
      await installPrompt.prompt();
      
      // Wait for the user's response
      const { outcome } = await installPrompt.userChoice;
      
      console.log(`[PWA] User choice: ${outcome}`);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Installation error:', error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [installPrompt]);

  const installState: InstallState = isInstalled
    ? 'installed'
    : isInstalling
    ? 'installing'
    : installPrompt
    ? 'not-installed'
    : 'not-supported';

  const canInstall = installPrompt !== null && !isInstalled && !isInstalling;

  return {
    isSupported,
    isInstalled,
    isInstalling,
    canInstall,
    installState,
    installPWA,
  };
}
