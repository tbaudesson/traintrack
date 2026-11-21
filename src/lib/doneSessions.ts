import { isCardioDone } from "@/lib/cardio";
import type { Workout, WorkoutSet } from "@/db";

type W = Pick<Workout, "id" | "kind" | "distanceM" | "durationSec" | "durationMin"> & { cancelledAt?: string | null };
type S = Pick<WorkoutSet, "workoutId" | "completed" | "isWarmup">;

/**
 * A session done: one with something in it, a working set ticked, a distance
 * or a time (an outing, a timed session, vaulting). A session opened then
 * left stays in the history, but is not an activity: the week's goal, the
 * week's line, the insights and the advice all count only sessions done, so
 * the home screen, the week and Performance read the very same ones. A
 * warm-up or a stretch is followed on its own (the mobility page): it is not a
 * training session for the week's goal nor the load.
 */
export function doneSessions<T extends W>(workouts: T[], sets: S[]): T[] {
  const withSets = new Set(sets.filter((s) => s.completed && !s.isWarmup).map((s) => s.workoutId));
  return workouts.filter((w) => !w.cancelledAt && w.kind !== "mobility" && (withSets.has(w.id!) || isCardioDone(w) || (w.durationMin ?? 0) > 0 || (w.durationSec ?? 0) > 0));
}
