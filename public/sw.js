const CACHE_NAME = 'chayanika-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force new service worker to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip Firestore and other Google API requests to avoid interference with real-time streams
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  // Network-first strategy: Always try to get the latest from the internet first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network fetch succeeds, update the cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // If network fails (offline), fall back to cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If not in cache and network failed, return a basic error response or let it fail
        // Returning a new Response avoids the "Failed to convert value to 'Response'" error
        return new Response('Network error occurred', {
          status: 408,
          statusText: 'Network error occurred',
        });
      })
  );
});
