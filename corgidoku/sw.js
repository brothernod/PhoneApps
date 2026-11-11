// Offline support. Network first, so a fresh push shows up right away;
// the cache is only used when there's no connection.
const CACHE = 'corgidoku-1.25'; // keep in step with VERSION in app.js
const FILES = ['./', 'index.html', 'app.js', 'engine.js', 'art.js', 'shop.js', 'scenes.js', 'puzzles.json', 'puzzles-hard.json', 'puzzles-extreme.json', 'puzzles-kids.json', 'manifest.webmanifest', 'apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
