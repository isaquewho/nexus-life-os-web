const CACHE_NAME = "nexus-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// ── Install: cache static assets ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests
  if (event.request.method !== "GET") return;
  if (!url.origin.startsWith(self.location.origin)) return;

  // Network-first for Supabase API and Next.js RSC
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("supabase") ||
    url.searchParams.has("_rsc")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (_next/static)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached || fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Stale-while-revalidate for pages
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((res) => {
          cache.put(event.request, res.clone());
          return res;
        }).catch((error) => {
          if (!cached) throw error;
        });
        return cached || fetchPromise;
      })
    )
  );
});
