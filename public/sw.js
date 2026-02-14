// Guid Service Worker
// Version-based cache naming for easy invalidation on deploy
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `guid-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `guid-runtime-${CACHE_VERSION}`;
const GUIDE_CACHE = `guid-guides-${CACHE_VERSION}`;
const MAX_CACHED_GUIDES = 20;
const MAX_STATIC_ENTRIES = 200;
const MAX_RUNTIME_ENTRIES = 100;

// ── Cache Size Limiter ─────────────────────────────────
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // FIFO eviction — delete oldest entries first
    const excess = keys.length - maxEntries;
    for (let i = 0; i < excess; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
];

// ── Install ────────────────────────────────────────────────
// Pre-cache essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────
// Clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete caches that don't match the current version
            return (
              name.startsWith('guid-') &&
              name !== STATIC_CACHE &&
              name !== RUNTIME_CACHE &&
              name !== GUIDE_CACHE
            );
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cross-origin: serve cached IKEA images from guide cache when offline
  if (url.origin !== self.location.origin) {
    if (
      (url.hostname.endsWith('.ikea.com') || url.hostname.endsWith('.ikeaimg.com')) &&
      request.method === 'GET'
    ) {
      event.respondWith(guideCacheFirst(request));
    }
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // ── Network-first: API routes, auth, dynamic pages ──
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/studio/')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── Cache-first: static assets (JS, CSS, fonts, images) ──
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Network-first: all other navigation/page requests ──
  event.respondWith(networkFirst(request));
});

// ── Strategies ─────────────────────────────────────────────

// Try network first, fall back to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses for offline fallback
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // If no cache available and it's a navigation request, show offline page
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('Offline', { status: 503 });
  }
}

// Try cache first, fall back to network (and update cache)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
      trimCache(STATIC_CACHE, MAX_STATIC_ENTRIES);
    }
    return networkResponse;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ── Guide Cache: cache-first for saved guide images ────────
async function guideCacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ── Premium Guide Caching ──────────────────────────────────
// Client sends messages to cache/uncache guide content for offline access.
// Premium check is done client-side before sending the message.
self.addEventListener('message', (event) => {
  const { type, urls, articleNumber } = event.data || {};

  if (type === 'CACHE_GUIDE') {
    event.waitUntil(cacheGuideUrls(urls, articleNumber));
  }

  if (type === 'UNCACHE_GUIDE') {
    event.waitUntil(uncacheGuideUrls(urls));
  }

  if (type === 'GET_CACHED_GUIDES') {
    event.waitUntil(
      getCachedGuideKeys().then((keys) => {
        event.source.postMessage({ type: 'CACHED_GUIDES', keys });
      })
    );
  }
});

async function cacheGuideUrls(urls, articleNumber) {
  if (!urls || !urls.length) return;
  const cache = await caches.open(GUIDE_CACHE);

  // Cache each URL, ignoring failures for individual resources
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { mode: url.startsWith('http') && !url.startsWith(self.location.origin) ? 'cors' : 'same-origin' });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
        // Skip resources that fail to fetch
      }
    })
  );

  // Notify client of completion
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'GUIDE_CACHED',
      articleNumber,
      cachedCount: results.filter((r) => r.status === 'fulfilled').length,
    });
  });
}

async function uncacheGuideUrls(urls) {
  if (!urls || !urls.length) return;
  const cache = await caches.open(GUIDE_CACHE);
  await Promise.all(urls.map((url) => cache.delete(url)));
}

async function getCachedGuideKeys() {
  const cache = await caches.open(GUIDE_CACHE);
  const keys = await cache.keys();
  return keys.map((req) => req.url);
}
