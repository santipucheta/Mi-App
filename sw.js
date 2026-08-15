/* Vida de Ruta - service worker
   v2: nunca devuelve undefined y reemplaza cualquier version anterior */
const CACHE = 'vida-ruta-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // Solo GET del mismo origen. Todo lo demas pasa de largo.
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  const esPagina = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';

  if (esPagina) {
    // Red primero. Si no hay red: lo cacheado, y si no, la raiz.
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then(hit => hit || caches.match('/'))
            .then(hit => hit || new Response(
              '<meta charset="utf-8"><h2 style="font-family:system-ui;padding:24px">Sin conexion</h2>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            ))
        )
    );
    return;
  }

  // Recursos: cache primero, red despues.
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
          }
          return res;
        })
        .catch(() => new Response('', { status: 504 }));
    })
  );
});
