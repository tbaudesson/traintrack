"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { usePrograms } from "@/hooks/usePrograms";

/** The pages worth having offline: training at the gym, without network. */
const PAGES = [
  "",
  "/log",
  "/log/session",
  "/programs",
  "/progress",
  "/intervals",
  "/mobility",
  "/exercises",
  "/competitions",
  "/report",
  "/readiness",
  "/settings",
  "/more",
];

const KEY = "traintrack.warmed";

/** The scripts and stylesheets a page loads, read from its HTML. */
function assetsOf(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g)) found.add(m[1]);
  return [...found];
}

/**
 * While online, loads the main pages and their files in the background, once
 * per version of the app and per day, so the service worker keeps them: they
 * then open without network. Nothing shows; a failure is simply retried later.
 */
export function OfflineWarmup() {
  const locale = useLocale();
  const programs = usePrograms();
  const programIds = programs.map((p) => p.id).join(",");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller || !navigator.onLine) return;
    // The app's version: its main script changes name with each deploy.
    const version = [...document.scripts].map((s) => s.src).find((src) => src.includes("/_next/static/")) ?? "";
    const stamp = `${version}|${locale}|${programIds}|${new Date().toISOString().slice(0, 10)}`;
    try {
      if (window.localStorage.getItem(KEY) === stamp) return;
    } catch {
      return;
    }

    let cancelled = false;
    const run = async () => {
      const pages = [...PAGES, ...programIds.split(",").filter(Boolean).map((id) => `/programs/${id}`)].map((p) => `/${locale}${p}`);
      const assets = new Set<string>();
      for (const page of pages) {
        if (cancelled) return;
        try {
          const res = await fetch(page, { credentials: "same-origin" });
          if (res.ok) assetsOf(await res.text()).forEach((a) => assets.add(a));
        } catch {
          return; // The network went away: try again another time.
        }
      }
      for (const asset of assets) {
        if (cancelled) return;
        await fetch(asset).catch(() => undefined);
      }
      try {
        window.localStorage.setItem(KEY, stamp);
      } catch {
        // Ignore: it will simply warm up again.
      }
    };
    // Once the page has settled, so it never slows the first screen.
    const timer = window.setTimeout(run, 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [locale, programIds]);

  return null;
}
