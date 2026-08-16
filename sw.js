/* Service worker de Vida de Ruta.
   Objetivo: que la app abra SIN SEÑAL. Cachea el shell (HTML + Leaflet) en la
   instalación y sirve desde caché cuando la red falla.
   Subí el número de VERSION cada vez que cambies vida-ruta.html, si no el
   celular sigue mostrando la versión vieja. */
const VERSION = 'vr-v7';
const SHELL = [
  './vida-ruta.html',
  './cocina.html',
  './panel-electrico.html',
  './croquis-motor.jpg',
  './manifest.webmanifest',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://www.gstatic.com/firebasejs/10.4.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      // addAll falla entero si un recurso falla; los agrego de a uno para que
      // una CDN caída no rompa la instalación completa.
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Firestore y los tiles del mapa NUNCA se cachean: son datos vivos.
  if (url.includes('firestore.googleapis.com') || url.includes('basemaps.cartocdn.com')) return;
  if (e.request.method !== 'GET') return;

  // Network-first con fallback a caché: si hay señal ves lo último,
  // si no hay señal la app abre igual.
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./vida-ruta.html')))
  );
});
