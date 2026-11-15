const CACHE_NAME = 'partitur-player-v4';

// Helper to resolve paths relative to service worker location
const swLocation = self.location.pathname;
const basePath = swLocation.substring(0, swLocation.lastIndexOf('/') + 1);

const ASSETS_TO_CACHE = [
  basePath,
  basePath + 'index.html',
  basePath + 'manifest.webmanifest',
  basePath + 'icon.svg',
  basePath + 'soundfonts/0400_FluidR3_GM_sf2_file.js',
  basePath + 'soundfonts/0000_GeneralUserGS_sf2_file.js',
  basePath + 'soundfonts/0520_GeneralUserGS_sf2_file.js',
  basePath + 'soundfonts/0190_GeneralUserGS_sf2_file.js',
  basePath + 'soundfonts/0730_GeneralUserGS_sf2_file.js',
  basePath + 'soundfonts/0560_GeneralUserGS_sf2_file.js',
  basePath + 'soundfonts/0320_FluidR3_GM_sf2_file.js',
];

async function precacheBuildAssets(cache) {
  await cache.addAll(ASSETS_TO_CACHE);
  try {
    const res = await fetch(basePath + 'index.html', { cache: 'no-store' });
    const html = await res.text();
    await cache.put(basePath, new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
    await cache.put(basePath + 'index.html', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));

    // Cache hashed Vite bundle assets referenced in index.html
    const assetMatches = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)];
    const assetUrls = assetMatches.map((m) => {
      const url = m[1];
      if (url.startsWith('http')) return url;
      if (url.startsWith('./')) return basePath + url.slice(2);
      if (url.startsWith('/')) return url;
      return basePath + url;
    });
    if (assetUrls.length > 0) {
      await cache.addAll(assetUrls);
    }
  } catch (err) {
    console.warn('Could not precache build assets:', err);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => precacheBuildAssets(cache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navigation requests (HTML page)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(basePath, clone.clone());
              cache.put(basePath + 'index.html', clone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(basePath + 'index.html').then((r) => r || caches.match(basePath)))
    );
    return;
  }

  // Static assets
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(req).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (req.url.startsWith('http') || req.url.startsWith('/'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
