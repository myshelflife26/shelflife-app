// Service Worker utilities - COMPLETELY DISABLED
// Service worker functionality has been permanently disabled due to React error #306

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onError?: (error: Error) => void;
}

class ServiceWorkerManager {
  // Service worker is permanently disabled
  constructor() {
    // No initialization needed
  }

  // All methods return false/no-op to prevent any service worker functionality
  async register(config: ServiceWorkerConfig = {}): Promise<boolean> {
    return false;
  }

  async unregister(): Promise<boolean> {
    return false;
  }

  async update(): Promise<void> {
    // No-op
  }

  skipWaiting(): void {
    // No-op
  }

  async getVersion(): Promise<string> {
    return 'disabled';
  }

  async clearCache(): Promise<boolean> {
    return false;
  }

  isOffline(): boolean {
    return !navigator.onLine;
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return null;
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Utility functions - all no-op
export const registerSW = (config?: ServiceWorkerConfig) => {
  return Promise.resolve(false);
};

export const unregisterSW = () => {
  return Promise.resolve(false);
};

export const updateSW = () => {
  return Promise.resolve();
};

export const skipWaiting = () => {
  // No-op
};

export const clearCache = () => {
  return Promise.resolve(false);
};

export const isOffline = () => {
  return !navigator.onLine;
};

// Network status hook for React components
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
};

// React import for the hook
import React from 'react';

export default serviceWorkerManager;