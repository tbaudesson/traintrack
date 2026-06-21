import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db";

/**
 * The most recent workout date for a client, read from locally-synced data
 * (a trainer pulls clients' workouts via RLS). Returns:
 *   undefined → still loading
 *   null      → no workouts ever
 *   string    → ISO date of the last workout
 */
export function useClientLastWorkout(userId?: string | null) {
  return useLiveQuery(async () => {
    if (!userId) return undefined;
    const all = await db.workouts.filter((w) => !w.deletedAt && w.userId === userId).toArray();
    if (all.length === 0) return null;
    return all.map((w) => w.date).sort().pop() ?? null;
  }, [userId]);
}

/** Whole days since `date` (ISO yyyy-mm-dd). */
export function daysSince(date: string): number {
  const d = Date.parse(date);
  if (Number.isNaN(d)) return 0;
  return Math.floor((Date.now() - d) / 86400000);
}
