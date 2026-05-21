// Service Worker registration and management utilities

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onError?: (error: Error) => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean;
  private config: ServiceWorkerConfig = {};

  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
  }

  // Register the service worker
  async register(config: ServiceWorkerConfig = {}): Promise<boolean> {
    this.config = config;

    if (!this.isSupported) {
      console.log('Service Worker: Not supported in this browser');
      return false;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Service Worker: Skipping registration in development');
      return false;
    }

    try {
      console.log('Service Worker: Registering...');

      this.registration = await navigator.serviceWorker.register('/sw.js');

      // Handle different registration states
      if (this.registration.installing) {
        console.log('Service Worker: Installing...');
        this.handleInstalling(this.registration.installing);
      } else if (this.registration.waiting) {
        console.log('Service Worker: Waiting...');
        this.handleWaiting(this.registration.waiting);
      } else if (this.registration.active) {
        console.log('Service Worker: Active');
        this.handleActive(this.registration.active);
      }

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        console.log('Service Worker: Update found');
        const newWorker = this.registration!.installing;
        if (newWorker) {
          this.handleInstalling(newWorker);
        }
      });

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker: Controller changed');
        window.location.reload();
      });

      return true;
    } catch (error) {
      console.error('Service Worker: Registration failed:', error);
      this.config.onError?.(error as Error);
      return false;
    }
  }

  // Unregister the service worker
  async unregister(): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker: Unregistered');
      return result;
    } catch (error) {
      console.error('Service Worker: Unregistration failed:', error);
      return false;
    }
  }

  // Update the service worker
  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      await this.registration.update();
      console.log('Service Worker: Update check completed');
    } catch (error) {
      console.error('Service Worker: Update check failed:', error);
      throw error;
    }
  }

  // Skip waiting and activate new service worker
  skipWaiting(): void {
    if (this.registration?.waiting) {
      this.sendMessage({ type: 'SKIP_WAITING' });
    }
  }

  // Get service worker version
  async getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'VERSION') {
          resolve(event.data.payload);
        } else {
          reject(new Error('Failed to get version'));
        }
      };

      this.sendMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Version request timeout'));
      }, 5000);
    });
  }

  // Clear all caches
  async clearCache(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          resolve(event.data.payload);
        } else {
          reject(new Error('Failed to clear cache'));
        }
      };

      this.sendMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Clear cache request timeout'));
      }, 10000);
    });
  }

  // Check if app is running offline
  isOffline(): boolean {
    return !navigator.onLine;
  }

  // Get registration status
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  // Send message to service worker
  private sendMessage(message: any, transfer?: Transferable[]): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message, transfer);
    }
  }

  // Handle installing state
  private handleInstalling(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New update available
          console.log('Service Worker: New content available');
          this.config.onUpdate?.(this.registration!);
        } else {
          // First install
          console.log('Service Worker: Content cached for offline use');
          this.config.onSuccess?.(this.registration!);
          this.config.onOfflineReady?.();
        }
      }
    });
  }

  // Handle waiting state
  private handleWaiting(worker: ServiceWorker): void {
    console.log('Service Worker: New version waiting');
    this.config.onUpdate?.(this.registration!);
  }

  // Handle active state
  private handleActive(worker: ServiceWorker): void {
    console.log('Service Worker: Active and ready');
    this.config.onSuccess?.(this.registration!);
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Utility functions for easy use
export const registerSW = (config?: ServiceWorkerConfig) => {
  return serviceWorkerManager.register(config);
};

export const unregisterSW = () => {
  return serviceWorkerManager.unregister();
};

export const updateSW = () => {
  return serviceWorkerManager.update();
};

export const skipWaiting = () => {
  serviceWorkerManager.skipWaiting();
};

export const clearCache = () => {
  return serviceWorkerManager.clearCache();
};

export const isOffline = () => {
  return serviceWorkerManager.isOffline();
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