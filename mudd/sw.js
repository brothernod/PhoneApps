// Offline support. Network first, so a fresh push shows up right away;
// the cache is only used when there's no Wi-Fi.
// The shell and engine are listed here. The game pack (story, data, pictures)
// isn't: the engine sends its file list once the pack has loaded ("keep").
const CACHE = 'mudd-v2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png',
  'vendor/ink-full.js', 'vendor/js-yaml.min.js', 'vendor/vt323.woff2',
  'engine/main.js', 'engine/screen.js', 'engine/art.js', 'engine/sound.js',
  'engine/pack.js', 'engine/dealer.js', 'engine/quest.js', 'engine/puzzles.js', 'engine/util.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => {
  const msg = e.data || {};
  if (msg.type !== 'keep' || !Array.isArray(msg.files)) return;
  const mine = msg.files.filter((f) => new URL(f, location.href).origin === location.origin);
  // One at a time, so a single missing file doesn't stop the rest.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(mine.map((f) => c.add(f).catch(() => {})))));
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
