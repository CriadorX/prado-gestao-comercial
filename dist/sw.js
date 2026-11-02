// Service Worker — Prado Gestão Comercial (PWA)
const CACHE_NAME = 'prado-cache-v20261029_login_fixed';
const ASSETS_TO_CACHE = [
  './favicon.ico',
  './favicon-solid.png',
  './logo-prado-premium.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
  // Nunca fazer cache de endpoints de API, scripts de autenticação ou HTML dinâmico
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('auth.js') ||
    event.request.url.includes('app.js') ||
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('api.whatsapp.com') ||
    event.request.url.includes('wa.me') ||
    event.request.url.includes('cdn.jsdelivr.net') ||
    event.request.url.includes('cdnjs.cloudflare.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
