/* Service Worker for CitrusVision Offline PWA */
const CACHE_NAME = 'citrus-vision-v1.1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'assets/aistudio/icon-192_9d3f1cae.png',
  'assets/aistudio/icon-512_c1c4b7ac.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          // Non-blocking
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // For navigation requests (loading pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('./') || caches.match('index.html');
      })
    );
    return;
  }

  // Same-origin assets: Stale-While-Revalidate / Cache-First
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch in background to update cache
          fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkResponse;
        });
      })
    );
  }
});
