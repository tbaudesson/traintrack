"use client";

import { useEffect, useState } from "react";
import { getAppSettings } from "@/lib/adminService";

/**
 * Public app settings (company name, DPO email, etc.) used by the privacy
 * page. Cached in localStorage for ~1h to avoid refetching on every mount.
 */
const CACHE_KEY = "traintrack.appSettings";
const CACHE_TTL = 60 * 60 * 1000;

export function useAppSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { at, data } = JSON.parse(raw);
        if (Date.now() - at < CACHE_TTL) return data;
      }
    } catch {
      /* ignore */
    }
    return {};
  });

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        setSettings(s);
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: s }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  }, []);

  return settings;
}
