/**
 * Training load, the way team sports watch it: each session weighs its
 * minutes times how hard it felt (session RPE, Foster), and the last seven
 * days are compared with the weekly average of the last four weeks (the
 * acute:chronic workload ratio). A sharp rise over what the body is used to
 * comes before many injuries; a long drop loses fitness. Pure.
 */

type W = { id?: number; date: string; kind?: string; durationMin?: number; durationSec?: number | null };
type S = { workoutId: number; completed: boolean; isWarmup?: boolean; rpe?: number };

export type LoadZone = "low" | "optimal" | "caution" | "danger";

export interface TrainingLoad {
  /** Load of the last 7 days, today included. */
  acute: number;
  /** Weekly average over the last 28 days. */
  chronic: number;
  /** acute / chronic, two decimals. */
  ratio: number;
  zone: LoadZone;
  /** The last four weeks, oldest first, each 7 days ending on today's side. */
  weeks: number[];
}

/** How hard a session felt when nobody said: by kind of session. */
const DEFAULT_RPE: Record<string, number> = { strength: 7, interval: 8, cardio: 6 };
/** A strength set and its rest, when the session has no duration. */
const MINUTES_PER_SET = 3;

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** One session's load: minutes × session RPE. */
export function sessionLoad(w: W, sets: S[]): number {
  const work = sets.filter((s) => s.completed && !s.isWarmup);
  const minutes = w.durationMin ?? (w.durationSec ? w.durationSec / 60 : work.length * MINUTES_PER_SET);
  const rpes = work.map((s) => s.rpe).filter((r): r is number => !!r && r >= 1 && r <= 10);
  const rpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : (DEFAULT_RPE[w.kind ?? "strength"] ?? 6);
  return Math.round(Math.min(Math.max(minutes, 0), 300) * rpe);
}

export function loadZone(ratio: number): LoadZone {
  if (ratio < 0.8) return "low";
  if (ratio <= 1.3) return "optimal";
  if (ratio <= 1.5) return "caution";
  return "danger";
}

/**
 * The load today, or null without three weeks of history (the ratio means
 * nothing before) or without any load over the last four weeks.
 */
export function trainingLoad(input: { today: string; workouts: W[]; sets: S[] }): TrainingLoad | null {
  const { today } = input;
  const first = input.workouts.reduce<string | null>((min, w) => (min === null || w.date < min ? w.date : min), null);
  if (!first || first > addDays(today, -21)) return null;

  const from = addDays(today, -27);
  const byWorkout = new Map<number, S[]>();
  for (const s of input.sets) byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s]);

  const weeks = [0, 0, 0, 0];
  for (const w of input.workouts) {
    if (w.date < from || w.date > today) continue;
    const daysAgo = Math.round((Date.parse(today) - Date.parse(w.date)) / 86_400_000);
    weeks[3 - Math.floor(daysAgo / 7)] += sessionLoad(w, w.id === undefined ? [] : (byWorkout.get(w.id) ?? []));
  }
  const acute = weeks[3];
  const chronic = Math.round(weeks.reduce((a, b) => a + b, 0) / 4);
  if (!chronic) return null;
  const ratio = Math.round((acute / chronic) * 100) / 100;
  return { acute, chronic, ratio, zone: loadZone(ratio), weeks };
}
