"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA/offline support and auto-reloads the
 * page when a newly deployed version takes control — so users always get the
 * latest build without manually clearing the cache.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] registered, scope:", registration.scope);
        // Check for an updated worker on each load
        registration.update();
        registration.addEventListener("updatefound", () => {
          const next = registration.installing;
          next?.addEventListener("statechange", () => {
            // A new worker is installed and an old one is controlling → reload soon
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      })
      .catch((err) => {
        console.error("[SW] registration failed:", err);
      });
  }, []);

  return null;
}
