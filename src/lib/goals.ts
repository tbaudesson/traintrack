import { estimateOneRepMax } from "./performance";

/** A lift to reach: an estimated one-rep max on an exercise, maybe by a date. */
export interface StrengthGoal {
  id: string;
  /** Synced id of the exercise; the name stays as a fallback. */
  exerciseUuid?: string;
  exerciseName: string;
  targetKg: number;
  /** YYYY-MM-DD */
  deadline?: string;
  /** Estimated 1RM when the goal was set, the start of the progress bar. */
  startKg: number;
  createdAt: string;
}

export interface GoalPoint {
  date: string;
  oneRepMax: number;
}

export interface GoalProgress {
  currentKg: number;
  /** 0–1 from the start to the target. */
  share: number;
  /** The first day the target was reached, if it was. */
  achievedOn?: string;
  /** When the trend of the last eight weeks reaches the target, if it does. */
  projectedOn?: string | null;
  /** Ahead of the deadline at the current pace; undefined without one. */
  onTrack?: boolean;
}

const DAY_MS = 86400000;
const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;
const fromDay = (day: number) => new Date(Math.round(day) * DAY_MS).toISOString().slice(0, 10);

/** The best estimated 1RM of each session with this exercise, oldest first. */
export function oneRepMaxHistory(
  exerciseId: number,
  workouts: { id?: number; date: string }[],
  sets: { workoutId: number; exerciseId: number; completed: boolean; isWarmup?: boolean; weightKg?: number | null; reps?: number | null }[]
): GoalPoint[] {
  const dates = new Map(workouts.map((w) => [w.id, w.date]));
  const best = new Map<string, number>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || !s.completed || s.isWarmup || !s.weightKg || !s.reps) continue;
    const date = dates.get(s.workoutId);
    if (!date) continue;
    best.set(date, Math.max(best.get(date) ?? 0, estimateOneRepMax(s.weightKg, s.reps)));
  }
  return [...best.entries()].map(([date, oneRepMax]) => ({ date, oneRepMax })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Where a goal stands: the best estimated 1RM so far, the share of the way
 * from where it started, the day it was reached, and, from the trend of the
 * last eight weeks (three sessions over two weeks at least), when it should be.
 */
export function goalProgress(goal: StrengthGoal, history: GoalPoint[], today: string): GoalProgress {
  const currentKg = Math.round(Math.max(goal.startKg, ...history.map((p) => p.oneRepMax)) * 10) / 10;
  const span = goal.targetKg - goal.startKg;
  const share = span <= 0 ? 1 : Math.max(0, Math.min(1, (currentKg - goal.startKg) / span));
  const since = goal.createdAt.slice(0, 10);
  const achievedOn = history.find((p) => p.date >= since && p.oneRepMax >= goal.targetKg)?.date ?? (span <= 0 ? since : undefined);
  if (achievedOn) return { currentKg, share: 1, achievedOn };

  const recent = history.filter((p) => toDay(today) - toDay(p.date) <= 56);
  let projectedOn: string | null = null;
  if (recent.length >= 3 && toDay(recent.at(-1)!.date) - toDay(recent[0].date) >= 14) {
    const xs = recent.map((p) => toDay(p.date));
    const ys = recent.map((p) => p.oneRepMax);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    if (slope > 0) {
      const day = mx + (goal.targetKg - my) / slope;
      projectedOn = fromDay(Math.max(day, toDay(today) + 1));
    }
  }
  return {
    currentKg,
    share,
    projectedOn,
    onTrack: goal.deadline ? projectedOn !== null && projectedOn <= goal.deadline : undefined,
  };
}
