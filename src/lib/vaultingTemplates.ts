import type { ProgramDay, ProgramExercise } from "@/db";
import type { ProgramTemplate } from "./programTemplates";
import { PLAN_LOCALES, type PlanLocale } from "./enduranceText";
import { VAULTING_TEXT, type Figure, type Phase, type VaultingText } from "./vaultingText";

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec = 60): ProgramExercise => ({
  exerciseName,
  targetSets,
  targetReps,
  restSec,
});

/** The figures of each week of the beginner plan: two or three new ones, then all of them. */
const BEGINNER_FIGURES: Figure[][] = [
  ["mount", "seat", "flag"],
  ["seat", "flag", "mill"],
  ["mill", "scissorsFwd"],
  ["seat", "flag", "mill", "scissorsFwd"],
  ["scissorsBwd", "stand"],
  ["stand", "flank"],
  ["seat", "flag", "mill", "scissorsFwd", "scissorsBwd", "stand", "flank"],
  ["seat", "flag", "mill", "scissorsFwd", "scissorsBwd", "stand", "flank"],
];

const list = (x: VaultingText, figures: Figure[]) => figures.map((f) => x.figures[f]).join(", ");

/**
 * Eight weeks to start: the barrel to learn each figure safely, the horse at
 * walk then at canter, and a conditioning session that grows from two sets
 * to three. Week 4 is lighter; the last two link all the compulsories.
 */
function beginnerPlan(x: VaultingText): ProgramDay[] {
  const b = x.beginner;
  return BEGINNER_FIGURES.flatMap((figures, i) => {
    const week = i + 1;
    const names = list(x, figures.filter((f) => f !== "mount"));
    const canter = week >= 5;
    const sets = week >= 5 ? 3 : 2;
    const barrelSteps = [b.warmUp, b.technique(list(x, figures))];
    if (week >= 3) barrelSteps.push(b.chain(names));
    if (week === 8) barrelSteps.push(b.freestyle);
    barrelSteps.push(b.coolDown);
    const horseSteps = [b.groundWarmUp, b.onHorse(canter, names)];
    if (week >= 7) horseSteps.push(b.wholeTest);
    horseSteps.push(b.dismount);
    return [
      {
        name: `${x.week}${week} · ${x.days.barrel}`,
        week,
        exercises: [],
        cardio: { sport: "vaulting", durationMin: week === 4 ? 35 : 45, intensity: x.technique, purpose: b.barrelPurpose(week), steps: barrelSteps, notes: x.barrelNote },
      },
      {
        name: `${x.week}${week} · ${x.days.horse}`,
        week,
        exercises: [],
        cardio: { sport: "vaulting", durationMin: 30, intensity: canter ? x.canter : x.walk, purpose: b.horsePurpose, steps: horseSteps, notes: x.safety },
      },
      {
        name: `${x.week}${week} · ${x.days.fitness}`,
        week,
        exercises: [
          ex("Plank", sets, week >= 5 ? "30-45s" : "20-30s", 45),
          ex("Hollow Hold", sets, week >= 5 ? "20-30s" : "15-20s", 45),
          ex("Superman Hold", sets, week >= 5 ? "30s" : "20s", 45),
          ex("Single-Leg Balance", sets, "30s", 30),
          ex("Glute Bridge", sets, "12-15"),
          ex("Push-up", sets, week >= 5 ? "8-12" : "5-8"),
          ex("Front Split Stretch", 2, week >= 5 ? "45s" : "30s", 30),
        ],
      },
    ];
  });
}

/** The phase of a week of the competition plan; weeks 4 and 8 are lighter. */
export function vaultingPhase(week: number): Phase {
  if (week <= 4) return "foundation";
  if (week <= 8) return "development";
  if (week <= 11) return "competition";
  return "taper";
}

const SETS: Record<Phase, number> = { foundation: 3, development: 4, competition: 3, taper: 2 };

/**
 * Twelve weeks to a competition: the compulsories on the horse, the freestyle
 * built on the barrel, then strength and flexibility. Foundation, development,
 * competition runs, and a lighter last week.
 */
