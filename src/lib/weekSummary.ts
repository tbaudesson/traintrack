import { doneBetween } from "@/lib/weekGoal";
import type { Workout, WorkoutSet } from "@/db";

type W = Pick<Workout, "id" | "date" | "title" | "programId" | "programDayIndex" | "kind" | "distanceM" | "durationSec" | "durationMin">;
type S = Pick<WorkoutSet, "workoutId" | "completed" | "isWarmup" | "weightKg" | "reps">;

/**
 * The week in one line on the home screen. A volume in kilos only when the
 * week holds loaded sets, with its change only when the same days of last
 * week hold some too; otherwise the number of activities done, a figure that
 * fits every sport. Runs, mobility and bodyweight sets never count as kilos.
 */
export type WeekSummary = { kind: "volume"; kg: number; change: number | null } | { kind: "activities"; count: number };

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function weekSummary(input: { monday: string; today: string; workouts: W[]; sets: S[] }): WeekSummary {
  const { monday, today } = input;
  const elapsed = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${monday}T00:00:00Z`)) / 86_400_000);
  const lastMonday = addDays(monday, -7);
  const volume = (from: string, to: string) => {
    const ids = new Set(input.workouts.filter((w) => w.date >= from && w.date <= to).map((w) => w.id));
    return input.sets
      .filter((s) => ids.has(s.workoutId) && s.completed && !s.isWarmup && (s.weightKg ?? 0) > 0 && (s.reps ?? 0) > 0)
      .reduce((sum, s) => sum + s.weightKg! * s.reps!, 0);
  };
  const now = volume(monday, today);
  if (now > 0) {
    const before = volume(lastMonday, addDays(lastMonday, elapsed));
    return { kind: "volume", kg: Math.round(now), change: before > 0 ? Math.round(((now - before) / before) * 100) : null };
  }
  return { kind: "activities", count: doneBetween({ from: monday, to: today, workouts: input.workouts, sets: input.sets }).length };
}
