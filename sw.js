const CACHE_NAME = 'vida-ruta-v1';

// Instalar SW
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activar SW
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Red primero, luego caché
self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  // Para HTML: red primero
  if (request.url.includes('.html') || request.url.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache).catch(() => {});
            });
            return response;
          }
          return caches.match(request) || response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Para otros recursos: caché primero
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache).catch(() => {});
          });
          return response;
        });
      })
      .catch(() => {
        // Offline - retornar lo que tengamos cacheado
        return caches.match(request);
      })
  );
});