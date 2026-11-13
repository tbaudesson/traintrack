import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db";
import { adherence, type Adherence } from "@/lib/adherence";
import { localDate } from "@/lib/dates";

/**
 * How regularly each athlete trains (see lib/adherence), from the data a coach
 * has synced: their sessions, sets and training days.
 */
export function useTeamAdherence(userIds: string[]): Map<string, Adherence> | undefined {
  const key = [...userIds].sort().join(",");
  return useLiveQuery(async () => {
    const ids = new Set(key ? key.split(",") : []);
    const mine = <T extends { userId?: string | null; deletedAt?: string | null }>(rows: T[]) =>
      rows.filter((r) => !r.deletedAt && !!r.userId && ids.has(r.userId));
    const [workouts, sets, profiles] = await Promise.all([
      db.workouts.toArray().then(mine),
      db.workoutSets.toArray().then(mine),
      db.athleteProfiles.toArray().then(mine),
    ]);
    const today = localDate();
    return new Map(
      [...ids].map((id) => [
        id,
        adherence({
          today,
          workouts: workouts.filter((w) => w.userId === id),
          sets: sets.filter((s) => s.userId === id),
          trainingDays: profiles.find((p) => p.userId === id)?.trainingDays,
        }),
      ])
    );
  }, [key]);
}
