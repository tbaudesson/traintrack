import type { ProgramDay } from "@/db";
import { ENDURANCE_TEMPLATES } from "./enduranceTemplates";
import { VAULTING_TEMPLATES } from "./vaultingTemplates";
import { SPINNING_TEMPLATES } from "./spinningTemplates";
import { CALLISTHENICS_TEMPLATES } from "./callisthenicsTemplates";
import { PLAN_LOCALES, type PlanLocale } from "./enduranceText";
import { STRENGTH_ORIGINAL, STRENGTH_TEXT } from "./strengthText";
import { PERCENT_TEMPLATES } from "./percentTemplates";

/**
 * Ready-made program templates so a user can SELECT a proven program instead of
 * building one from scratch (or paying for AI). Exercise names match the seeded
 * library (006_seed_exercises) so the logger can resolve them.
 */

export type ProgramGoal = "strength" | "hypertrophy" | "fat_loss" | "general" | "endurance";
export type ProgramLevel = "beginner" | "intermediate" | "advanced";

export interface ProgramTemplate {
  id: string;
  /** Offered only to users of this language; none means everyone. */
  locale?: PlanLocale;
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

/** A circuit: every exercise leads straight into the next, the rest comes after the last. */
const circuit = (day: ProgramDay): ProgramDay => ({
  ...day,
  exercises: day.exercises.map((e, i, all) => (i < all.length - 1 ? { ...e, supersetWithNext: true } : e)),
});

/** The strength programs as first written, each in its own language. */
const STRENGTH_ORIGINALS: ProgramTemplate[] = [
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
      circuit({ name: "Circuit A", exercises: [ex("Back Squat", 3, "12-15", 45), ex("Push-up", 3, "AMRAP", 45), ex("Seated Cable Row", 3, "12-15", 45), ex("Walking Lunge", 3, "20", 45), ex("Plank", 3, "45s", 45)] }),
      circuit({ name: "Circuit B", exercises: [ex("Romanian Deadlift", 3, "12-15", 45), ex("Overhead Press", 3, "12-15", 45), ex("Lat Pulldown", 3, "12-15", 45), ex("Hip Thrust", 3, "15-20", 45), ex("Russian Twist", 3, "20", 45)] }),
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
  {
    id: "fullbody-2-fr",
    name: "Essentiel 2 jours",
    description: "Deux séances complètes par semaine, pour progresser avec un emploi du temps chargé.",
    goal: "general",
    level: "beginner",
    daysPerWeek: 2,
    structure: [
      { name: "Séance A", exercises: [ex("Back Squat", 3, "8-10", 120), ex("Barbell Bench Press", 3, "8-10", 120), ex("Lat Pulldown", 3, "10-12"), ex("Plank", 3, "30-45s", 60)] },
      { name: "Séance B", exercises: [ex("Romanian Deadlift", 3, "8-10", 120), ex("Overhead Press", 3, "8-10", 120), ex("Seated Cable Row", 3, "10-12"), ex("Hanging Leg Raise", 3, "10-12", 60)] },
    ],
  },
  {
    id: "remise-en-forme-3",
    name: "Remise en forme",
    description: "Une reprise en douceur, sur machines et haltères, pour retrouver de bonnes habitudes.",
    goal: "general",
    level: "beginner",
    daysPerWeek: 3,
    structure: [
      { name: "Jour 1", exercises: [ex("Leg Press", 3, "12-15"), ex("Dumbbell Bench Press", 3, "12-15"), ex("Lat Pulldown", 3, "12-15"), ex("Plank", 3, "20-30s", 60)] },
      { name: "Jour 2", exercises: [ex("Walking Lunge", 3, "10-12"), ex("Seated Dumbbell Press", 3, "12-15"), ex("Seated Cable Row", 3, "12-15"), ex("Russian Twist", 3, "15-20", 60)] },
      { name: "Jour 3", exercises: [ex("Leg Curl", 3, "12-15"), ex("Push-up", 3, "8-12"), ex("Dumbbell Row", 3, "12-15"), ex("Dumbbell Curl", 3, "12-15", 60)] },
    ],
  },
  {
    id: "force-3x5-3",
    name: "Force 3×5",
    description: "Peu de répétitions, des charges lourdes et de longs repos sur les grands mouvements.",
    goal: "strength",
    level: "intermediate",
    daysPerWeek: 3,
    structure: [
      { name: "Lourd A", exercises: [ex("Back Squat", 3, "5", 180), ex("Barbell Bench Press", 3, "5", 180), ex("Barbell Row", 3, "5", 150)] },
      { name: "Lourd B", exercises: [ex("Deadlift", 3, "5", 210), ex("Overhead Press", 3, "5", 180), ex("Pull-up", 3, "5-8", 150)] },
      { name: "Lourd C", exercises: [ex("Front Squat", 3, "5", 180), ex("Incline Barbell Bench Press", 3, "5", 180), ex("T-Bar Row", 3, "5", 150)] },
    ],
  },
  {
    id: "masse-5",
    name: "Prise de masse 5 jours",
    description: "Un groupe musculaire par séance et beaucoup de volume, pour les pratiquants réguliers.",
    goal: "hypertrophy",
    level: "advanced",
    daysPerWeek: 5,
    structure: [
      { name: "Pectoraux", exercises: [ex("Barbell Bench Press", 4, "6-8", 150), ex("Incline Dumbbell Press", 4, "8-10", 120), ex("Chest Dip", 3, "8-12"), ex("Cable Fly", 3, "12-15", 60)] },
      { name: "Dos", exercises: [ex("Deadlift", 3, "5-6", 180), ex("Pull-up", 4, "6-10", 120), ex("Barbell Row", 4, "8-10", 120), ex("Seated Cable Row", 3, "10-12")] },
      { name: "Jambes", exercises: [ex("Back Squat", 4, "6-8", 180), ex("Leg Press", 4, "10-12", 120), ex("Leg Curl", 4, "10-12"), ex("Standing Calf Raise", 4, "12-15", 60)] },
      { name: "Épaules", exercises: [ex("Overhead Press", 4, "6-8", 150), ex("Lateral Raise", 4, "12-15", 60), ex("Rear Delt Fly", 4, "12-15", 60), ex("Face Pull", 3, "15-20", 60)] },
      { name: "Bras", exercises: [ex("Barbell Curl", 4, "8-10"), ex("Skull Crusher", 4, "8-10"), ex("Hammer Curl", 3, "10-12", 60), ex("Triceps Pushdown", 3, "10-12", 60)] },
    ],
  },
  {
    id: "fessiers-jambes-3",
    name: "Fessiers et jambes",
    description: "Trois séances centrées sur le bas du corps, avec un travail complet des fessiers.",
    goal: "hypertrophy",
    level: "intermediate",
    daysPerWeek: 3,
    structure: [
      { name: "Fessiers", exercises: [ex("Hip Thrust", 4, "8-10", 120), ex("Bulgarian Split Squat", 3, "10-12"), ex("Romanian Deadlift", 3, "10-12"), ex("Plank", 3, "30-45s", 60)] },
      { name: "Quadriceps", exercises: [ex("Back Squat", 4, "8-10", 150), ex("Leg Press", 3, "10-12", 120), ex("Leg Extension", 3, "12-15", 60), ex("Standing Calf Raise", 3, "12-15", 60)] },
      { name: "Ischios", exercises: [ex("Deadlift", 3, "6-8", 180), ex("Leg Curl", 4, "10-12"), ex("Walking Lunge", 3, "12-14"), ex("Hanging Leg Raise", 3, "10-12", 60)] },
    ],
  },
  {
    id: "halteres-4",
    name: "Haltères 4 jours",
    description: "Haut et bas du corps en alternance, uniquement avec des haltères.",
    goal: "hypertrophy",
    level: "intermediate",
    daysPerWeek: 4,
    homeFriendly: true,
    structure: [
      { name: "Haut A", exercises: [ex("Dumbbell Bench Press", 4, "8-10", 120), ex("Dumbbell Row", 4, "8-10", 120), ex("Lateral Raise", 3, "12-15", 60), ex("Dumbbell Curl", 3, "10-12", 60)] },
      { name: "Bas A", exercises: [ex("Bulgarian Split Squat", 4, "8-10", 120), ex("Romanian Deadlift", 4, "10-12", 120), ex("Standing Calf Raise", 3, "15-20", 60), ex("Plank", 3, "30-45s", 60)] },
      { name: "Haut B", exercises: [ex("Incline Dumbbell Press", 4, "8-10", 120), ex("Seated Dumbbell Press", 3, "8-10", 120), ex("Rear Delt Fly", 3, "12-15", 60), ex("Hammer Curl", 3, "10-12", 60)] },
      { name: "Bas B", exercises: [ex("Walking Lunge", 4, "10-12", 120), ex("Hip Thrust", 4, "10-12", 120), ex("Russian Twist", 3, "15-20", 60)] },
    ],
  },
  {
    id: "poids-du-corps-3",
    name: "Poids du corps",
    description: "Aucun matériel sauf une barre de traction : à faire partout, tout le temps.",
    goal: "general",
    level: "beginner",
    daysPerWeek: 3,
    homeFriendly: true,
    structure: [
      { name: "Poussée", exercises: [ex("Push-up", 4, "10-15"), ex("Chest Dip", 3, "6-10"), ex("Plank", 3, "30-45s", 60)] },
      { name: "Tirage", exercises: [ex("Pull-up", 4, "5-8", 120), ex("Chin-up", 3, "5-8", 120), ex("Hanging Leg Raise", 3, "8-12", 60)] },
      { name: "Jambes", exercises: [ex("Walking Lunge", 4, "12-16"), ex("Bulgarian Split Squat", 3, "10-12"), ex("Russian Twist", 3, "15-20", 60)] },
    ],
  },
  {
    id: "seche-4",
    name: "Sèche 4 jours",
    description: "Des séances denses avec peu de repos, pour perdre du gras en gardant du muscle.",
    goal: "fat_loss",
    level: "intermediate",
    daysPerWeek: 4,
    structure: [
      { name: "Haut dense", exercises: [ex("Barbell Bench Press", 4, "10-12", 60), ex("Barbell Row", 4, "10-12", 60), ex("Seated Dumbbell Press", 3, "12-15", 45), ex("Triceps Pushdown", 3, "12-15", 45)] },
      { name: "Bas dense", exercises: [ex("Back Squat", 4, "10-12", 75), ex("Romanian Deadlift", 3, "12-15", 60), ex("Walking Lunge", 3, "12-16", 45), ex("Cable Crunch", 3, "15-20", 45)] },
      circuit({ name: "Circuit haut", exercises: [ex("Push-up", 4, "12-20", 30), ex("Lat Pulldown", 4, "12-15", 45), ex("Lateral Raise", 3, "15-20", 30), ex("Face Pull", 3, "15-20", 30)] }),
      circuit({ name: "Circuit bas", exercises: [ex("Leg Press", 4, "15-20", 45), ex("Leg Curl", 3, "15-20", 45), ex("Hip Thrust", 3, "12-15", 45), ex("Plank", 3, "45-60s", 30)] }),
    ],
  },
];

/**
 * Every strength program in every language. The original keeps its id; a
 * translation takes the same exercises with its name, description and days.
 */
export const STRENGTH_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.flatMap((locale) =>
  STRENGTH_ORIGINALS.map((tpl): ProgramTemplate => {
    if (STRENGTH_ORIGINAL[tpl.id] === locale) return { ...tpl, locale };
    const text = STRENGTH_TEXT[tpl.id][locale]!;
    return {
      ...tpl,
      id: `${tpl.id}-${locale}`,
      locale,
      name: text.name,
      description: text.description,
      structure: tpl.structure.map((day, i) => ({ ...day, name: text.days[i] })),
    };
  })
);

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [...STRENGTH_TEMPLATES, ...PERCENT_TEMPLATES, ...ENDURANCE_TEMPLATES, ...VAULTING_TEMPLATES, ...SPINNING_TEMPLATES, ...CALLISTHENICS_TEMPLATES];

/** Rank templates by closeness to the user's goal / level / days-per-week. */
export function rankTemplates(pref: {
  goal?: ProgramGoal;
  level?: ProgramLevel;
  daysPerWeek?: number;
}, templates: ProgramTemplate[] = PROGRAM_TEMPLATES): ProgramTemplate[] {
  return [...templates]
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
