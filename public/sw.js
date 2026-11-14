const CACHE_NAME = "traintrack-v7";

const PRECACHE_URLS = ["/fr", "/en", "/de"];

// Every deploy adds new chunks, so without a cap the cache only ever grows.
const MAX_ENTRIES = 300;

// Drop the oldest entries past the cap; locale roots serve offline startup.
async function trimCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_ENTRIES;
  if (excess <= 0) return;
  const evictable = keys.filter(
    (req) => !PRECACHE_URLS.includes(new URL(req.url).pathname)
  );
  await Promise.all(evictable.slice(0, excess).map((req) => cache.delete(req)));
}

// --- Scheduled notification timers ---
// Maps notification tags to their setTimeout IDs so they can be cancelled.
// NOTE: Service workers can be terminated by the browser at any time to save
// resources. When that happens, all pending setTimeout timers are lost.
// This approach is still better than main-thread setTimeout because:
//   1. It works even when the app tab is closed (as long as the SW stays alive).
//   2. On re-launch the app re-schedules all pending tasks (see ServiceWorkerRegistration).
// For truly persistent scheduling, a push notification server would be needed.
// On iOS Safari, periodic background sync is NOT supported, so this is the
// best client-side-only approach available.
const scheduledTimers = new Map();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {}) // offline at install time must not block activation
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Only our own origin: Supabase data lives in Dexie, and third-party
  // responses (thumbnails, food lookups) have no business in this cache.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // A 500 must not replace the last good copy used offline.
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone).then(() => trimCache(cache)))
            .catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const exact = await caches.match(event.request);
        if (exact) return exact;
        // A page opened offline: the same page with other query parameters
        // (a session started without network: /log/session?id=N, a number
        // never seen), then the home page of the language, then nothing.
        if (event.request.mode === "navigate") {
          const samePage = await caches.match(event.request, { ignoreSearch: true });
          if (samePage) return samePage;
          const locale = url.pathname.split("/")[1];
          const home = await caches.match(`/${["fr", "en", "de"].includes(locale) ? locale : "fr"}`);
          if (home) return home;
        }
        return Response.error();
      })
  );
});

// --- Message handler for scheduling / cancelling notifications ---
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SCHEDULE_NOTIFICATION") {
    const { title, body, tag, scheduledTime } = event.data;
    const delay = scheduledTime - Date.now();

    // Cancel any existing timer for this tag to avoid duplicates
    if (scheduledTimers.has(tag)) {
      clearTimeout(scheduledTimers.get(tag));
      scheduledTimers.delete(tag);
    }

    if (delay <= 0) return; // Already past — nothing to schedule

    const timerId = setTimeout(() => {
      scheduledTimers.delete(tag);
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag,
        vibrate: [200, 100, 200],
      });
    }, delay);

    scheduledTimers.set(tag, timerId);
  }

  if (event.data.type === "CANCEL_NOTIFICATION") {
    const { tag } = event.data;
    if (scheduledTimers.has(tag)) {
      clearTimeout(scheduledTimers.get(tag));
      scheduledTimers.delete(tag);
    }
  }
});

// --- Web Push handler ---
// Receives a server-sent push and shows a notification. Payload is JSON:
// { title, body, url }.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "TrainTrack";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "traintrack-push",
      data: { url: payload.url || "/" },
      vibrate: [200, 100, 200],
    })
  );
});

// --- Notification click handler ---
// Focuses an existing app window (or opens one) on the notification's target.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && "navigate" in client) {
          return client.focus().then(() => client.navigate(target).catch(() => {}));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
