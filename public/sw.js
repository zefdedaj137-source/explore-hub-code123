const CACHE_NAME = "shqiponja-v3";
const API_CACHE = "shqiponja-api-v2";
const OFFLINE_URL = "/index.html";

const STATIC_ASSETS = [OFFLINE_URL, "/eagle-logo.png", "/manifest.json"];

// Cache the app shell on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener("activate", (event) => {
  const keep = new Set([CACHE_NAME, API_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for Supabase REST API GET requests
function isApiGet(request) {
  return (
    request.method === "GET" &&
    request.url.includes("supabase.co/rest/v1/")
  );
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((err) => {
      if (cached) return cached;
      throw err;
    });

  return cached || fetchPromise;
}

// Network-first for navigations, stale-while-revalidate for API, cache-first for static
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (isApiGet(event.request)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Audio and video: pass through to network directly.
  // Range requests (206 Partial Content) cannot be put into the Cache API
  // and will throw ERR_CACHE_OPERATION_NOT_SUPPORTED if intercepted.
  const url = event.request.url;
  if (url.match(/\.(mp3|mp4|webm|ogg|wav|m4a|flac|aac)(\?.*)?$/i) ||
      (event.request.headers.get('Range'))) {
    event.respondWith(fetch(event.request));
    return;
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Shqiponja", body: "You have a new notification" };
  const title = data.title || "Shqiponja";
  const options = {
    body: data.body || "New activity",
    icon: "/eagle-logo.png",
    badge: "/eagle-logo.png",
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/discover") && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/discover");
    })
  );
});
