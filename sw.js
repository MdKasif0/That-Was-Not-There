/* ── Service Worker — cache-first for offline play ────── */
const CACHE = 'twnt-v1';
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
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
