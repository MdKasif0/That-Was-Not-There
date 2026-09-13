/* ── Service Worker — network-first for live updates, cache fallback for offline ────── */
const CACHE = 'twnt-v2';
const ASSETS = [
  './',
  './index.html',
  './styles/main.css',
  './src/main.js',
  './src/game.js',
  './src/input.js',
  './src/renderer.js',
  './src/physics.js',
  './src/collision.js',
  './src/levels.js',
  './src/traps.js',
  './src/state.js',
  './src/constants.js',
  './assets/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
