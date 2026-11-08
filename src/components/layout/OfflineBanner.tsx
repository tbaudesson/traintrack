"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Sticky banner shown when the app is offline.
 * Disappears automatically when the connection is restored.
 */
function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("offline", onChange);
  window.addEventListener("online", onChange);
  return () => {
    window.removeEventListener("offline", onChange);
    window.removeEventListener("online", onChange);
  };
}

export function OfflineBanner() {
  const t = useTranslations("sync");
  const isOffline = useSyncExternalStore(
    subscribeToConnectivity,
    () => !navigator.onLine,
    () => false
  );

  if (!isOffline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-white">
      <WifiOff className="h-3.5 w-3.5" />
      {t("offlineBanner")}
    </div>
  );
}
