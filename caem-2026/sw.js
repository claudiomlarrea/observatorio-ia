/* Service worker — bridge to Firebase host for printed QR / old installs */
const CACHE = "caem-2026-v23-redirect";
const DEST = "https://caem-2026-app.web.app/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
      try {
        await self.registration.unregister();
      } catch (_e) {}
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(
        clients.map((client) => {
          try {
            return client.navigate(DEST);
          } catch (_err) {
            return null;
          }
        })
      );
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(Response.redirect(DEST, 302));
    return;
  }
  event.respondWith(fetch(req).catch(() => Response.error()));
});
