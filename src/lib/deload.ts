import { mondayOfDate } from "./weekPlan";

export type DeloadReason = "weeks" | "rpe" | "readiness";

export interface DeloadAdvice {
  reason: DeloadReason;
  /** Training weeks in a row without a light one. */
  weeks: number;
  rpe?: number;
  readiness?: number;
}

/** Loads during a deload week: a tenth lighter. */
export const DELOAD_LOAD = 0.9;
/** Working sets kept during a deload week: about 60 %, never under one. */
export const deloadSets = (sets: number) => Math.max(1, Math.round(sets * 0.6));

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/**
 * Whether to suggest a deload week now. Five training weeks in a row without
 * a light one, or sooner when tired: an average RPE of 9 or more over two
 * weeks, or a readiness under 50 over the last seven days. A light week (under
 * 60 % of the usual volume) or a week off counts as rest and starts the count
 * again. Nothing right after a rest, nor when the week is already a deload.
 */
export function deloadAdvice(input: {
  today: string;
  workouts: { id?: number; date: string; kind?: string }[];
  sets: { workoutId: number; completed: boolean; isWarmup?: boolean; weightKg?: number | null; reps?: number | null; rpe?: number | null }[];
  readiness?: { date: string; score: number | null }[];
  /** Monday of the week the athlete already chose to deload. */
  deloadWeek?: string;
  every?: number;
}): DeloadAdvice | null {
  const monday = mondayOfDate(input.today);
  if (input.deloadWeek === monday) return null;
  const strength = input.workouts.filter((w) => w.kind !== "cardio" && w.date < monday);
  const weekOf = new Map(strength.map((w) => [w.id, mondayOfDate(w.date)]));
  const volume = new Map<string, number>();
  for (const s of input.sets) {
    const week = weekOf.get(s.workoutId);
    if (!week || !s.completed || s.isWarmup || !s.weightKg || !s.reps) continue;
    volume.set(week, (volume.get(week) ?? 0) + s.weightKg * s.reps);
  }

  // Count back from last week: trained, ordinary weeks in a row.
  let weeks = 0;
  for (let week = addDays(monday, -7); ; week = addDays(week, -7)) {
    const v = volume.get(week) ?? 0;
    if (v === 0 || week === input.deloadWeek) break;
    const before = [1, 2, 3, 4].map((k) => volume.get(addDays(week, -7 * k)) ?? 0).filter((x) => x > 0).sort((a, b) => a - b);
    const usual = before.length ? before[Math.floor(before.length / 2)] : 0;
    if (usual > 0 && v < usual * 0.6) break;
    weeks++;
    if (weeks > 52) break;
  }

  const since = addDays(input.today, -14);
  const recent = new Set(strength.filter((w) => w.date >= since).map((w) => w.id));
  const rpes = input.sets
    .filter((s) => s.completed && !s.isWarmup && recent.has(s.workoutId) && s.rpe && s.rpe >= 1 && s.rpe <= 10)
    .map((s) => s.rpe!);
  const rpe = rpes.length >= 6 ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : undefined;

  const lastWeek = addDays(input.today, -7);
  const scores = (input.readiness ?? []).filter((r) => r.date > lastWeek && r.score !== null).map((r) => r.score!);
  const readiness = scores.length >= 3 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;

  if (weeks >= (input.every ?? 5)) return { reason: "weeks", weeks, rpe, readiness };
  if (weeks >= 2 && rpe !== undefined && rpe >= 9) return { reason: "rpe", weeks, rpe, readiness };
  if (weeks >= 2 && readiness !== undefined && readiness < 50) return { reason: "readiness", weeks, rpe, readiness };
  return null;
}
