/**
 * A timed session left half-way (the app closed, the page reloaded), kept on
 * the device to be taken up again.
 *
 * What is kept is the least that rebuilds the session and where it stood:
 * - `context`: what the page builds the session from (for /intervals, its
 *   plan with its seed, so the same exercises come back in the same order);
 * - `stepCount`: how many steps that session had, to tell it is the same one;
 * - `index`: the step under way when it was left, played again from its
 *   start (the steps before it are over: the time closed is not counted);
 * - `done`: the efforts carried out to the end, saved with the session;
 * - `elapsedSec`: the time actually spent, pauses and the time closed left out;
 * - `updatedAt`: the last step reached, for the 6-hour limit.
 *
 * Within 6 hours of the last step it can be taken up again or started over;
 * after, only started over or given up. Anything unreadable, or kept by
 * another version of this format, is forgotten.
 */
export const RESUME_VERSION = 1;
export const RESUME_WINDOW_MS = 6 * 60 * 60 * 1000;

export type TimedKind = "intervals";

export interface TimedProgress<C = unknown> {
  v: typeof RESUME_VERSION;
  kind: TimedKind;
  context: C;
  stepCount: number;
  index: number;
  done: number[];
  elapsedSec: number;
  updatedAt: number;
}

export type TimedResume<C = unknown> = { state: "resumable"; progress: TimedProgress<C> } | { state: "expired"; progress: TimedProgress<C> };

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const key = (kind: TimedKind) => `traintrack.timed.${kind}`;

function store(given?: Store): Store | null {
  if (given) return given;
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function saveTimedProgress<C>(progress: Omit<TimedProgress<C>, "v">, storage?: Store): void {
  try {
    store(storage)?.setItem(key(progress.kind), JSON.stringify({ ...progress, v: RESUME_VERSION }));
  } catch {
    // Private window or full storage: the session plays on, only not across a reload.
  }
}

export function clearTimedProgress(kind: TimedKind, storage?: Store): void {
  try {
    store(storage)?.removeItem(key(kind));
  } catch {
    // Nothing kept, nothing to clear.
  }
}

const whole = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

/** The session left half-way, if any: to take up again, or (after 6 hours) only to start over. */
export function loadTimedProgress<C = unknown>(kind: TimedKind, now: number = Date.now(), storage?: Store): TimedResume<C> | null {
  let raw: string | null = null;
  try {
    raw = store(storage)?.getItem(key(kind)) ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;
  let p: Partial<TimedProgress<C>> | null = null;
  try {
    p = JSON.parse(raw);
  } catch {
    p = null;
  }
  const readable =
    !!p &&
    p.v === RESUME_VERSION &&
    p.kind === kind &&
    p.context !== undefined &&
    whole(p.stepCount) &&
    p.stepCount > 0 &&
    whole(p.index) &&
    p.index < p.stepCount &&
    Array.isArray(p.done) &&
    typeof p.elapsedSec === "number" &&
    p.elapsedSec >= 0 &&
    typeof p.updatedAt === "number";
  if (!readable) {
    clearTimedProgress(kind, storage);
    return null;
  }
  const progress = { ...(p as TimedProgress<C>), done: p!.done!.filter((i) => whole(i) && i < p!.index!) };
  return { state: now - progress.updatedAt <= RESUME_WINDOW_MS ? "resumable" : "expired", progress };
}
