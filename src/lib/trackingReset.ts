import db from "@/db";
import { supabase } from "./supabase";
import { pushDirty, syncAll } from "./syncEngine";
import { deleteVoiceNote } from "./voiceNoteService";

/**
 * Starting one's tracking over (Settings > Start over), see migration 100:
 * the server puts one's sessions (with their sets and notes), the day's
 * form, body measurements, nutrition, hydration, health data, competitions
 * and goals aside as deleted, all stamped with the same instant, and keeps
 * them for the days the admin set; until then they can be brought back.
 * The device does the same to its own copy right away, with the server's
 * instants, so the next sync agrees with it.
 */

/** The days a reset can be undone (app settings, Admin > GDPR). */
export const TRACKING_RESET_DAYS_KEY = "tracking_reset_days";
export const parseResetDays = (text: string | null | undefined): number | null =>
  text && /^[0-9]{1,3}$/.test(text.trim()) && Number(text) >= 1 ? Number(text) : null;

export interface TrackingReset {
  /** When the tracking was put aside (server time). */
  resetAt: string;
  /** Until when it can be brought back. */
  undoUntil: string;
}

/** The tables kept by athlete (userId), besides the sets and notes, which follow their sessions. */
const OWN_TABLES = ["workouts", "bodyMetrics", "readinessCheckins", "nutritionEntries", "hydrationLogs", "healthMetrics", "competitionResults", "goals"] as const;

type Row = { id?: number; userId?: string | null; workoutId?: number; deletedAt?: string | null };

const sameInstant = (a: string | null | undefined, b: string | null) => (b === null ? !a : !!a && Date.parse(a) === Date.parse(b));

/**
 * On the device: the athlete's rows deleted at `from` (null: those in use)
 * are given `to` as deletedAt (null brings them back), changed at `at`.
 */
export async function markTracking(userId: string, from: string | null, to: string | null, at: string): Promise<number> {
  const tables = [...OWN_TABLES, "workoutSets", "workoutNotes"].map((name) => db.table(name));
  return db.transaction("rw", tables, async () => {
    const workoutIds = new Set((await db.workouts.toArray()).filter((w) => w.userId === userId).map((w) => w.id));
    const mine = (name: string, r: Row) =>
      name === "workoutNotes" ? workoutIds.has(r.workoutId) : name === "workoutSets" ? r.userId === userId || workoutIds.has(r.workoutId) : r.userId === userId;
    let changed = 0;
    for (const table of tables) {
      const rows = (await table.toArray()) as Row[];
      for (const r of rows) {
        if (r.id === undefined || !mine(table.name, r) || !sameInstant(r.deletedAt, from)) continue;
        await table.update(r.id, { deletedAt: to, updatedAt: at, _dirty: 0 });
        changed++;
      }
    }
    return changed;
  });
}

/** The current reset (one that can be undone), or none; one past its days is deleted for good now, its voice files too. */
export async function myTrackingReset(userId: string): Promise<TrackingReset | null> {
  const { data, error } = await supabase.rpc("my_tracking_reset");
  if (error) throw new Error(error.message);
  const v = data as { resetAt?: string; undoUntil?: string; purgedAudio?: string[] } | null;
  if (v?.purgedAudio) {
    // Only one's own files: a coach's voice note stays theirs to remove.
    for (const path of v.purgedAudio.filter((p) => p.startsWith(`${userId}/`))) await deleteVoiceNote(path).catch(() => {});
    return null;
  }
  return v?.resetAt && v.undoUntil ? { resetAt: v.resetAt, undoUntil: v.undoUntil } : null;
}

/**
 * Start over: what waits to be sent goes first (nothing is lost on another
 * device's account), then the server puts the tracking aside and the device
 * follows. `previous` is a reset still undoable, taken along by this one.
 */
export async function resetMyTracking(userId: string, previous: TrackingReset | null): Promise<TrackingReset> {
  await pushDirty();
  // The tracking itself must be on the server, or a change made here would come back after the reset.
  const unsent = await Promise.all([...OWN_TABLES, "workoutSets", "workoutNotes"].map((name) => db.table(name).where("_dirty").equals(1).count()));
  if (unsent.some((n) => n > 0)) throw new Error("pending");
  const { data, error } = await supabase.rpc("reset_my_tracking");
  if (error) throw new Error(error.message);
  const reset = data as TrackingReset;
  if (previous) await markTracking(userId, previous.resetAt, reset.resetAt, reset.resetAt);
  await markTracking(userId, null, reset.resetAt, reset.resetAt);
  void syncAll();
  return reset;
}

/** Bring back what the reset put aside, on the server and on the device. */
export async function undoMyTrackingReset(userId: string, reset: TrackingReset): Promise<void> {
  const { data, error } = await supabase.rpc("undo_my_tracking_reset");
  if (error) throw new Error(error.message);
  await markTracking(userId, reset.resetAt, null, data as string);
  void syncAll();
}
