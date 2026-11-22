import type { ExerciseLevel, Movement } from "@/db";

/** The movements, in the order they are offered (the same list the database accepts, migration 076). */
export const MOVEMENTS: readonly Movement[] = [
  "squat", "hinge", "lunge",
  "push_horizontal", "push_vertical", "pull_horizontal", "pull_vertical",
  "overhead", "hanging", "isolation",
  "core_flexion", "core_stability", "rotation",
  "jump", "conditioning", "mobility",
];

export const LEVELS: readonly ExerciseLevel[] = ["beginner", "intermediate", "advanced"];
