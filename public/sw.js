const CACHE_NAME = 'game-night-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/scripts.js',
  '/manifest.json',
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
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

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
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
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});