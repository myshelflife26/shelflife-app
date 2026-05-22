import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, X, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

// Simple network status hook - service worker disabled
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
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

// No-op function - service worker disabled
const skipWaiting = () => {
  // Service worker disabled
};

interface OfflineNotificationProps {
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
}

export function OfflineNotification({ onUpdateAvailable, onOfflineReady }: OfflineNotificationProps) {
  const { isOnline, isOffline } = useNetworkStatus();
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showOfflineReady, setShowOfflineReady] = useState(false);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle network status changes
  useEffect(() => {
    if (isOffline) {
      setHasBeenOffline(true);
      setShowOfflineBanner(true);
    } else if (isOnline && hasBeenOffline) {
      setShowOfflineBanner(false);
      // Show brief "back online" message
      setShowOfflineReady(true);
      setTimeout(() => setShowOfflineReady(false), 3000);
    }
  }, [isOnline, isOffline, hasBeenOffline]);

  // Service worker update handler
  useEffect(() => {
    const handleUpdateAvailable = (registration: ServiceWorkerRegistration) => {
      setShowUpdateBanner(true);
      onUpdateAvailable?.(registration);
    };

    const handleOfflineReady = () => {
      if (!hasBeenOffline) {
        setShowOfflineReady(true);
        setTimeout(() => setShowOfflineReady(false), 5000);
      }
      onOfflineReady?.();
    };

    // These would be set up in the main app component
    // We'll expose them through a context or global event system
    window.addEventListener('sw-update-available', handleUpdateAvailable as EventListener);
    window.addEventListener('sw-offline-ready', handleOfflineReady as EventListener);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable as EventListener);
      window.removeEventListener('sw-offline-ready', handleOfflineReady as EventListener);
    };
  }, [hasBeenOffline, onUpdateAvailable, onOfflineReady]);

  const handleUpdateApp = async () => {
    setIsUpdating(true);
    try {
      skipWaiting();
      // The service worker will trigger a page reload
    } catch (error) {
      console.error('Failed to update app:', error);
      setIsUpdating(false);
    }
  };

  const dismissUpdateBanner = () => {
    setShowUpdateBanner(false);
  };

  const dismissOfflineBanner = () => {
    setShowOfflineBanner(false);
  };

  return (
    <>
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2 flex items-center justify-between shadow-lg">
          <div className="flex items-center">
            <WifiOff className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">
              You're offline. Some features may be limited.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissOfflineBanner}
            className="text-white hover:bg-orange-600 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Back Online Banner */}
      {showOfflineReady && isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-2 flex items-center justify-center shadow-lg">
          <Wifi className="h-5 w-5 mr-2" />
          <span className="text-sm font-medium">
            {hasBeenOffline ? 'Back online!' : 'App ready for offline use'}
          </span>
        </div>
      )}

      {/* Update Available Banner */}
      {showUpdateBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-center justify-between">
          <div className="flex items-center flex-1 mr-3">
            <Download className="h-5 w-5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">New version available!</p>
              <p className="text-xs opacity-90">Update now to get the latest features.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUpdateApp}
              disabled={isUpdating}
              className="text-white hover:bg-blue-700 text-xs px-3"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissUpdateBanner}
              className="text-white hover:bg-blue-700 h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Connection Status Indicator (small persistent indicator) */}
      <div className="fixed bottom-4 left-4 z-40">
        <div
          className={`flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            isOnline
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          } ${hasBeenOffline || !isOnline ? 'opacity-100' : 'opacity-0'}`}
        >
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3 mr-1" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Hook for components to check offline status and cached data availability
export const useOfflineStatus = () => {
  const { isOnline, isOffline } = useNetworkStatus();
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  useEffect(() => {
    // Check if service worker is active
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      setIsServiceWorkerReady(true);
    }

    const handleControllerChange = () => {
      setIsServiceWorkerReady(!!navigator.serviceWorker.controller);
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return {
    isOnline,
    isOffline,
    isServiceWorkerReady,
    canWorkOffline: isServiceWorkerReady || isOnline,
  };
};

export default OfflineNotification;