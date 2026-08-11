const CACHE_NAME = "devplay-shell-v1";
const PUBLIC_SHELL = ["/", "/products", "/manifest.webmanifest", "/devplay-icon.svg", "/devplay-icon-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")).then((response) => response || Response.error()));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:css|js|svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});
