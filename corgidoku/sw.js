// Offline support. Network first, so a fresh push shows up right away,
// but with a time limit: on a weak signal the saved copy is used after
// WAIT ms while the network reply (if it ever comes) refreshes the cache.
const CACHE = 'corgidoku-1.34'; // keep in step with VERSION in app.js
const WAIT = 3000;
const FILES = ['./', 'index.html', 'app.js', 'engine.js', 'art.js', 'shop.js', 'share.js', 'scenes.js', 'puzzles.json', 'puzzles-hard.json', 'puzzles-extreme.json', 'puzzles-kids.json', 'wild.json', 'bonus-cozy.json', 'bonus-hard.json', 'bonus-extreme.json', 'bonus-kids.json', 'manifest.webmanifest', 'apple-touch-icon.png'];

// When the page itself had to come from the cache, the files it loads in
// the next few seconds come from the cache too, so a slow release push
// can't mix a new index.html with an old app.js (or the other way round).
let slowUntil = 0;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

function refresh(req) {
  return fetch(req).then((res) => {
    if (res.ok && new URL(req.url).origin === location.origin) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  });
}
const saved = (req) => caches.match(req, { ignoreSearch: true });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const page = req.mode === 'navigate';
  const net = refresh(req);
  e.waitUntil(net.catch(() => {})); // let a late reply still land in the cache

  if (!page && Date.now() < slowUntil) {
    e.respondWith(saved(req).then((hit) => hit || net));
    return;
  }
  e.respondWith(new Promise((resolve, reject) => {
    let done = false;
    const useCache = (fromError) => saved(req).then((hit) => {
      if (done) return;
      if (hit) {
        done = true;
        if (page) slowUntil = Date.now() + 10000;
        resolve(hit);
      } else if (fromError) {
        done = true;
        reject(new Error('offline and not saved'));
      } // timed out with nothing saved: keep waiting for the network
    });
    const timer = setTimeout(() => useCache(false), WAIT);
    net.then((res) => { if (!done) { done = true; clearTimeout(timer); resolve(res); } },
      () => { clearTimeout(timer); if (!done) useCache(true); });
  }));
});
