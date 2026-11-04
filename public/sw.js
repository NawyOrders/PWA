const VERSION = "nawy-orders-v2";

const CORE = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/logo.svg",
  "/images/burger.webp",
  "/images/banner.webp",
];

// Account and checkout pages must never be written to the HTTP cache: a shared
// device could otherwise see a previous customer's session shell after logout.
const PRIVATE_PREFIXES = [
  "/profile",
  "/checkout",
  "/orders",
  "/addresses",
  "/settings",
  "/notifications",
  "/favorites",
  "/login",
];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !isPrivatePath(url.pathname)) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          return offline || caches.match("/");
        }),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/images") ||
    url.pathname.startsWith("/icons") ||
    url.pathname.startsWith("/og");

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
