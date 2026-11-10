// Offline support. Network first, so a fresh push shows up right away;
// the cache is only used when there's no connection.
const CACHE = 'cptd-study-v5';
const FILES = [
  './', 'index.html', 'app.js', 'content.js', 'content-merge.js', 'manifest.webmanifest',
  // Domain 2: metadata, then one file per area.
  'content-d2.js', 'content-d2-learn.js', 'content-d2-design.js', 'content-d2-techkm.js', 'content-d2-people.js', 'content-d2-eval.js',
  // Domain 3: metadata, then one file per area.
  'content-d3.js', 'content-d3-biz.js', 'content-d3-od.js', 'content-d3-strategy.js', 'content-d3-market.js', 'content-d3-perf.js', 'content-d3-data.js', 'content-d3-change.js',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
  'fonts/atkinson-hyperlegible-next-latin-400-normal.woff2',
  'fonts/atkinson-hyperlegible-next-latin-400-italic.woff2',
  'fonts/atkinson-hyperlegible-next-latin-700-normal.woff2',
  'fonts/atkinson-hyperlegible-next-latin-800-normal.woff2',
];
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
