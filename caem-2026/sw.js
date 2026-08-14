/* Service worker — App de Consulta CAEM 2026 */
const CACHE = "caem-2026-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./instalar.html",
  "./manifest.webmanifest",
  "./css/styles.css?v=15",
  "./js/i18n-dict.js?v=15",
  "./js/i18n.js?v=15",
  "./js/app.js?v=15",
  "./js/install.js?v=15",
  "./data/programa.json?v=15",
  "./assets/logo-caem.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-180.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networked = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
