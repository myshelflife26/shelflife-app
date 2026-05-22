// ShelfLife Service Worker
// Provides offline caching and background sync capabilities

const CACHE_NAME = 'shelflife-v1';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const IMAGE_CACHE = `${CACHE_NAME}-images`;

// Cache version for cache busting
const CACHE_VERSION = '1.0.0';

// Files to cache immediately (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add other critical static assets
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: 'cache-first',
  // Network first for API calls and dynamic content
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate for frequently updated content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Cache only for offline fallbacks
  CACHE_ONLY: 'cache-only',
  // Network only for always-fresh content
  NETWORK_ONLY: 'network-only'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('shelflife-') && !cacheName.includes(CACHE_VERSION)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  try {
    // Determine cache strategy based on request type
    if (isStaticAsset(url)) {
      return await cacheFirstStrategy(request, STATIC_CACHE);
    } else if (isImageRequest(url)) {
      return await cacheFirstStrategy(request, IMAGE_CACHE);
    } else if (isAPIRequest(url)) {
      return await networkFirstStrategy(request, DYNAMIC_CACHE);
    } else if (isDynamicContent(url)) {
      return await staleWhileRevalidateStrategy(request, DYNAMIC_CACHE);
    } else {
      // Default to network first
      return await networkFirstStrategy(request, DYNAMIC_CACHE);
    }
  } catch (error) {
    console.error('Service Worker: Error handling request:', error);
    return await getOfflineFallback(request);
  }
}

// Cache First Strategy - good for static assets
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Network request failed:', error);
    throw error;
  }
}

// Network First Strategy - good for API calls
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy - good for frequently updated content
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Start network request in background
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.log('Service Worker: Background update failed:', error);
  });

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Wait for network response if no cache
  return await networkResponsePromise;
}

// Request type detection
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.html', '.json', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         url.pathname === '/' ||
         url.pathname.includes('/assets/');
}

function isImageRequest(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.avif'];
  return imageExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext));
}

function isAPIRequest(url) {
  return url.pathname.includes('/api/') ||
         url.hostname.includes('firestore') ||
         url.hostname.includes('firebase') ||
         url.hostname.includes('googleapis');
}

function isDynamicContent(url) {
  return !isStaticAsset(url) && !isImageRequest(url) && !isAPIRequest(url);
}

// Offline fallbacks
async function getOfflineFallback(request) {
  const cache = await caches.open(STATIC_CACHE);

  // Try to return cached version of the same request
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // For navigation requests, return cached index.html
  if (request.mode === 'navigate') {
    const indexResponse = await cache.match('/index.html');
    if (indexResponse) {
      return indexResponse;
    }
  }

  // Return a generic offline page or error
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This content is not available offline'
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// Background sync for when network returns
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync event:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync any queued data when network is available
    // This could sync offline actions, error reports, etc.
    console.log('Service Worker: Performing background sync');

    // Example: Sync queued error reports
    await syncErrorReports();

  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

async function syncErrorReports() {
  // Get stored error reports from indexedDB or localStorage
  try {
    const storedErrors = JSON.parse(localStorage.getItem('shelflife_pending_errors') || '[]');

    if (storedErrors.length > 0) {
      console.log(`Service Worker: Syncing ${storedErrors.length} error reports`);

      // Clear pending errors after successful sync
      localStorage.removeItem('shelflife_pending_errors');
    }
  } catch (error) {
    console.error('Service Worker: Error syncing reports:', error);
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.url
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data)
    );
  }
});

// Message handling for communication with main app
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);

  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({
        type: 'VERSION',
        payload: CACHE_VERSION
      });
      break;

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({
          type: 'CACHE_CLEARED',
          payload: true
        });
      });
      break;

    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName.startsWith('shelflife-')) {
        return caches.delete(cacheName);
      }
    })
  );
}

console.log('Service Worker: Script loaded');