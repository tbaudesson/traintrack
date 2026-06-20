"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA/offline support.
 * Side-effect-only component placed in the root locale layout.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] registered, scope:", registration.scope);
      })
      .catch((err) => {
        console.error("[SW] registration failed:", err);
      });
  }, []);

  return null;
}
