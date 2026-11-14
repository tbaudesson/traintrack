import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db";
import { localDate, localDateIn } from "@/lib/dates";
import { goalProgress, oneRepMaxHistory, type StrengthGoal } from "@/lib/goals";
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
  goalsReached: { goal: StrengthGoal; on: string }[];
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
    const [workouts, sets, profiles, exercises, checkins] = await Promise.all([
      db.workouts.filter((w) => !w.deletedAt && !!w.userId && ids.includes(w.userId)).toArray(),
      db.workoutSets.filter((s) => !s.deletedAt && !s.isWarmup && !!s.userId && ids.includes(s.userId)).toArray(),
      db.athleteProfiles.filter((p) => !p.deletedAt && !!p.userId && ids.includes(p.userId)).toArray(),
      db.exercises.toArray(),
      db.readinessCheckins.filter((r) => !r.deletedAt && !!r.userId && ids.includes(r.userId) && r.date > lastWeek && r.date <= today).toArray(),
    ]);
    const result = new Map<string, AthleteDigest>();
    for (const id of ids) {
      const own = workouts.filter((w) => w.userId === id);
      const ownSets = sets.filter((s) => s.userId === id);
      const profile = profiles.find((p) => p.userId === id);
      const week = weeklyReport({ monday, workouts: own, sets: ownSets });
      const goalsReached = (profile?.strengthGoals ?? []).flatMap((goal) => {
        const exercise = exercises.find((e) => (goal.exerciseUuid && e.uuid === goal.exerciseUuid) || e.name === goal.exerciseName);
        const on = exercise?.id !== undefined ? goalProgress(goal, oneRepMaxHistory(exercise.id, own, ownSets), today).achievedOn : undefined;
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
