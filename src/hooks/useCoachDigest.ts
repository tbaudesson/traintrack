import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db";
import { localDate, localDateIn } from "@/lib/dates";
import { goalProgress, oneRepMaxHistory, type StrengthGoal } from "@/lib/goals";
import { weeklyReport } from "@/lib/weeklyReport";
import { mondayOfDate } from "@/lib/weekPlan";

export interface AthleteDigest {
  userId: string;
  /** Records beaten this week: exercise id, weight and reps. */
  records: { exerciseId: number; weightKg: number; reps: number }[];
  /** Goals reached in the last two weeks. */
  goalsReached: { goal: StrengthGoal; on: string }[];
  /** Days trained this week. */
  daysThisWeek: number;
  deloading: boolean;
}

/** What a coach reads on the dashboard for each athlete: this week's records, goals just reached, deload. */
export function useCoachDigest(userIds: string[]): Map<string, AthleteDigest> | undefined {
  const key = [...userIds].sort().join(",");
  return useLiveQuery(async () => {
    const ids = key ? key.split(",") : [];
    const today = localDate();
    const monday = mondayOfDate(today);
    const since = localDateIn(-14);
    const [workouts, sets, profiles, exercises] = await Promise.all([
      db.workouts.filter((w) => !w.deletedAt && !!w.userId && ids.includes(w.userId)).toArray(),
      db.workoutSets.filter((s) => !s.deletedAt && !s.isWarmup && !!s.userId && ids.includes(s.userId)).toArray(),
      db.athleteProfiles.filter((p) => !p.deletedAt && !!p.userId && ids.includes(p.userId)).toArray(),
      db.exercises.toArray(),
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
      result.set(id, {
        userId: id,
        records: week.records,
        goalsReached,
        daysThisWeek: week.daysTrained,
        deloading: profile?.deloadWeek === monday,
      });
    }
    return result;
  }, [key]);
}
