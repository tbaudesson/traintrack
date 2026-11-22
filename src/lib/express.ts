import type { CardioTarget, ProgramDay, ProgramExercise, Sport } from "@/db";
import { targetSeconds } from "./performance";

/** The time a set takes, rest aside: a timed target says it, otherwise 40 s. */
const workSec = (e: ProgramExercise) => targetSeconds(e.targetReps) ?? 40;

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

type Outing = { date: string; kind?: string; sport?: string | null; distanceM?: number | null; durationSec?: number | null; cancelledAt?: string | null };

/**
 * The athlete's usual speed in a sport (metres a second): the median of the
 * last ten outings long enough for a pace to mean something. Null without:
 * no time is guessed for a distance then.
 */
export function usualSpeed(workouts: Outing[], sport: Sport, minDistanceM: number): number | null {
  const speeds = workouts
    .filter((w) => !w.cancelledAt && w.kind === "cardio" && w.sport === sport && (w.distanceM ?? 0) >= minDistanceM && (w.durationSec ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map((w) => w.distanceM! / w.durationSec!)
    .sort((a, b) => a - b);
  if (!speeds.length) return null;
  const mid = Math.floor(speeds.length / 2);
  return speeds.length % 2 ? speeds[mid] : (speeds[mid - 1] + speeds[mid]) / 2;
}

/** Minutes an endurance day takes: its time when set, else its distance at one's usual speed; null when neither tells. */
export function cardioMinutes(target: CardioTarget, speed: number | null): number | null {
  if (target.durationMin) return target.durationMin;
  if (target.blocks?.length) return Math.round(target.blocks.reduce((s, b) => s + b.sec, 0) / 60);
  if (target.distanceKm && speed) return Math.round((target.distanceKm * 1000) / speed / 60);
  return null;
}

export interface ExpressCardio {
  day: ProgramDay;
  /** The full session's step-by-step was left out: it does not fit the shorter time as written. */
  stepsDropped: boolean;
}

/**
 * An endurance session in less time: the minutes there are, the distance in
 * proportion (to the half kilometre, to 50 m in the water), a guided ride's
 * blocks each shortened alike. The intensity and the purpose stay; the
 * step-by-step of the full session is left out. Still the planned session.
 */
export function expressCardio(day: ProgramDay, full: number, minutes: number): ExpressCardio {
  const target = day.cardio;
  if (!target || full <= minutes) return { day, stepsDropped: false };
  const ratio = minutes / full;
  const swim = target.sport === "swim";
  const step = swim ? 0.05 : 0.5;
  const distanceKm = target.distanceKm ? Math.max(step, Math.round((target.distanceKm * ratio) / step) * step) : undefined;
  const blocks = target.blocks?.map((b) => ({ ...b, sec: Math.max(30, Math.round((b.sec * ratio) / 10) * 10) }));
  const stepsDropped = !!target.steps?.length;
  return {
    day: {
      ...day,
      cardio: {
        ...target,
        durationMin: minutes,
        ...(distanceKm !== undefined ? { distanceKm: Math.round(distanceKm * 100) / 100 } : {}),
        ...(blocks ? { blocks } : {}),
        steps: undefined,
      },
    },
    stepsDropped,
  };
}
