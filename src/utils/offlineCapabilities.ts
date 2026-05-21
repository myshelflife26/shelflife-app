// Offline capability checking and management

export interface OfflineCapabilities {
  isServiceWorkerActive: boolean;
  hasCachedApp: boolean;
  canWorkOffline: boolean;
  lastCacheUpdate: Date | null;
  estimatedStorageUsage: number;
}

class OfflineCapabilitiesService {
  private readonly CACHE_PREFIX = 'shelflife-v1';

  async getCapabilities(): Promise<OfflineCapabilities> {
    const capabilities: OfflineCapabilities = {
      isServiceWorkerActive: this.isServiceWorkerActive(),
      hasCachedApp: false,
      canWorkOffline: false,
      lastCacheUpdate: null,
      estimatedStorageUsage: 0,
    };

    if ('caches' in window) {
      try {
        // Check if app shell is cached
        capabilities.hasCachedApp = await this.isAppCached();
        capabilities.lastCacheUpdate = await this.getLastCacheUpdate();
        capabilities.estimatedStorageUsage = await this.getStorageUsage();
      } catch (error) {
        console.error('Error checking cache capabilities:', error);
      }
    }

    capabilities.canWorkOffline =
      capabilities.isServiceWorkerActive &&
      capabilities.hasCachedApp &&
      this.hasOfflineDataCapabilities();

    return capabilities;
  }

  private isServiceWorkerActive(): boolean {
    return 'serviceWorker' in navigator &&
           navigator.serviceWorker.controller !== null;
  }

  private async isAppCached(): Promise<boolean> {
    try {
      const cache = await caches.open(`${this.CACHE_PREFIX}-static`);
      const cachedRequests = await cache.keys();

      // Check if critical app resources are cached
      const criticalResources = ['/', '/index.html'];
      const hasCriticalResources = criticalResources.every(resource =>
        cachedRequests.some(request =>
          request.url.endsWith(resource) || request.url.includes(resource)
        )
      );

      return hasCriticalResources && cachedRequests.length > 0;
    } catch (error) {
      console.error('Error checking app cache:', error);
      return false;
    }
  }

  private async getLastCacheUpdate(): Promise<Date | null> {
    try {
      const cacheNames = await caches.keys();
      const shelflifeCaches = cacheNames.filter(name => name.startsWith(this.CACHE_PREFIX));

      if (shelflifeCaches.length === 0) {
        return null;
      }

      // Get the most recent cache creation time (approximation)
      // In a real implementation, you'd store this timestamp explicitly
      const cache = await caches.open(shelflifeCaches[0]);
      const keys = await cache.keys();

      if (keys.length > 0) {
        const response = await cache.match(keys[0]);
        if (response && response.headers.has('date')) {
          return new Date(response.headers.get('date')!);
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting last cache update:', error);
      return null;
    }
  }

  private async getStorageUsage(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error estimating storage usage:', error);
      return 0;
    }
  }

  private hasOfflineDataCapabilities(): boolean {
    // Check if browser supports offline storage mechanisms
    return 'localStorage' in window &&
           'indexedDB' in window &&
           'caches' in window;
  }

  async clearAllCaches(): Promise<boolean> {
    try {
      const cacheNames = await caches.keys();
      const shelflifeCaches = cacheNames.filter(name => name.startsWith(this.CACHE_PREFIX));

      const deletePromises = shelflifeCaches.map(cacheName => caches.delete(cacheName));
      await Promise.all(deletePromises);

      console.log(`Cleared ${shelflifeCaches.length} caches`);
      return true;
    } catch (error) {
      console.error('Error clearing caches:', error);
      return false;
    }
  }

  async preloadCriticalResources(resources: string[] = []): Promise<void> {
    if (!this.isServiceWorkerActive()) {
      console.log('Service worker not active, skipping preload');
      return;
    }

    const defaultResources = [
      '/',
      '/index.html',
      '/manifest.json',
    ];

    const resourcesToCache = [...defaultResources, ...resources];

    try {
      const cache = await caches.open(`${this.CACHE_PREFIX}-preload`);
      await cache.addAll(resourcesToCache);
      console.log(`Preloaded ${resourcesToCache.length} resources`);
    } catch (error) {
      console.error('Error preloading resources:', error);
    }
  }

  async warmUpCache(): Promise<void> {
    // Warm up the cache by making requests to key endpoints
    const endpoints = [
      '/api/figures',
      '/api/user/profile',
    ];

    const warmUpPromises = endpoints.map(async (endpoint) => {
      try {
        // Make a silent request to warm up the cache
        await fetch(endpoint, {
          method: 'GET',
          cache: 'default',
          credentials: 'include'
        });
      } catch (error) {
        // Ignore errors during warm-up
        console.log(`Cache warm-up failed for ${endpoint}:`, error);
      }
    });

    await Promise.allSettled(warmUpPromises);
  }

  // Check if app can function offline based on available data
  async canFunctionOffline(): Promise<{
    canFunction: boolean;
    limitations: string[];
    suggestions: string[];
  }> {
    const capabilities = await this.getCapabilities();
    const limitations: string[] = [];
    const suggestions: string[] = [];

    if (!capabilities.isServiceWorkerActive) {
      limitations.push('Service worker not active');
      suggestions.push('Refresh the page to activate offline support');
    }

    if (!capabilities.hasCachedApp) {
      limitations.push('App not cached for offline use');
      suggestions.push('Visit the app while online to cache content');
    }

    // Check for stored data
    const hasLocalData = this.hasStoredUserData();
    if (!hasLocalData) {
      limitations.push('No user data cached locally');
      suggestions.push('Use the app while online to cache your collection data');
    }

    const canFunction = capabilities.canWorkOffline && limitations.length === 0;

    return {
      canFunction,
      limitations,
      suggestions,
    };
  }

  private hasStoredUserData(): boolean {
    try {
      // Check for basic user data in localStorage
      const hasUserPrefs = localStorage.getItem('user_preferences') !== null;
      const hasCollectionData = localStorage.getItem('cached_collection') !== null;

      return hasUserPrefs || hasCollectionData;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
export const offlineCapabilities = new OfflineCapabilitiesService();

// React hook for offline capabilities
export const useOfflineCapabilities = () => {
  const [capabilities, setCapabilities] = React.useState<OfflineCapabilities | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const loadCapabilities = async () => {
      try {
        const caps = await offlineCapabilities.getCapabilities();
        if (isMounted) {
          setCapabilities(caps);
        }
      } catch (error) {
        console.error('Failed to load offline capabilities:', error);
        if (isMounted) {
          setCapabilities({
            isServiceWorkerActive: false,
            hasCachedApp: false,
            canWorkOffline: false,
            lastCacheUpdate: null,
            estimatedStorageUsage: 0,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCapabilities();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshCapabilities = React.useCallback(async () => {
    setLoading(true);
    const caps = await offlineCapabilities.getCapabilities();
    setCapabilities(caps);
    setLoading(false);
  }, []);

  return {
    capabilities,
    loading,
    refreshCapabilities,
  };
};

import React from 'react';

export default offlineCapabilities;