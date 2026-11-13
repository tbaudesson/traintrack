import { useLiveQuery } from "dexie-react-hooks";
import db, { getCurrentUserIdSync } from "@/db";
import { localDate } from "@/lib/dates";
import { painReports, worstRecentPain, type PainReport } from "@/lib/pain";

/** The pains an athlete reported, latest first (the coach passes the athlete's id). */
export function usePainReports(userId?: string): PainReport[] {
  return (
    useLiveQuery(async () => {
      const uid = userId ?? getCurrentUserIdSync();
      if (!uid) return [];
      const workouts = (await db.workouts.toArray()).filter((w) => !w.deletedAt && w.userId === uid);
      const ids = new Set(workouts.map((w) => w.id));
      const notes = (await db.workoutNotes.toArray()).filter((n) => ids.has(n.workoutId));
      return painReports(notes, workouts, uid);
    }, [userId]) ?? []
  );
}

/** For each athlete of a team, the worst pain of the last week, if any. */
export function useTeamPain(userIds: string[]): Map<string, PainReport> | undefined {
  const key = [...userIds].sort().join(",");
  return useLiveQuery(async () => {
    const ids = key ? key.split(",") : [];
    const workouts = (await db.workouts.toArray()).filter((w) => !w.deletedAt && !!w.userId && ids.includes(w.userId));
    const byId = new Set(workouts.map((w) => w.id));
    const notes = (await db.workoutNotes.toArray()).filter((n) => byId.has(n.workoutId));
    const today = localDate();
    const result = new Map<string, PainReport>();
    for (const id of ids) {
      const worst = worstRecentPain(painReports(notes, workouts.filter((w) => w.userId === id), id), today);
      if (worst) result.set(id, worst);
    }
    return result;
  }, [key]);
}
