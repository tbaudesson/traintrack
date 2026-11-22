import type { Workout } from "@/db";

/**
 * Where a session came from, so the same outing is never logged twice: the
 * file's fingerprint (SHA-256 of its bytes), and its start time, which the
 * same activity keeps whether exported as FIT, TCX or GPX.
 */

/** The file's fingerprint, in hexadecimal. */
export async function fileHash(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Within this many seconds, two starts of the same sport are the same outing. */
const SAME_START_SEC = 120;

type W = Pick<Workout, "id" | "date" | "title" | "sport" | "fileHash" | "startedAt" | "deletedAt" | "cancelledAt">;

/**
 * The session this file was already imported into, if any: the same file, or
 * the same sport started at the same time (another export of the activity).
 * The session being filled does not count.
 */
export function alreadyImported<T extends W>(workouts: T[], file: { hash: string; sport?: string | null; startedAt?: string | null }, exceptId?: number): T | undefined {
  const others = workouts.filter((w) => !w.deletedAt && w.id !== exceptId);
  const same = others.find((w) => w.fileHash === file.hash);
  if (same) return same;
  if (!file.startedAt) return undefined;
  const t = Date.parse(file.startedAt);
  return others.find((w) => w.startedAt && w.sport === file.sport && Math.abs(Date.parse(w.startedAt) - t) <= SAME_START_SEC * 1000);
}
