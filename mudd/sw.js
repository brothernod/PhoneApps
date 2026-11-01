// Offline support. Network first, so a fresh push shows up right away;
// the cache is only used when there's no Wi-Fi.
const CACHE = 'mudd-el-morro-v1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png',
  'vendor/ink-full.js', 'vendor/js-yaml.min.js',
  'engine/main.js', 'engine/screen.js', 'engine/art.js', 'engine/sound.js', 'engine/puzzles.js', 'engine/util.js',
  'games/el-morro/story.ink', 'games/el-morro/banks.yaml',
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
