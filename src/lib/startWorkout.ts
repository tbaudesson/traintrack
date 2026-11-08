import type { Exercise, Program, ProgramDay } from "@/db";
import { createWorkout } from "@/hooks/useWorkouts";
import { addWorkoutSet } from "@/hooks/useWorkoutSets";
import { createCustomExercise } from "@/hooks/useExercises";

/** The title a workout started from a program day carries. */
export function programDayTitle(programName: string, dayName: string): string {
  return `${programName} — ${dayName}`;
}

/** The program day a workout was started from, recognised by its title. */
export function findProgramDay(programs: Program[], title?: string): ProgramDay | null {
  for (const program of programs) {
    const day = (program.structure ?? []).find((d) => programDayTitle(program.name, d.name) === title);
    if (day) return day;
  }
  return null;
}

/** Create today's workout with its sets pre-filled from a program day. */
export async function startWorkoutFromDay(
  programName: string,
  day: ProgramDay,
  exercises: Exercise[],
  date: string
): Promise<number> {
  const id = await createWorkout({ date, title: programDayTitle(programName, day.name) });
  for (const pe of day.exercises) {
    // Resolve the exercise by uuid or name; create a custom one if missing
    const ex = exercises.find(
      (e) => (pe.exerciseUuid && e.uuid === pe.exerciseUuid) || e.name.toLowerCase() === pe.exerciseName.toLowerCase()
    );
    let exerciseId = ex?.id;
    if (!exerciseId) {
      exerciseId = await createCustomExercise({ name: pe.exerciseName, muscleGroup: "other" });
    }
    const sets = Math.max(1, pe.targetSets || 1);
    for (let i = 1; i <= sets; i++) {
      await addWorkoutSet({ workoutId: id, exerciseId, setNumber: i, restSec: pe.restSec, completed: false });
    }
  }
  return id;
}
