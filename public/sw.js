const CACHE_NAME = "traintrack-v2";

const PRECACHE_URLS = ["/fr", "/en"];

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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
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

  // Never cache Supabase API / auth / storage requests
  if (
    url.hostname.endsWith(".supabase.co") ||
    url.hostname.endsWith(".supabase.in") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/rest/") ||
    url.pathname.startsWith("/storage/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
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

// --- Notification click handler ---
// Opens or focuses the tasks page when the user taps a notification.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window that is on the tasks page
      for (const client of clientList) {
        if (client.url.includes("/calendar/tasks") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise try to focus any existing app window and navigate it
      for (const client of clientList) {
        if ("focus" in client && "navigate" in client) {
          return client.focus().then(() => client.navigate("/fr/calendar/tasks"));
        }
      }
      // As a last resort open a new window
      return self.clients.openWindow("/fr/calendar/tasks");
    })
  );
});
