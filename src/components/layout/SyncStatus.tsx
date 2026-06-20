"use client";

import { useEffect, useState } from "react";
import {
  onSyncStateChange,
  syncAll,
  type SyncState,
} from "@/lib/syncEngine";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Check,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function SyncStatus() {
  const t = useTranslations("sync");
  const [state, setState] = useState<SyncState>("idle");
  const [error, setError] = useState<string>();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const unsubscribe = onSyncStateChange((newState, err) => {
      setState(newState);
      setError(err);
    });
    return unsubscribe;
  }, []);

  const handleTap = () => {
    if (state === "error" || state === "idle") {
      syncAll();
    }
    setShowTooltip(!showTooltip);
  };

  const icon = {
    idle: <Check className="h-3.5 w-3.5 text-green-500" />,
    syncing: (
      <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
    ),
    error: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
    offline: <CloudOff className="h-3.5 w-3.5 text-gray-400" />,
  }[state];

  const label = {
    idle: t("synced"),
    syncing: t("syncing"),
    error: t("error"),
    offline: t("offline"),
  }[state];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleTap}
        className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label={label}
      >
        {icon}
        <Cloud className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {showTooltip && (
        <>
          {/* Backdrop to close tooltip */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowTooltip(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-xs font-medium">{label}</span>
            </div>
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
            {state !== "syncing" && state !== "offline" && (
              <button
                type="button"
                onClick={() => {
                  syncAll();
                  setShowTooltip(false);
                }}
                className="mt-2 w-full rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
              >
                {t("syncNow")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
