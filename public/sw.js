/* Chess Champs service worker — offline-first shell caching. */
const CACHE = 'chess-champs-v1';

/* Pages and assets to precache on install. */
const PRECACHE = ['/', '/play', '/campaign', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => { /* network unavailable during install — ignore */ }))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  /* Cache-first for audio, icons, stockfish, and webmanifest. */
  const isCacheFirst =
    url.pathname.startsWith('/audio/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/stockfish') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('.wasm');

  if (isCacheFirst) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ??
          fetch(e.request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  /* Network-first (with cache fallback) for everything else. */
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r ?? Response.error()))
  );
});
