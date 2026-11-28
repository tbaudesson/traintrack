import { useEffect, useState } from "react";
import { getAppSettings } from "@/lib/adminService";

/** How long one read of the settings serves every reference a page asks for. */
const SHARED_MS = 30_000;
let shared: { at: number; read: Promise<Record<string, string>> } | null = null;

/** One read of the app settings for all the references mounted together (a page asks for several). */
function readSettings(): Promise<Record<string, string>> {
  if (!shared || Date.now() - shared.at > SHARED_MS) {
    const read = getAppSettings();
    shared = { at: Date.now(), read };
    // A failed read is not kept: the next reference asks again.
    read.catch(() => {
      if (shared?.read === read) shared = null;
    });
  }
  return shared.read;
}

/**
 * References an admin keeps in the app settings (nutrition, injuries…), read
 * online and kept on the device for offline use; null until read once or when
 * what is kept does not hold together.
 */
export function useAppGuidance<T>(key: string, parse: (text: string | null | undefined) => T | null): T | null {
  const cache = `traintrack.guidance.${key}`;
  const [guidance, setGuidance] = useState<T | null>(null);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device's storage, only on the client
      setGuidance(parse(localStorage.getItem(cache)));
    } catch {
      // No storage: wait for the network.
    }
    readSettings()
      .then((settings) => {
        const text = settings[key];
        const fresh = parse(text);
        if (!fresh) return;
        try {
          localStorage.setItem(cache, text);
        } catch {
          // Private window: kept for this visit only.
        }
        setGuidance(fresh);
      })
      .catch(() => {});
  }, [key, cache, parse]);
  return guidance;
}
