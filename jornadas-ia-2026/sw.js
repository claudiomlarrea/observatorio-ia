/* Service worker — App de Consulta Jornadas IA 2026 (offline-first) */
const CACHE = "jornadas-ia-2026-v3";
const DATA_VERSION = "3";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./instalar.html",
  "./manifest.webmanifest",
  "./css/fonts.css?v=1",
  "./css/styles.css?v=1",
  "./css/instalar.css?v=1",
  "./js/i18n-dict.js?v=1",
  "./js/i18n.js?v=1",
  "./js/app.js?v=3",
  "./js/install.js?v=1",
  `./data/programa.json?v=${DATA_VERSION}`,
  "./data/programa.json",
  "./assets/logo-observatorio-ia.png",
  "./assets/logo-observatorio-ia-circle.png",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-512-maskable.png",
  "./fonts/montserrat-latin-600-normal.woff2",
  "./fonts/montserrat-latin-700-normal.woff2",
  "./fonts/montserrat-latin-800-normal.woff2",
  "./fonts/montserrat-latin-ext-600-normal.woff2",
  "./fonts/montserrat-latin-ext-700-normal.woff2",
  "./fonts/montserrat-latin-ext-800-normal.woff2",
  "./fonts/open-sans-latin-400-normal.woff2",
  "./fonts/open-sans-latin-500-normal.woff2",
  "./fonts/open-sans-latin-600-normal.woff2",
  "./fonts/open-sans-latin-700-normal.woff2",
  "./fonts/open-sans-latin-ext-400-normal.woff2",
  "./fonts/open-sans-latin-ext-500-normal.woff2",
  "./fonts/open-sans-latin-ext-600-normal.woff2",
  "./fonts/open-sans-latin-ext-700-normal.woff2",
];

async function precache(cache, urls) {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "reload" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await cache.put(url, res.clone());
        return true;
      } catch (err) {
        console.warn("[Jornadas IA SW] precache miss", url, err);
        return false;
      }
    })
  );
  return results.filter(Boolean).length;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await precache(cache, CORE_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNavigation(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

async function fromCache(req) {
  const direct = await caches.match(req);
  if (direct) return direct;
  const url = new URL(req.url);
  const bare = await caches.match(url.pathname);
  if (bare) return bare;
  if (url.search) {
    const noQuery = await caches.match(url.pathname + url.search);
    if (noQuery) return noQuery;
  }
  return null;
}

async function putCache(req, res) {
  if (!res || !res.ok) return;
  try {
    const cache = await caches.open(CACHE);
    await cache.put(req, res.clone());
  } catch (_e) {}
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    putCache(req, res);
    return res;
  } catch (_e) {
    const cached = await fromCache(req);
    if (cached) return cached;
    if (isNavigation(req)) {
      return (
        (await caches.match("./index.html")) ||
        (await caches.match("./")) ||
        Response.error()
      );
    }
    throw _e;
  }
}

async function staleWhileRevalidate(req) {
  const cached = await fromCache(req);
  const networkPromise = fetch(req)
    .then((res) => {
      putCache(req, res);
      return res;
    })
    .catch(() => null);
  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }
  const networked = await networkPromise;
  if (networked) return networked;
  throw new Error("offline miss");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (!sameOrigin(url)) return;

  if (isNavigation(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // El programa debe ir a red primero (si no, la agenda queda con datos viejos)
  if (url.pathname.endsWith("/data/programa.json") || url.pathname.endsWith("programa.json")) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(
    staleWhileRevalidate(req).catch(async () => {
      const cached = await fromCache(req);
      return cached || Response.error();
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          return;
        }
      }
      if (clients.openWindow) await clients.openWindow("./");
    })()
  );
});
