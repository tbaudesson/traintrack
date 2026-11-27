import type { ProgramDay } from "@/db";

/** The intensities offered at the start of a session, in percent of the program's reps and holds. */
export const INTENSITY_STEPS = [-20, 0, 10, 20, 30] as const;

/**
 * A program's target made harder or easier: each number (reps, seconds) by
 * the percentage, rounded up, never below 1. "10" at +20 % → "12", "8-12" →
 * "10-15", "25s" → "30s"; a target without a number is left as it is.
 */
export function scaleTarget(target: string, pct: number | null | undefined): string {
  if (!pct) return target;
  // Rounded up, after removing the float's noise (10 × 1.2 = 12.000000000000002).
  return target.replace(/\d+/g, (n) => String(Math.max(1, Math.ceil(Math.round(Number(n) * (100 + pct)) / 100))));
}

/** A program day with its reps and holds at the session's intensity. */
export function scaleDay<D extends Pick<ProgramDay, "exercises">>(day: D, pct: number | null | undefined): D {
  if (!pct) return day;
  return { ...day, exercises: day.exercises.map((e) => ({ ...e, targetReps: scaleTarget(e.targetReps, pct) })) };
}

/** The intensity of the last session of a program, offered again for the next one. */
export function lastIntensity(
  workouts: { programId?: number | null; date: string; id?: number; intensityPct?: number | null; deletedAt?: string | null }[],
  programId: number | null | undefined
): number | null {
  if (programId == null) return null;
  const last = workouts
    .filter((w) => w.programId === programId && !w.deletedAt && w.intensityPct != null)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))[0];
  return last?.intensityPct ?? null;
}
