/* Para jugar sin internet: guarda una copia del juego la primera vez que se abre.
   Siempre intenta traer la versión nueva primero; si no hay internet, usa la copia guardada. */
const CACHE = 'habitos-v1';

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // solo el juego y three.js / las fuentes; nada más
  const propio = url.origin === self.location.origin;
  const externo = /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (!propio && !externo) return;
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return r;
      })
      .catch(() => caches.match(req, { ignoreSearch: propio }).then((r) => r || caches.match('juego.html'))),
  );
});
