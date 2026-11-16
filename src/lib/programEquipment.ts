import type { Equipment, ProgramDay } from "@/db";
import { INJURY_RULES } from "./injuries";
import type { PainArea } from "./pain";

/**
 * What each exercise of the ready-made programs needs, beyond the body:
 * the library's equipment, except the exercises hung from a pull-up bar,
 * filed "bodyweight" in the library but impossible without one.
 */
const NEEDS: Record<string, Exclude<Equipment, "bodyweight" | "other">> = {
  "Back Squat": "barbell",
  "Barbell Bench Press": "barbell",
  "Barbell Curl": "barbell",
  "Barbell Row": "barbell",
  Deadlift: "barbell",
  "Front Squat": "barbell",
  "Hip Thrust": "barbell",
  "Incline Barbell Bench Press": "barbell",
  "Overhead Press": "barbell",
  "Romanian Deadlift": "barbell",
  "Skull Crusher": "barbell",
  "T-Bar Row": "barbell",
  "Bulgarian Split Squat": "dumbbell",
  "Dumbbell Bench Press": "dumbbell",
  "Dumbbell Curl": "dumbbell",
  "Dumbbell Row": "dumbbell",
  "Goblet Squat": "dumbbell",
  "Hammer Curl": "dumbbell",
  "Incline Dumbbell Press": "dumbbell",
  "Lateral Raise": "dumbbell",
  "Overhead Triceps Extension": "dumbbell",
  "Rear Delt Fly": "dumbbell",
  "Seated Dumbbell Press": "dumbbell",
  "Single-Leg Romanian Deadlift": "dumbbell",
  "Step-up": "dumbbell",
  "Walking Lunge": "dumbbell",
  "Leg Curl": "machine",
  "Leg Extension": "machine",
  "Leg Press": "machine",
  "Standing Calf Raise": "machine",
  "Cable Crunch": "cable",
  "Cable Fly": "cable",
  "External Shoulder Rotation": "cable",
  "Face Pull": "cable",
  "Lat Pulldown": "cable",
  "Seated Cable Row": "cable",
  "Straight-Arm Pulldown": "cable",
  "Triceps Pushdown": "cable",
  "Dumbbell Romanian Deadlift": "dumbbell",
  "Dumbbell Glute Bridge": "dumbbell",
  "Dumbbell Floor Press": "dumbbell",
  "Pull-up": "pullup_bar",
  "Chin-up": "pullup_bar",
  "Hanging Leg Raise": "pullup_bar",
};

/** The equipment an exercise needs, or null for the body alone (and for exercises not known here). */
export const exerciseNeeds = (name: string): Equipment | null => NEEDS[name] ?? null;

/** Kettlebells do what the dumbbells of these programs do. */
const canDo = (name: string, has: Equipment[]) => {
  const need = exerciseNeeds(name);
  return !need || has.includes(need) || (need === "dumbbell" && has.includes("kettlebell"));
};

/** The equipment a program needs and the athlete does not have. */
export function missingEquipment(structure: { exercises?: { exerciseName: string }[] }[], has: Equipment[]): Equipment[] {
  const needs = structure.flatMap((d) => (d.exercises ?? []).map((e) => e.exerciseName)).filter((n) => !canDo(n, has));
  return [...new Set(needs.map((n) => exerciseNeeds(n)!))];
}

/**
 * What stands in for an exercise without its equipment, best first: the same
 * movement with a dumbbell, then with the body alone.
 */
