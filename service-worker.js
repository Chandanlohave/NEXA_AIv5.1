const CACHE_NAME = 'nexa-cache-v10-prod';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Stale-while-revalidate strategy
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponsePromise = await cache.match(request);

  const networkResponsePromise = fetch(request).then(response => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(err => {
    // Network failed, rely on cache
  });

  return cachedResponsePromise || networkResponsePromise;
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Network Only for API
  if (url.hostname.includes('googleapis.com')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Stale-While-Revalidate for everything else
  event.respondWith(staleWhileRevalidate(request));
});