/* Zoe's Princess Academy — offline shell + local assets. No analytics. */
const CACHE_NAME = 'zoe-academy-pwa-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './voice-file-map.json',
  './assets/anna.png',
  './assets/anna.webp',
  './assets/elsa.png',
  './assets/elsa.webp',
  './assets/zoe-avatar.png',
  './assets/zoe-avatar.webp',
  './assets/ariel.jpg',
  './assets/aurora.jpg',
  './assets/belle.jpg',
  './assets/cinderella.jpg',
  './assets/mulan.jpg',
  './assets/pocahontas.jpg',
  './assets/rapunzel.jpg',
  './assets/snow-white.jpg',
  './assets/tiana.jpg',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-512-maskable.png'
];

const RUNTIME_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
]);

async function precacheShell(cache) {
  await Promise.all(PRECACHE_URLS.map(async (url) => {
    try {
      await cache.add(url);
    } catch (error) {
      console.warn('Zoe PWA skipped', url, error);
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(precacheShell).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isHtmlRequest(request, url) {
  if (request.mode === 'navigate') return true;
  const dest = request.destination;
  if (dest === 'document') return true;
  return url.origin === self.location.origin && (url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('.html'));
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const fallback = await cache.match('./index.html');
    if (fallback) return fallback;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) {
    cache.put(request, fresh.clone());
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const allowedCdn = RUNTIME_HOSTS.has(url.hostname);
  if (!sameOrigin && !allowedCdn) return;

  if (sameOrigin && isHtmlRequest(event.request, url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
