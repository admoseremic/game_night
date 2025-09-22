// Update this version number whenever you need to force cache refresh
const CACHE_VERSION = 'v3-2025-09-22';  // Changed from v2 to v3
const CACHE_NAME = `game-night-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/scripts.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // External CDN resources for offline functionality
  'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css',
  'https://cdn.datatables.net/1.11.3/css/jquery.dataTables.min.css',
  'https://cdn.jsdelivr.net/npm/select2/dist/css/select2.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://code.jquery.com/jquery-3.5.1.js',
  'https://cdn.datatables.net/1.11.3/js/jquery.dataTables.min.js',
  'https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js',
  'https://cdn.jsdelivr.net/npm/select2/dist/js/select2.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  // Force the new service worker to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.log('Cache install failed:', error);
        // Don't fail installation if some external resources can't be cached
        return caches.open(CACHE_NAME)
          .then(cache => {
            // Cache at least the essential local files
            return cache.addAll([
              '/',
              '/index.html',
              '/scripts.js',
              '/manifest.json'
            ]);
          });
      })
  );
});

// Fetch event - Network first for HTML/JS, cache first for assets
self.addEventListener('fetch', event => {
  // For HTML and JS files, try network first (to get latest updates)
  if (event.request.url.includes('.html') || 
      event.request.url.includes('.js') || 
      event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with fresh response
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
  } else {
    // For other resources (CSS, images, etc.), use cache first
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
        .catch(() => {
          // If both cache and network fail, return offline page for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        })
    );
  }
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all([
        // Delete all old caches
        ...cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('game-night-')) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }),
        // Take control of all clients immediately
        clients.claim()
      ]);
    })
  );
});