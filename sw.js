const CACHE_NAME = 'vida-ruta-v1';
const urlsToCache = [
  '/vida-ruta_3.html',
  '/manifest.webmanifest',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

// Instalar SW y cachear archivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(() => {
        // Si falla el caché completo, continúa igual (modo offline)
        console.log('Algunos archivos no se pudieron cachear, pero la app funcionará en modo local');
      });
    })
  );
  self.skipWaiting();
});

// Actualizar SW automáticamente
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

// Estrategia de red primero, con fallback a caché
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar GET
  if (request.method !== 'GET') {
    return;
  }

  // Para el HTML principal: intentar red, fallback caché
  if (request.url.includes('vida-ruta_3.html') || request.url.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            // Cachear la versión nueva
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
            return response;
          }
          throw new Error('HTTP error: ' + response.status);
        })
        .catch(() => {
          // Si falla la red, usar caché
          return caches.match(request);
        })
    );
    return;
  }

  // Para otros recursos: caché primero, fallback red
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(response => {
        // Cachear recursos nuevos en segundo plano
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      });
    }).catch(() => {
      // Offline sin caché disponible
      console.log('Modo offline: ' + request.url);
    })
  );
});

// Notificar al cliente cuando hay actualizaciones
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
