/**
 * The end of a rest, kept on the device for the session it belongs to: a
 * page reloaded or reopened mid-rest finds it and counts down to the same
 * moment. It is only a time; once past, it is forgotten.
 */
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const key = (workoutId: number) => `traintrack.rest.${workoutId}`;

function store(given?: Store): Store | null {
  if (given) return given;
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function saveRestEnd(workoutId: number, endsAt: number, storage?: Store): void {
  try {
    store(storage)?.setItem(key(workoutId), String(Math.round(endsAt)));
  } catch {
    // Private window or full storage: the rest still runs, only not across a reload.
  }
}

export function clearRestEnd(workoutId: number, storage?: Store): void {
  try {
    store(storage)?.removeItem(key(workoutId));
  } catch {
    // Nothing kept, nothing to clear.
  }
}

/** The end of the rest still running for this session, or null (and forgotten) when none is. */
export function loadRestEnd(workoutId: number, now: number = Date.now(), storage?: Store): number | null {
  let raw: string | null = null;
  try {
    raw = store(storage)?.getItem(key(workoutId)) ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;
  const endsAt = Number(raw);
  if (!Number.isFinite(endsAt) || endsAt <= now) {
    clearRestEnd(workoutId, storage);
    return null;
  }
  return endsAt;
}
