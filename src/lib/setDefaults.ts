import type { Exercise, FitnessLevel, WorkoutSet } from "@/db";
import { levelItem, startingLoad, type LevelsReference } from "./levels";
import { bottomOfRepRange, isTimedTarget, topWeight } from "./performance";

type Values = Pick<WorkoutSet, "weightKg" | "reps" | "rpe">;

/** The lowest number of a target: "30-45s" → 30, "8-10" → 8. */
function bottomOf(target: string | undefined): number | null {
  const numbers = target?.match(/\d+/g)?.map(Number);
  return numbers?.length ? Math.min(...numbers) : null;
}

/**
 * Values for the empty boxes of a set not done yet, so a session can be filled
 * in one tap. What is already typed is never replaced. Reps come from the
 * program, then last time, then the level; the weight from the suggested
 * progression, then last time, then a light first load for the level.
 */
export function defaultSetValues(input: {
  set: Pick<WorkoutSet, "setNumber" | "completed"> & Values;
  totalSets: number;
  level?: FitnessLevel;
  /** The levels as the admin keeps them: reps, effort and first loads when nothing else says. */
  levels: LevelsReference | null;
  exercise?: Pick<Exercise, "equipment" | "muscleGroup">;
  targetReps?: string;
  previous: Pick<WorkoutSet, "setNumber" | "weightKg" | "reps" | "workoutId" | "exerciseId" | "completed">[];
  suggestion: number | null;
  /** The weight a percentage-of-1RM program sets for this set. */
  plannedKg?: number;
}): Values {
  const { set, totalSets, exercise, targetReps, previous, suggestion } = input;
  const level = levelItem(input.levels, input.level);
  const filled: Values = {};
  if (set.completed) return filled;
  const timed = isTimedTarget(targetReps);
  const same = previous.find((p) => p.setNumber === set.setNumber);

  if (!set.reps) {
    const reps = timed ? bottomOf(targetReps) : (bottomOfRepRange(targetReps) ?? same?.reps ?? level?.reps);
    if (reps) filled.reps = reps;
  }
  if (!set.weightKg && !timed) {
    const weight = input.plannedKg ?? suggestion ?? same?.weightKg ?? topWeight(previous) ?? startingLoad(input.levels, exercise, input.level ?? "beginner");
    if (weight) filled.weightKg = weight;
  }
  if (!set.rpe && level) filled.rpe = Math.min(10, level.rpe + (set.setNumber >= totalSets ? 1 : 0));
  return filled;
}
