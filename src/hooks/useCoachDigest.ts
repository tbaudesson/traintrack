import { useLiveQuery } from "dexie-react-hooks";
import db, { type Goal } from "@/db";
import { localDate, localDateIn } from "@/lib/dates";
import { goalStatus } from "@/lib/goalTracking";
import { weeklyReport } from "@/lib/weeklyReport";
import { mondayOfDate } from "@/lib/weekPlan";
import { trainingLoad, type LoadZone } from "@/lib/trainingLoad";
import { readinessScore } from "@/hooks/useReadiness";

/** Under this, the form of the last seven days is low. */
export const LOW_FORM = 50;

export interface AthleteDigest {
  userId: string;
  /** Records beaten this week: exercise id, weight and reps. */
  records: { exerciseId: number; weightKg: number; reps: number }[];
  /** Goals reached in the last two weeks. */
  goalsReached: { goal: Goal; on: string }[];
  /** Days trained this week. */
  daysThisWeek: number;
  deloading: boolean;
  /** The acute:chronic load, when there is history enough. */
  load: { ratio: number; zone: LoadZone } | null;
  /** Average readiness of the last seven days, from two check-ins. */
  form: number | null;
}

/** What a coach reads on the dashboard for each athlete: this week's records, goals just reached, deload. */
export function useCoachDigest(userIds: string[]): Map<string, AthleteDigest> | undefined {
  const key = [...userIds].sort().join(",");
  return useLiveQuery(async () => {
    const ids = key ? key.split(",") : [];
    const today = localDate();
    const monday = mondayOfDate(today);
    const since = localDateIn(-14);
    const lastWeek = localDateIn(-7);
    const [workouts, sets, profiles, exercises, checkins, goals, metrics] = await Promise.all([
      db.workouts.where("userId").anyOf(ids).filter((w) => !w.deletedAt).toArray(),
      db.workoutSets.where("userId").anyOf(ids).filter((s) => !s.deletedAt && !s.isWarmup).toArray(),
      db.athleteProfiles.filter((p) => !p.deletedAt && !!p.userId && ids.includes(p.userId)).toArray(),
      db.exercises.toArray(),
      db.readinessCheckins.filter((r) => !r.deletedAt && !!r.userId && ids.includes(r.userId) && r.date > lastWeek && r.date <= today).toArray(),
      db.goals.filter((g) => !g.deletedAt && !!g.userId && ids.includes(g.userId)).toArray(),
      db.bodyMetrics.filter((m) => !m.deletedAt && !!m.userId && ids.includes(m.userId)).toArray(),
    ]);
    const result = new Map<string, AthleteDigest>();
    for (const id of ids) {
      const own = workouts.filter((w) => w.userId === id);
      const ownSets = sets.filter((s) => s.userId === id);
      const profile = profiles.find((p) => p.userId === id);
      const week = weeklyReport({ monday, workouts: own, sets: ownSets });
      // Goals of every kind reached in the last two weeks.
      const data = { today, workouts: own, sets: ownSets, exercises, bodyMetrics: metrics.filter((m) => m.userId === id) };
      const goalsReached = goals
        .filter((g) => g.userId === id)
        .flatMap((goal) => {
          const on = goalStatus(goal, data).achievedOn;
          return on && on >= since ? [{ goal, on }] : [];
        });
      const load = trainingLoad({ today, workouts: own, sets: ownSets });
      const scores = checkins.filter((r) => r.userId === id).map(readinessScore).filter((x): x is number => x !== null);
      const form = scores.length >= 2 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      result.set(id, {
        userId: id,
        records: week.records,
        goalsReached,
        daysThisWeek: week.daysTrained,
        deloading: profile?.deloadWeek === monday,
        load: load ? { ratio: load.ratio, zone: load.zone } : null,
        form,
      });
    }
    return result;
  }, [key]);
}
