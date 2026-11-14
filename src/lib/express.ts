import type { ProgramDay, ProgramExercise } from "@/db";
import { isTimedTarget } from "./performance";

/** The time a set takes, rest aside: a timed target says it, otherwise 40 s. */
const workSec = (e: ProgramExercise) => {
  if (isTimedTarget(e.targetReps)) {
    const n = Number(e.targetReps.match(/(\d+)\s*s\s*$/i)?.[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 40;
};

/** Minutes a strength day takes: each set and its rest (none inside a superset), and 5 minutes of warm-up. */
export function dayMinutes(day: Pick<ProgramDay, "exercises">): number {
  let sec = 300;
  for (const e of day.exercises) {
    const sets = Math.max(1, e.targetSets || 1);
    sec += sets * (workSec(e) + (e.supersetWithNext ? 0 : (e.restSec ?? 90)));
  }
  return Math.round(sec / 60);
}

export interface Express {
  day: ProgramDay;
  /** Exercises left out to fit the time. */
  dropped: string[];
}

/**
 * A shorter version of a day, to fit the minutes there are. The first two
 * exercises, the main lifts, keep up to three sets; the others go down to two
 * sets, paired in supersets with a minute of rest; then, while it is still
 * too long, the last ones go, and at last the main lifts lose a set. The day
 * keeps its name: the session counts as the planned one.
 */
export function expressDay(day: ProgramDay, minutes: number): Express {
  if (day.cardio || dayMinutes(day) <= minutes) return { day, dropped: [] };
  const main = day.exercises.slice(0, 2).map((e) => ({ ...e, targetSets: Math.min(e.targetSets || 1, 3), restSec: Math.min(e.restSec ?? 90, 150) }));
  let accessories = day.exercises.slice(2).map((e) => ({ ...e, targetSets: Math.min(e.targetSets || 1, 2), restSec: 60, supersetWithNext: false }));
  const dropped: string[] = [];
  // The last exercise of the main lifts never chains into the accessories.
  const pair = (list: ProgramExercise[]) => list.map((e, i) => ({ ...e, supersetWithNext: i % 2 === 0 && i < list.length - 1 }));
  const build = (m: ProgramExercise[], a: ProgramExercise[]): ProgramDay => ({
    ...day,
    exercises: [...m.map((e, i) => (i === m.length - 1 ? { ...e, supersetWithNext: false } : e)), ...pair(a)],
  });
  let shorter = build(main, accessories);
  while (dayMinutes(shorter) > minutes && accessories.length) {
    dropped.push(accessories.at(-1)!.exerciseName);
    accessories = accessories.slice(0, -1);
    shorter = build(main, accessories);
  }
  let lighter = main;
  while (dayMinutes(shorter) > minutes && lighter.some((e) => e.targetSets > 1)) {
    lighter = lighter.map((e) => ({ ...e, targetSets: Math.max(1, e.targetSets - 1) }));
    shorter = build(lighter, accessories);
  }
  if (dayMinutes(shorter) > minutes && lighter.length > 1) {
    dropped.push(lighter[1].exerciseName);
    shorter = build(lighter.slice(0, 1), accessories);
  }
  return { day: shorter, dropped };
}
