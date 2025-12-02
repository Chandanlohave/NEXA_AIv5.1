const CACHE_NAME = 'nexa-cache-v9'; // Incremented version
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Stale-while-revalidate strategy function
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponsePromise = await cache.match(request);

  const networkResponsePromise = fetch(request).then(response => {
    // If the fetch is successful and it's a valid response, update the cache
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(err => {
    console.warn(`[SW] Network request for ${request.url} failed:`, err);
    // If network fails, we rely on the cached response.
  });

  // Return cached response immediately if available, otherwise wait for the network.
  // If both fail, the request will fail, which is the expected behavior.
  return cachedResponsePromise || networkResponsePromise;
};


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL_URLS);
      })
      .then(() => self.skipWaiting()) // Activate new SW immediately
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME) // Filter out the current cache
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim()) // Take control of all open pages
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests -> Network only, never cache.
  if (url.hostname === 'generativelanguage.googleapis.com') {
    event.respondWith(fetch(request));
    return;
  }
  
  // For all other GET requests (app shell, JS, CSS, fonts), use stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});