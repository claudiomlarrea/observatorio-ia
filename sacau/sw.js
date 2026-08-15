/* Forzar red de /sacau/ para no reutilizar la ficha de bloqueo en caché. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/sacau")) return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" }).catch(() => fetch(event.request))
  );
});
