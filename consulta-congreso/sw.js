/* Service worker — Consulta Congreso (offline-first) */
const CACHE = "consulta-congreso-v2";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./cargar.html",
  "./instalar.html",
  "./manifest.webmanifest",
  "./css/fonts.css?v=1",
  "./css/styles.css?v=2",
  "./css/instalar.css?v=1",
  "./css/cargar.css?v=2",
  "./js/vendor/xlsx.full.min.js?v=1",
  "./js/i18n-dict.js?v=2",
  "./js/i18n.js?v=1",
  "./js/store.js?v=1",
  "./js/normalize.js?v=2",
  "./js/excel-import.js?v=1",
  "./js/app.js?v=2",
  "./js/install.js?v=1",
  "./js/cargar.js?v=3",
  "./data/evento.ejemplo.json?v=1",
  "./data/evento.ejemplo.json",
  "./data/evento.radu-larioja-2026.json?v=1",
  "./data/evento.radu-larioja-2026.json",
  "./assets/Cronograma_RADU_La_Rioja_2026.pdf",
  "./assets/samples/CH_Trabajos_Ciencias_Humanas.xlsx",
  "./assets/samples/CS_Trabajos_Ciencias_Sociales.xlsx",
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
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "reload" });
        if (!res.ok) throw new Error(String(res.status));
        await cache.put(url, res.clone());
      } catch (err) {
        console.warn("[CC SW] miss", url, err);
      }
    })
  );
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
  return (await caches.match(req)) || (await caches.match(new URL(req.url).pathname));
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
      return (await caches.match("./index.html")) || (await caches.match("./")) || Response.error();
    }
    throw _e;
  }
}

async function staleWhileRevalidate(req) {
  const cached = await fromCache(req);
  const networked = fetch(req)
    .then((res) => {
      putCache(req, res);
      return res;
    })
    .catch(() => null);
  if (cached) {
    networked.catch(() => {});
    return cached;
  }
  const res = await networked;
  if (res) return res;
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
  event.respondWith(
    staleWhileRevalidate(req).catch(async () => (await fromCache(req)) || Response.error())
  );
});
