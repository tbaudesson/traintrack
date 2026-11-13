import type { Equipment, Exercise, FitnessLevel, MuscleGroup, WorkoutSet } from "@/db";
import { bottomOfRepRange, isTimedTarget, topWeight } from "./performance";

type Values = Pick<WorkoutSet, "weightKg" | "reps" | "rpe">;
type Level = [beginner: number, intermediate: number, advanced: number];

const LEVEL_INDEX: Record<FitnessLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Reps when nothing else says: lighter and longer for beginners. */
const REPS: Level = [12, 10, 8];
/** Effort of every set but the last, which is one notch harder. */
const RPE: Level = [7, 8, 8];

/** A first load, kept on the light side: better to add than to fail. */
const START_KG: Partial<Record<Equipment, Partial<Record<MuscleGroup, Level>> & { default: Level }>> = {
  barbell: {
    legs: [40, 60, 80], back: [40, 60, 80], chest: [30, 50, 70],
    shoulders: [20, 35, 50], arms: [15, 25, 35], default: [30, 50, 70],
  },
  dumbbell: {
    legs: [10, 16, 24], back: [10, 18, 26], chest: [10, 16, 24],
    shoulders: [6, 10, 14], arms: [6, 10, 14], default: [8, 12, 18],
  },
  machine: {
    legs: [40, 70, 100], back: [25, 40, 55], chest: [25, 40, 55],
    shoulders: [15, 25, 35], arms: [12, 20, 30], core: [10, 20, 30], default: [20, 35, 50],
  },
  cable: {
    legs: [20, 30, 40], back: [25, 40, 55], chest: [15, 25, 35],
    shoulders: [7.5, 12.5, 17.5], arms: [12.5, 20, 27.5], core: [15, 25, 35], default: [15, 25, 35],
  },
  kettlebell: { default: [8, 12, 16] },
};

export function startingLoad(exercise: Pick<Exercise, "equipment" | "muscleGroup"> | undefined, level: FitnessLevel): number | undefined {
  const table = exercise?.equipment ? START_KG[exercise.equipment] : undefined;
  if (!table) return undefined;
  return (table[exercise!.muscleGroup] ?? table.default)[LEVEL_INDEX[level]];
}

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
  exercise?: Pick<Exercise, "equipment" | "muscleGroup">;
  targetReps?: string;
  previous: Pick<WorkoutSet, "setNumber" | "weightKg" | "reps" | "workoutId" | "exerciseId" | "completed">[];
  suggestion: number | null;
}): Values {
  const { set, totalSets, exercise, targetReps, previous, suggestion } = input;
  const level = LEVEL_INDEX[input.level ?? "beginner"];
  const filled: Values = {};
  if (set.completed) return filled;
  const timed = isTimedTarget(targetReps);
  const same = previous.find((p) => p.setNumber === set.setNumber);

  if (!set.reps) {
    const reps = timed ? bottomOf(targetReps) : (bottomOfRepRange(targetReps) ?? same?.reps ?? REPS[level]);
    if (reps) filled.reps = reps;
  }
  if (!set.weightKg && !timed) {
    const weight = suggestion ?? same?.weightKg ?? topWeight(previous) ?? startingLoad(exercise, input.level ?? "beginner");
    if (weight) filled.weightKg = weight;
  }
  if (!set.rpe) filled.rpe = RPE[level] + (set.setNumber >= totalSets ? 1 : 0);
  return filled;
}
