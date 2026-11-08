import type { Exercise, Program, Workout } from "@/db";
import db, { getCurrentUserIdSync } from "@/db";
import { lastPerformance, suggestWeight, topWeight } from "@/lib/performance";
import { createWorkout } from "@/hooks/useWorkouts";
import { addWorkoutSet } from "@/hooks/useWorkoutSets";
import { createCustomExercise } from "@/hooks/useExercises";

/** The title a workout started from a program day carries. */
export function programDayTitle(programName: string, dayName: string): string {
  return `${programName} — ${dayName}`;
}

/**
 * The program day a workout was started from. The stored link survives any
 * renaming; workouts from before it existed are recognised by their title.
 */
export function findWorkoutProgramDay(
  programs: Program[],
  workout: Pick<Workout, "title" | "programId" | "programDayIndex"> | undefined
): { program: Program; index: number } | null {
  if (!workout) return null;
  if (workout.programId != null && workout.programDayIndex != null) {
    const program = programs.find((p) => p.id === workout.programId);
    if (program?.structure?.[workout.programDayIndex]) return { program, index: workout.programDayIndex };
  }
  for (const program of programs) {
    const index = (program.structure ?? []).findIndex((d) => programDayTitle(program.name, d.name) === workout.title);
    if (index !== -1) return { program, index };
  }
  return null;
}

/** Create today's workout with its sets pre-filled from a program day. */
export async function startWorkoutFromDay(
  program: Program,
  dayIndex: number,
  exercises: Exercise[],
  date: string
): Promise<number> {
  const uid = getCurrentUserIdSync();
  const pastWorkouts = await db.workouts.filter((w) => !w.deletedAt && (!uid || w.userId === uid)).toArray();
  const pastSets = await db.workoutSets.filter((s) => !s.deletedAt && (!uid || s.userId === uid)).toArray();
  const day = program.structure[dayIndex];
  const id = await createWorkout({
    date,
    title: programDayTitle(program.name, day.name),
    programId: program.id,
    programDayIndex: dayIndex,
  });
  for (const pe of day.exercises) {
    // Resolve the exercise by uuid or name; create a custom one if missing
    const ex = exercises.find(
      (e) => (pe.exerciseUuid && e.uuid === pe.exerciseUuid) || e.name.toLowerCase() === pe.exerciseName.toLowerCase()
    );
    let exerciseId = ex?.id;
    if (!exerciseId) {
      exerciseId = await createCustomExercise({ name: pe.exerciseName, muscleGroup: "other" });
    }
    const last = lastPerformance(exerciseId, undefined, pastWorkouts, pastSets);
    const weightKg = suggestWeight(last, pe.targetSets, pe.targetReps) ?? topWeight(last) ?? undefined;
    const sets = Math.max(1, pe.targetSets || 1);
    for (let i = 1; i <= sets; i++) {
      await addWorkoutSet({ workoutId: id, exerciseId, setNumber: i, weightKg, restSec: pe.restSec, completed: false });
    }
  }
  return id;
}
