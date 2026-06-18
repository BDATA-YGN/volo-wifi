/* VOLO Collector PWA service worker — scope /collector/ */
const CACHE_VERSION = "volo-collector-v2";
const PRECACHE_URLS = ["/collector", "/collector/login", "/assets/fav.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (
    url.pathname.startsWith("/console") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes("/socket")
  ) {
    return;
  }

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) => cached ?? caches.match("/collector")),
    ),
  );
});
