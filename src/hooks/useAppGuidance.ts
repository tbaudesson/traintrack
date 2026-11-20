import { useEffect, useState } from "react";
import { getAppSettings } from "@/lib/adminService";

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
    getAppSettings()
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
