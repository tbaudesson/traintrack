import { useSyncExternalStore } from "react";
import { getPrefs, getServerPrefs, subscribePrefs, type AppPrefs } from "@/lib/appTheme";

/** The style, favourite sport and silhouette, kept on this device. */
export function useAppPrefs(): AppPrefs {
  return useSyncExternalStore(subscribePrefs, getPrefs, getServerPrefs);
}