const ALTERNATIVES: Record<string, string[]> = {
  "Back Squat": ["Goblet Squat", "Bodyweight Squat"],
  "Front Squat": ["Goblet Squat", "Bodyweight Squat"],
  "Barbell Bench Press": ["Dumbbell Bench Press", "Dumbbell Floor Press", "Push-up"],
  "Incline Barbell Bench Press": ["Incline Dumbbell Press", "Push-up"],
  "Barbell Row": ["Dumbbell Row", "Seated Cable Row", "Superman Hold"],
  "T-Bar Row": ["Dumbbell Row", "Seated Cable Row", "Superman Hold"],
  Deadlift: ["Dumbbell Romanian Deadlift", "Single-Leg Glute Bridge"],
  "Romanian Deadlift": ["Dumbbell Romanian Deadlift", "Single-Leg Glute Bridge"],
  "Hip Thrust": ["Dumbbell Glute Bridge", "Glute Bridge"],
  "Overhead Press": ["Seated Dumbbell Press", "Pike Push-up"],
  "Barbell Curl": ["Dumbbell Curl", "Hammer Curl"],
  "Skull Crusher": ["Overhead Triceps Extension", "Triceps Pushdown", "Bench Dip"],
  "Bulgarian Split Squat": ["Split Squat"],
  "Dumbbell Bench Press": ["Push-up"],
  "Dumbbell Row": ["Seated Cable Row", "Superman Hold"],
  "Goblet Squat": ["Bodyweight Squat"],
  "Incline Dumbbell Press": ["Push-up"],
  "Lateral Raise": ["Pike Push-up"],
  "Overhead Triceps Extension": ["Triceps Pushdown", "Bench Dip"],
  "Rear Delt Fly": ["Face Pull", "Superman Hold"],
  "Seated Dumbbell Press": ["Overhead Press", "Pike Push-up"],
  "Single-Leg Romanian Deadlift": ["Single-Leg Glute Bridge"],
  "Step-up": ["Reverse Lunge"],
  "Walking Lunge": ["Reverse Lunge"],
  "Leg Curl": ["Dumbbell Romanian Deadlift", "Single-Leg Glute Bridge"],
  "Leg Extension": ["Split Squat", "Wall Sit"],
  "Leg Press": ["Goblet Squat", "Bodyweight Squat"],
  "Standing Calf Raise": ["Single-Leg Calf Raise"],
  "Cable Crunch": ["Crunch"],
  "Cable Fly": ["Dumbbell Bench Press", "Push-up"],
  "Face Pull": ["Rear Delt Fly", "Superman Hold"],
  "Lat Pulldown": ["Pull-up", "Dumbbell Row", "Superman Hold"],
  "Seated Cable Row": ["Dumbbell Row", "Superman Hold"],
  "Straight-Arm Pulldown": ["Dumbbell Row", "Superman Hold"],
  "Triceps Pushdown": ["Overhead Triceps Extension", "Bench Dip"],
  "Pull-up": ["Lat Pulldown", "Dumbbell Row", "Superman Hold"],
  "Chin-up": ["Lat Pulldown", "Dumbbell Row", "Superman Hold"],
  "Hanging Leg Raise": ["Lying Leg Raise"],
};

export const alternativesOf = (name: string): string[] => ALTERNATIVES[name] ?? [];

/**
 * A program made for the athlete's equipment: each exercise they cannot do
 * is replaced by the first alternative they can, not already in the day and
 * not to be avoided for their injuries. One with no alternative leaves the
 * day when the day keeps two exercises, and stays otherwise (to be swapped
 * in the session). Nothing changes when the equipment is not known.
 */
export function adaptToEquipment(structure: ProgramDay[], has: Equipment[], injured: PainArea[] = []): { structure: ProgramDay[]; swapped: number } {
  if (!has.length) return { structure, swapped: 0 };
  let swapped = 0;
  const safe = (name: string) => !injured.some((a) => INJURY_RULES[name]?.[a] === "avoid");
  const days = structure.map((day) => {
    if (!day.exercises?.length) return day;
    const names = day.exercises.map((e) => e.exerciseName);
    const exercises = day.exercises.flatMap((e, i) => {
      if (canDo(e.exerciseName, has)) return [e];
      const alt = alternativesOf(e.exerciseName).find((a) => canDo(a, has) && safe(a) && !names.includes(a));
      swapped++;
      if (alt) {
        names[i] = alt;
        return [{ ...e, exerciseName: alt }];
      }
      return [null];
    });
    const kept = exercises.filter((e): e is NonNullable<typeof e> => !!e);
    if (kept.length >= 2) return { ...day, exercises: kept };
    return { ...day, exercises: exercises.map((e, i) => e ?? day.exercises[i]) };
  });
  return { structure: days, swapped };
}
