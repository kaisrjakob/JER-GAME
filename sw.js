// Ohne Service Worker bietet Chrome auf Android keine Installation an.
//
// Bewusst cache-first aus einem atomar gefuellten Precache statt network-first:
// die Module haben keine Hashes im Namen, und bei network-first entscheidet jeder
// der elf Modul-Requests einzeln ueber Netz oder Cache. Dabei koennen Dateien aus
// zwei Veroeffentlichungen gemischt werden - etwa ein neues index.html mit einer
// alten src/config.js, deren Plattform-Koordinaten nicht mehr passen. Eine
// Cache-Generation wird deshalb komplett oder gar nicht uebernommen.
const CACHE = 'jeremias-v1';

const PRECACHE = [
  './',
  'index.html',
  'style.css',
  'game.js',
  'manifest.webmanifest',
  'src/audio.js',
  'src/config.js',
  'src/game.js',
  'src/quality.js',
  'src/renderer.js',
  'src/storage.js',
  'src/touch.js',
  'src/track.js',
  'src/viewport.js',
  'assets/jeremias-logo.png',
  'assets/reference-industry.png',
  'assets/favicon-32.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-maskable-512.png',
  'assets/apple-touch-icon.png',
  'assets/world-dw.jpg',
  'assets/world-industry.jpg',
  'assets/world-vision.jpg',
  'assets/game/player.png',
  'assets/game/clamp-band.png',
  'assets/game/dw-pipe.png',
  'assets/game/rain-cap.png',
  'assets/fonts/barlow-condensed-600.woff2',
  'assets/fonts/barlow-condensed-700.woff2',
  'assets/fonts/barlow-condensed-800.woff2',
  'assets/fonts/inter-400.woff2',
  'assets/fonts/inter-600.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // GitHub Pages liefert Cache-Control: max-age=600. Ohne 'reload' koennte der
    // Precache bis zu zehn Minuten alte Kopien einbetonieren.
    await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

// Kein automatisches skipWaiting: die Seite fragt nach und laedt selbst neu,
// damit nicht mitten im Laden eines Modulgraphen die Generation wechselt.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('index.html', { cacheName: CACHE });
      if (cached) return cached;
      try {
        return await fetch(request);
      } catch {
        return new Response('Offline und nicht im Zwischenspeicher.', { status: 503, headers: { 'content-type': 'text/plain' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { cacheName: CACHE });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  })());
});