function intermediatePlan(x: VaultingText): ProgramDay[] {
  const m = x.intermediate;
  return Array.from({ length: 12 }, (_, i) => i + 1).flatMap((week) => {
    const phase = vaultingPhase(week);
    const light = week === 4 || week === 8 || phase === "taper";
    const sets = light ? Math.max(2, SETS[phase] - 1) : SETS[phase];
    return [
      {
        name: `${x.week}${week} · ${x.days.compulsories}`,
        week,
        exercises: [],
        cardio: {
          sport: "vaulting",
          durationMin: light ? 30 : 40,
          intensity: x.canter,
          purpose: m.horsePurpose[phase],
          steps: [m.groundWarmUp, m.horseMain[phase], m.dismount],
          notes: x.safety,
        },
      },
      {
        name: `${x.week}${week} · ${x.days.freestyle}`,
        week,
        exercises: [],
        cardio: {
          sport: "vaulting",
          durationMin: light ? 35 : 50,
          intensity: x.technique,
          purpose: m.barrelPurpose[phase],
          steps: [m.barrelWarmUp, m.barrelMain[phase], m.weakest, m.coolDown],
          notes: x.barrelNote,
        },
      },
      {
        name: `${x.week}${week} · ${x.days.strength}`,
        week,
        exercises: [
          ex("Handstand Hold", sets, phase === "foundation" ? "15-20s" : "20-30s", 60),
          ex("Pull-up", sets, phase === "development" ? "6-8" : "4-6", 90),
          ex("Push-up", sets, "10-15"),
          ex("Hanging Leg Raise", sets, "8-12"),
          ex("Hollow Hold", sets, "30s", 45),
          ex("Side Plank", sets, "30-45s", 45),
          ex("Tuck Jump", sets, "6-8", 60),
          ex("Bulgarian Split Squat", sets, "8-10", 90),
        ],
      },
      {
        name: `${x.week}${week} · ${x.days.flexibility}`,
        week,
        exercises: [
          ex("Front Split Stretch", 3, "45-60s", 30),
          ex("Pike Stretch", 3, "45-60s", 30),
          ex("Bridge Hold", 3, "15-20s", 45),
          ex("Arabesque Hold", 3, "20-30s", 30),
          ex("Single-Leg Balance", 3, "30-45s", 30),
          ex("Superman Hold", 3, "30s", 45),
          ex("Bird Dog", 3, "10-12", 45),
        ],
      },
    ];
  });
}

/** Two sessions without a horse, every week: for vaulters training at a club. */
function fitnessPlan(x: VaultingText): ProgramDay[] {
  return [
    {
      name: x.days.strength,
      exercises: [
        ex("Handstand Hold", 3, "15-30s", 60),
        ex("Push-up", 3, "8-12"),
        ex("Hollow Hold", 3, "20-30s", 45),
        ex("Side Plank", 3, "30s", 45),
        ex("Tuck Jump", 3, "6-8"),
        ex("Bulgarian Split Squat", 3, "8-10", 90),
        ex("Superman Hold", 3, "30s", 45),
      ],
    },
    {
      name: x.days.flexibility,
      exercises: [
        ex("Front Split Stretch", 3, "45s", 30),
        ex("Pike Stretch", 3, "45s", 30),
        ex("Bridge Hold", 3, "15-20s", 45),
        ex("Arabesque Hold", 3, "20-30s", 30),
        ex("Single-Leg Balance", 3, "30s", 30),
        ex("Bird Dog", 3, "10-12", 45),
      ],
    },
  ];
}

/** The vaulting plans in one language. French keeps the ids without suffix. */
export function vaultingTemplates(locale: PlanLocale): ProgramTemplate[] {
  const x = VAULTING_TEXT[locale];
  const id = (base: string) => (locale === "fr" ? base : `${base}-${locale}`);
  return [
    {
      id: id("voltige-debuter-8"), locale, name: x.beginner.name, description: x.beginner.description,
      goal: "endurance", level: "beginner", daysPerWeek: 3,
      structure: beginnerPlan(x),
    },
    {
      id: id("voltige-competition-12"), locale, name: x.intermediate.name, description: x.intermediate.description,
      goal: "endurance", level: "intermediate", daysPerWeek: 4,
      structure: intermediatePlan(x),
    },
    {
      id: id("voltige-prepa"), locale, name: x.fitness.name, description: x.fitness.description,
      goal: "endurance", level: "beginner", daysPerWeek: 2, homeFriendly: true,
      structure: fitnessPlan(x),
    },
  ];
}

/** The vaulting plans in every language; each user is offered their own. */
export const VAULTING_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.flatMap(vaultingTemplates);
