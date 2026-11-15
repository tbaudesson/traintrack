"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * While a session is active, the global navigation goes away: no wheel to
 * open by mistake mid-set, nothing for the keyboard or a screen reader to
 * land on behind a full-screen player. Each active session holds one claim;
 * the wheel comes back when the last one is released.
 */
let claims = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hides the global navigation for as long as `active` is true and the caller is mounted. */
export function useSessionFocus(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    claims += 1;
    emit();
    return () => {
      claims -= 1;
      emit();
    };
  }, [active]);
}

/** Whether an active session has hidden the global navigation. */
export function useGlobalNavigationHidden(): boolean {
  return useSyncExternalStore(subscribe, () => claims > 0, () => false);
}
