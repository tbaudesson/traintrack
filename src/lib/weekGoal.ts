import { findWorkoutProgramDay } from "@/lib/startWorkout";
import { isCardioDone, weeklyGoal } from "@/lib/cardio";
import type { Program, ProgramDay, Workout, WorkoutSet } from "@/db";

type W = Pick<Workout, "id" | "date" | "title" | "programId" | "programDayIndex" | "kind" | "distanceM" | "durationSec">;
type S = Pick<WorkoutSet, "workoutId" | "completed" | "isWarmup">;

export interface WeekGoal {
  /** Sessions the program asks for this week. */
  target: number;
  /** Sessions of the program done this week. */
  done: number;
  /** Sessions of the program done beyond the target. */
  beyond: number;
  /** Other activities done this week: other programs, free sessions, outings. */
  others: number;
}

/**
 * The week's goal of the program in progress. Only its own sessions count
 * towards it, and only those with something done (a set, a distance, a time):
 * a session opened then left is not one. The rest of the week's training is
 * counted apart, so a goal of 3 never reads "11 / 3".
 */
export function weekGoal(input: {
  program: Program;
  day: ProgramDay | undefined;
  monday: string;
  today: string;
  workouts: W[];
  sets: S[];
}): WeekGoal {
  const { program, monday, today } = input;
  const target = weeklyGoal(program, input.day);
  const withSets = new Set(input.sets.filter((s) => s.completed && !s.isWarmup).map((s) => s.workoutId));
  const week = input.workouts.filter((w) => w.date >= monday && w.date <= today && (withSets.has(w.id!) || isCardioDone(w)));
  const done = week.filter((w) => findWorkoutProgramDay([program], w)).length;
  return { target, done, beyond: Math.max(0, done - target), others: week.length - done };
}
