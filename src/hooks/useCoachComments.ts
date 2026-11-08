import { useLiveQuery } from "dexie-react-hooks";
import db, { getCurrentUserIdSync } from "@/db";

const KEY = "traintrack.commentsSeen";

interface Seen {
  /** Comments older than the first look at this feature don't count as new. */
  since: string;
  workouts: Record<number, string>;
}

function readSeen(): Seen {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored) return JSON.parse(stored) as Seen;
  } catch {
    // Unreadable: start over, as on a new device.
  }
  const fresh = { since: new Date().toISOString(), workouts: {} };
  window.localStorage.setItem(KEY, JSON.stringify(fresh));
  return fresh;
}

/** Remember the newest comment read on this workout (per device). */
export function markCommentsSeen(workoutId: number, latest: string) {
  const seen = readSeen();
  if ((seen.workouts[workoutId] ?? "") >= latest) return;
  seen.workouts[workoutId] = latest;
  window.localStorage.setItem(KEY, JSON.stringify(seen));
}

/** Comments someone else left on my workouts that I haven't opened yet. */
export function useUnreadComments() {
  return (
    useLiveQuery(async () => {
      const uid = getCurrentUserIdSync();
      if (!uid) return [];
      const mine = new Set((await db.workouts.filter((w) => w.userId === uid && !w.deletedAt).toArray()).map((w) => w.id));
      const seen = readSeen();
      const notes = await db.workoutNotes
        .filter((n) => !n.deletedAt && n.userId !== uid && mine.has(n.workoutId))
        .toArray();
      return notes
        .filter((n) => n.createdAt > (seen.workouts[n.workoutId] ?? seen.since))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, []) ?? []
  );
}
