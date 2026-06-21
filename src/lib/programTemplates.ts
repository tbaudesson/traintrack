import type { ProgramDay } from "@/db";

/**
 * Ready-made program templates so a user can SELECT a proven program instead of
 * building one from scratch (or paying for AI). Exercise names match the seeded
 * library (006_seed_exercises) so the logger can resolve them.
 */

export type ProgramGoal = "strength" | "hypertrophy" | "fat_loss" | "general";
export type ProgramLevel = "beginner" | "intermediate" | "advanced";

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  goal: ProgramGoal;
  level: ProgramLevel;
  daysPerWeek: number;
  /** Mostly bodyweight/dumbbell — usable without a full gym. */
  homeFriendly?: boolean;
  structure: ProgramDay[];
}

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec = 90) => ({
  exerciseName,
  targetSets,
  targetReps,
  restSec,
});

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: "fullbody-beginner-3",
    name: "Full Body — Beginner",
    description: "Three full-body sessions a week. The simplest, most effective way to start.",
    goal: "general",
    level: "beginner",
    daysPerWeek: 3,
    structure: [
      { name: "Day A", exercises: [ex("Back Squat", 3, "8-10", 120), ex("Barbell Bench Press", 3, "8-10", 120), ex("Seated Cable Row", 3, "10-12"), ex("Plank", 3, "30-45s", 60)] },
      { name: "Day B", exercises: [ex("Romanian Deadlift", 3, "8-10", 120), ex("Overhead Press", 3, "8-10", 120), ex("Lat Pulldown", 3, "10-12"), ex("Hanging Leg Raise", 3, "10-15", 60)] },
      { name: "Day C", exercises: [ex("Leg Press", 3, "10-12"), ex("Incline Dumbbell Press", 3, "10-12"), ex("Dumbbell Row", 3, "10-12"), ex("Cable Crunch", 3, "12-15", 60)] },
    ],
  },
  {
    id: "strength-5x5-3",
    name: "Strength 5×5",
    description: "Classic linear-progression barbell strength program. Add weight every session.",
    goal: "strength",
    level: "beginner",
    daysPerWeek: 3,
    structure: [
      { name: "Workout A", exercises: [ex("Back Squat", 5, "5", 180), ex("Barbell Bench Press", 5, "5", 180), ex("Barbell Row", 5, "5", 180)] },
      { name: "Workout B", exercises: [ex("Back Squat", 5, "5", 180), ex("Overhead Press", 5, "5", 180), ex("Deadlift", 1, "5", 180)] },
    ],
  },
  {
    id: "upperlower-4",
    name: "Upper / Lower Split",
    description: "Four days a week split into upper- and lower-body sessions. Great balance of volume and recovery.",
    goal: "hypertrophy",
    level: "intermediate",
    daysPerWeek: 4,
    structure: [
      { name: "Upper A", exercises: [ex("Barbell Bench Press", 4, "6-8", 120), ex("Barbell Row", 4, "6-8", 120), ex("Overhead Press", 3, "8-10"), ex("Lat Pulldown", 3, "10-12"), ex("Barbell Curl", 3, "10-12", 60), ex("Triceps Pushdown", 3, "10-12", 60)] },
      { name: "Lower A", exercises: [ex("Back Squat", 4, "6-8", 150), ex("Romanian Deadlift", 3, "8-10", 120), ex("Leg Press", 3, "10-12"), ex("Leg Curl", 3, "12-15", 60), ex("Standing Calf Raise", 4, "12-15", 60)] },
      { name: "Upper B", exercises: [ex("Incline Dumbbell Press", 4, "8-10"), ex("Seated Cable Row", 4, "8-10"), ex("Lateral Raise", 4, "12-15", 60), ex("Pull-up", 3, "AMRAP"), ex("Hammer Curl", 3, "10-12", 60), ex("Overhead Triceps Extension", 3, "10-12", 60)] },
      { name: "Lower B", exercises: [ex("Front Squat", 4, "8-10", 150), ex("Hip Thrust", 3, "10-12"), ex("Bulgarian Split Squat", 3, "10-12"), ex("Leg Extension", 3, "12-15", 60), ex("Standing Calf Raise", 4, "12-15", 60)] },
    ],
  },
  {
    id: "ppl-6",
    name: "Push / Pull / Legs",
    description: "Six high-volume days for advanced lifters chasing maximum muscle growth.",
    goal: "hypertrophy",
    level: "advanced",
    daysPerWeek: 6,
    structure: [
      { name: "Push", exercises: [ex("Barbell Bench Press", 4, "6-8", 120), ex("Overhead Press", 4, "8-10"), ex("Incline Dumbbell Press", 3, "10-12"), ex("Lateral Raise", 4, "12-15", 60), ex("Triceps Pushdown", 3, "10-12", 60), ex("Overhead Triceps Extension", 3, "12-15", 60)] },
      { name: "Pull", exercises: [ex("Deadlift", 3, "5", 180), ex("Pull-up", 4, "8-10"), ex("Barbell Row", 4, "8-10", 120), ex("Face Pull", 3, "15-20", 60), ex("Barbell Curl", 3, "10-12", 60), ex("Hammer Curl", 3, "12-15", 60)] },
      { name: "Legs", exercises: [ex("Back Squat", 4, "6-8", 150), ex("Romanian Deadlift", 3, "8-10", 120), ex("Leg Press", 3, "12-15"), ex("Leg Curl", 3, "12-15", 60), ex("Leg Extension", 3, "15-20", 60), ex("Standing Calf Raise", 4, "15-20", 60)] },
    ],
  },
  {
    id: "fatloss-fullbody-3",
    name: "Lean & Strong",
    description: "Full-body circuits with short rest to keep the heart rate up while preserving muscle in a cut.",
    goal: "fat_loss",
    level: "intermediate",
    daysPerWeek: 3,
    structure: [
      { name: "Circuit A", exercises: [ex("Back Squat", 3, "12-15", 45), ex("Push-up", 3, "AMRAP", 45), ex("Seated Cable Row", 3, "12-15", 45), ex("Walking Lunge", 3, "20", 45), ex("Plank", 3, "45s", 45)] },
      { name: "Circuit B", exercises: [ex("Romanian Deadlift", 3, "12-15", 45), ex("Overhead Press", 3, "12-15", 45), ex("Lat Pulldown", 3, "12-15", 45), ex("Hip Thrust", 3, "15-20", 45), ex("Russian Twist", 3, "20", 45)] },
    ],
  },
  {
    id: "home-dumbbell-3",
    name: "Home Dumbbell",
    description: "A complete plan needing only a pair of dumbbells — perfect for training at home.",
    goal: "general",
    level: "beginner",
    daysPerWeek: 3,
    homeFriendly: true,
    structure: [
      { name: "Full Body A", exercises: [ex("Bulgarian Split Squat", 3, "10-12"), ex("Dumbbell Bench Press", 3, "10-12"), ex("Dumbbell Row", 3, "10-12"), ex("Lateral Raise", 3, "12-15", 60), ex("Plank", 3, "30-45s", 60)] },
      { name: "Full Body B", exercises: [ex("Romanian Deadlift", 3, "10-12"), ex("Incline Dumbbell Press", 3, "10-12"), ex("Hammer Curl", 3, "12-15", 60), ex("Walking Lunge", 3, "20"), ex("Hanging Leg Raise", 3, "10-15", 60)] },
    ],
  },
];

/** Rank templates by closeness to the user's goal / level / days-per-week. */
export function rankTemplates(pref: {
  goal?: ProgramGoal;
  level?: ProgramLevel;
  daysPerWeek?: number;
}): ProgramTemplate[] {
  return [...PROGRAM_TEMPLATES]
    .map((tpl) => {
      let score = 0;
      if (pref.goal && tpl.goal === pref.goal) score += 3;
      if (pref.level && tpl.level === pref.level) score += 2;
      if (pref.daysPerWeek) score -= Math.abs(tpl.daysPerWeek - pref.daysPerWeek) * 0.5;
      return { tpl, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.tpl);
}
