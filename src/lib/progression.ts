import type { Equipment, WorkoutSet } from "@/db";
import { bottomOfRepRange, isTimedTarget, topOfRepRange } from "./performance";

type Logged = Pick<WorkoutSet, "weightKg" | "reps" | "rpe">;

export type AdviceKind = "jump" | "up" | "moreReps" | "hold" | "deload";

export interface Advice {
  kind: AdviceKind;
  /** The weight to use today. */
  weightKg: number;
  /** The weight used last time. */
  fromKg: number;
  /** The hardest effort felt last time, when it was noted. */
  rpe?: number;
}

const hardest = (sets: Logged[]) => {
  const noted = sets.map((s) => s.rpe ?? 0).filter((r) => r > 0);
  return noted.length ? Math.max(...noted) : undefined;
};

/**
 * Today's load from how the last sessions went. The RPE says whether there was
 * room left: easy sets jump two steps, a target reached at a reasonable effort
 * goes up one, a hard one holds, and two hard sessions with missed reps in a
 * row ease off by a tenth to start again. Without any RPE noted, the weight
 * only goes up once every set reached the top of the range.
 */
export function nextLoad(input: {
  /** Logged sets of the last sessions, most recent first. */
  sessions: Logged[][];
  targetSets?: number;
  targetReps?: string;
  equipment?: Equipment;
}): Advice | null {
  const [last, before] = input.sessions;
  const weights = (last ?? []).map((s) => s.weightKg ?? 0).filter((w) => w > 0);
  if (!weights.length || isTimedTarget(input.targetReps)) return null;
  const fromKg = Math.max(...weights);

  const step = input.equipment === "dumbbell" || input.equipment === "kettlebell" ? 2 : 2.5;
  const round = (kg: number) => Math.round(kg / step) * step;
  const top = topOfRepRange(input.targetReps);
  const bottom = bottomOfRepRange(input.targetReps);
  const rpe = hardest(last);
  const missed = (sets: Logged[]) => bottom !== null && sets.some((s) => (s.reps ?? 0) < bottom);
  const reachedTop = top !== null && last.length >= (input.targetSets ?? last.length) && last.every((s) => (s.reps ?? 0) >= top);
  const advice = (kind: AdviceKind, weightKg: number): Advice => ({ kind, weightKg, fromKg, rpe });

  const struggling = (sets: Logged[]) => missed(sets) && (hardest(sets) ?? 10) >= 9;
  if (before && struggling(last) && struggling(before)) return advice("deload", Math.floor((fromKg * 0.9) / step) * step);

  if (rpe === undefined) return reachedTop ? advice("up", fromKg + step) : null;
  if (rpe >= 9.5) return advice("hold", fromKg);
  if (rpe <= 6.5 && !missed(last) && (top === null || last.length >= (input.targetSets ?? 0))) {
    return advice("jump", round(fromKg + 2 * step));
  }
  if (top === null) return null;
  if (reachedTop) return rpe <= 8 ? advice("up", fromKg + step) : advice("hold", fromKg);
  return advice("moreReps", fromKg);
}
