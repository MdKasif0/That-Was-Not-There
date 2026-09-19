/**
 * ═══════════════════════════════════════════════════════════
 * Service Worker — That Was Not There
 * ═══════════════════════════════════════════════════════════
 * 
 * Production-quality offline caching:
 * - Versioned Cache Storage
 * - Cache-first strategy for local core application assets
 * - Safe cache pruning on activation
 * - Immediate client claiming and skipWaiting
 * - Zero third-party runtime dependencies cached
 */

const CACHE_VERSION = 'twnt-v4.1.0';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
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
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
];

/* ── Install ────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

/* ── Activate (Prune Outdated Caches) ──────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

/* ── Fetch ──────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Do not intercept or cache cross-origin / third-party requests
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset immediately for instant offline play
        // In background, refresh from network if available
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, clone);
            });
          }
        }).catch(() => {
          // Network unavailable; cached response was already served
        });

        return cachedResponse;
      }

      // If not in cache, fetch from network and cache successful response
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const clone = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(event.request, clone);
        });

        return networkResponse;
      }).catch(() => {
        // If network failed and it's a navigation request, serve index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});

/* ── Message Listener ──────────────────────────────────── */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
