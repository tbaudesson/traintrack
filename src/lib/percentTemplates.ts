import type { ProgramDay, ProgramExercise } from "@/db";
import type { ProgramTemplate } from "./programTemplates";
import { PLAN_LOCALES, type PlanLocale } from "./enduranceText";

const TEXT: Record<PlanLocale, { name: string; description: string; week: string; days: [string, string, string]; deload: string }> = {
  fr: {
    name: "Vagues de force (% du 1RM)",
    description:
      "Quatre semaines sur les trois grands mouvements, avec des charges en pourcentage de votre 1RM estimé : on monte de 70-80 % à 80-90 %, puis une semaine de décharge à 60 %. Recommencez ensuite avec un 1RM plus haut.",
    week: "S",
    days: ["Squat", "Développé couché", "Soulevé de terre"],
    deload: "décharge",
  },
  en: {
    name: "Strength Waves (% of 1RM)",
    description:
      "Four weeks on the three big lifts, with loads as a percentage of your estimated 1RM: from 70-80% up to 80-90%, then a deload week at 60%. Then start again with a higher 1RM.",
    week: "W",
    days: ["Squat", "Bench press", "Deadlift"],
    deload: "deload",
  },
  de: {
    name: "Kraftwellen (% vom 1RM)",
    description:
      "Vier Wochen mit den drei Grundübungen, Lasten in Prozent Ihres geschätzten 1RM: von 70-80 % bis 80-90 %, dann eine Entlastungswoche bei 60 %. Danach mit höherem 1RM neu beginnen.",
    week: "W",
    days: ["Kniebeuge", "Bankdrücken", "Kreuzheben"],
    deload: "Entlastung",
  },
};

/** The wave: sets × reps and the load of each set, week by week. */
const WAVES: { reps: string; percents: number[] }[] = [
  { reps: "5", percents: [70, 75, 80] },
  { reps: "4", percents: [75, 80, 85] },
  { reps: "3", percents: [80, 85, 90] },
  { reps: "5", percents: [60] },
];

const main = (name: string, wave: (typeof WAVES)[number], restSec = 180): ProgramExercise => ({
  exerciseName: name,
  targetSets: 3,
  targetReps: wave.reps,
  restSec,
  percents: wave.percents,
});
const assist = (name: string, sets: number, reps: string, restSec = 90): ProgramExercise => ({
  exerciseName: name,
  targetSets: sets,
  targetReps: reps,
  restSec,
});

/** "Strength Waves" in one language. French keeps the plain id. */
function strengthWaves(locale: PlanLocale): ProgramTemplate {
  const x = TEXT[locale];
  const structure: ProgramDay[] = WAVES.flatMap((wave, w) => {
    const week = w + 1;
    const label = (day: string) => `${x.week}${week} · ${day}${w === 3 ? ` (${x.deload})` : ""}`;
    return [
      { name: label(x.days[0]), week, exercises: [main("Back Squat", wave), assist("Romanian Deadlift", 3, "8-10"), assist("Plank", 3, "30-45s", 60)] },
      { name: label(x.days[1]), week, exercises: [main("Barbell Bench Press", wave), assist("Barbell Row", 3, "8-10"), assist("Face Pull", 3, "15-20", 60)] },
      { name: label(x.days[2]), week, exercises: [main("Deadlift", wave, 210), main("Overhead Press", wave), assist("Pull-up", 3, "5-8", 120)] },
    ];
  });
  return {
    id: locale === "fr" ? "vagues-force-4" : `vagues-force-4-${locale}`,
    locale,
    name: x.name,
    description: x.description,
    goal: "strength",
    level: "intermediate",
    daysPerWeek: 3,
    structure,
  };
}

export const PERCENT_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.map(strengthWaves);
