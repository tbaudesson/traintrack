"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Save what is typed as it is typed, on the device: a short while after the
 * last key, and at once when the field is left, the page hidden or closed, or
 * the component gone. Only the latest value is saved; nothing is sent over
 * the network from here (the sync engine batches its own pushes).
 */
export function useDebouncedSave<T>(save: (value: T) => void, delay = 400) {
  const latest = useRef(save);
  useLayoutEffect(() => {
    latest.current = save;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next) latest.current(next.value);
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush]
  );

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
      flush();
    };
  }, [flush]);

  return { schedule, flush };
}
