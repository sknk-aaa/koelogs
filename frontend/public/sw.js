const CACHE_VERSION = "koelogs-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const SHELL_URLS = ["/", "/log", "/manifest.webmanifest", "/Koelog-icon.png", "/koelog-app-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key === SHELL_CACHE || key === ASSET_CACHE) return Promise.resolve(false);
            return caches.delete(key);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/log", copy)).catch(() => undefined);
          return response;
        })
        .catch(async () => (await caches.match("/log")) || (await caches.match("/")))
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/guide/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js");

  if (!isStaticAsset) return;

  const isBuildAsset =
    url.pathname.startsWith("/assets/") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js");

  event.respondWith(
    (async () => {
      if (isBuildAsset) {
        try {
          const response = await fetch(request, { cache: "no-store" });
          if (response.ok) {
            const cache = await caches.open(ASSET_CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          throw error;
        }
      }

      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(ASSET_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })()
  );
});
