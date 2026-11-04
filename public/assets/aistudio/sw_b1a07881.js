/* Service worker: caché de la app para uso sin conexión. Sube VERSION al publicar cambios. */
const VERSION = 'citricos-v1';
const FILES = ['./', 'index.html', 'tf.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  e.respondWith(
    caches.match(r, {ignoreSearch: true}).then(hit => hit || fetch(r).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
