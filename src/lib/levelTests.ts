import type { Program, ProgramDay } from "@/db";
import { programFingerprint } from "./programOrigin";
import { findWorkoutProgramDay } from "./startWorkout";

/** Weeks between two rounds of tests. */
export const RETEST_WEEKS = 6;

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec: number) => ({ exerciseName, targetSets, targetReps, restSec });

/**
 * The tests, as a program of two days: the heaviest set of one to five reps
 * on the main lifts (the estimated 1RM, which the programs in percentages
 * then use), and the most one can do of pull-ups, push-ups and a plank.
 * The day names are given in the athlete's language.
 */
export function testStructure(names: { strength: string; bodyweight: string }): ProgramDay[] {
  return [
    {
      name: names.strength,
      exercises: [ex("Back Squat", 3, "1-5", 180), ex("Barbell Bench Press", 3, "1-5", 180), ex("Deadlift", 2, "1-5", 180)],
    },
    {
      name: names.bodyweight,
      exercises: [ex("Pull-up", 1, "max", 120), ex("Push-up", 1, "max", 120), ex("Plank", 1, "max s", 120)],
    },
  ];
}

const FINGERPRINT = programFingerprint(testStructure({ strength: "", bodyweight: "" }));

/** The athlete's tests program, whatever language it was made in. */
export const isTestProgram = (program: Pick<Program, "structure">) => programFingerprint(program.structure) === FINGERPRINT;

/**
 * Where the tests stand: the last day tested and when to test again, six
 * weeks on. Null when no test was ever done.
 */
export function testsDue(input: {
  program: Program;
  workouts: { date: string; title?: string; programId?: number | null; programDayIndex?: number | null }[];
  today: string;
}): { last: string; next: string; due: boolean } | null {
  const done = input.workouts.filter((w) => w.date <= input.today && findWorkoutProgramDay([input.program], w)).map((w) => w.date).sort();
  const last = done.at(-1);
  if (!last) return null;
  const [y, m, d] = last.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + RETEST_WEEKS * 7)).toISOString().slice(0, 10);
  return { last, next, due: input.today >= next };
}
