import type { ProgramDay } from "@/db";
import { PLAN_LOCALES, type PlanLocale } from "./enduranceText";
import type { ProgramTemplate } from "./programTemplates";

/**
 * Two programs with suspension straps (TRX) only: a beginner full body in
 * three sessions, an intermediate upper/lower split in four. Written in
 * French; the other languages change the name, description and days.
 */

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec = 60) => ({ exerciseName, targetSets, targetReps, restSec });
const circuit = (day: ProgramDay): ProgramDay => ({
  ...day,
  exercises: day.exercises.map((e, i, all) => (i < all.length - 1 ? { ...e, supersetWithNext: true } : e)),
});

interface Original {
  id: string;
  level: ProgramTemplate["level"];
  goal: ProgramTemplate["goal"];
  structure: ProgramDay[];
  text: Record<PlanLocale, { name: string; description: string; days: string[] }>;
}

const ORIGINALS: Original[] = [
  {
    id: "trx-debutant",
    level: "beginner",
    goal: "general",
    structure: [
      { name: "", exercises: [ex("TRX Row", 3, "10-12"), ex("TRX Chest Press", 3, "8-12"), ex("TRX Squat", 3, "12-15"), ex("TRX Hamstring Curl", 3, "10-12"), ex("TRX Plank", 3, "20-30s", 45)] },
      { name: "", exercises: [ex("TRX Row", 3, "10-12"), ex("TRX Biceps Curl", 3, "10-12", 45), ex("TRX Triceps Extension", 3, "10-12", 45), ex("TRX Suspended Lunge", 3, "8-10"), ex("TRX Knee Tuck", 3, "8-10", 45)] },
      { name: "", exercises: [ex("TRX Y-Fly", 3, "10-12", 45), ex("TRX Chest Press", 3, "8-12"), ex("TRX Squat", 3, "12-15"), ex("TRX Hamstring Curl", 3, "10-12"), ex("TRX Side Plank", 3, "20s", 45)] },
    ],
    text: {
      fr: { name: "TRX débutant", description: "Trois séances complètes avec seulement des sangles de suspension, à accrocher à une porte ou une barre. Plus on se penche, plus c'est dur : réglez l'inclinaison à chaque série.", days: ["Corps complet A", "Corps complet B", "Corps complet C"] },
      en: { name: "TRX for beginners", description: "Three full-body sessions with nothing but suspension straps, hung from a door or a bar. The more you lean, the harder it gets: set the angle for each set.", days: ["Full body A", "Full body B", "Full body C"] },
      de: { name: "TRX für Einsteiger", description: "Drei Ganzkörpereinheiten nur mit dem Schlingentrainer, an einer Tür oder Stange befestigt. Je schräger du stehst, desto schwerer wird es: Stelle den Winkel für jeden Satz ein.", days: ["Ganzkörper A", "Ganzkörper B", "Ganzkörper C"] },
    },
  },
  {
    id: "trx-intermediaire",
    level: "intermediate",
    goal: "hypertrophy",
    structure: [
      { name: "", exercises: [ex("TRX Row", 4, "10-12"), ex("TRX Chest Press", 4, "10-12"), ex("TRX Y-Fly", 3, "12", 45), ex("TRX Biceps Curl", 3, "12", 45), ex("TRX Triceps Extension", 3, "12", 45)] },
      { name: "", exercises: [ex("TRX Single-Leg Squat", 4, "8", 75), ex("TRX Suspended Lunge", 3, "10"), ex("TRX Hamstring Curl", 4, "12"), ex("TRX Jump Squat", 3, "10"), ex("TRX Pike", 3, "8-10", 45)] },
      { name: "", exercises: [ex("TRX Atomic Push-up", 4, "8-10"), ex("TRX Row", 4, "12-15"), ex("TRX Y-Fly", 3, "12", 45), ex("TRX Biceps Curl", 3, "12", 45), ex("TRX Side Plank", 3, "30s", 45)] },
      circuit({ name: "", exercises: [ex("TRX Squat", 3, "15", 30), ex("TRX Sprinter Start", 3, "20", 30), ex("TRX Hamstring Curl", 3, "12", 30), ex("TRX Mountain Climber", 3, "30s", 30), ex("TRX Knee Tuck", 3, "12", 60)] }),
    ],
    text: {
      fr: { name: "TRX intermédiaire", description: "Quatre séances haut et bas du corps aux sangles de suspension, dont un circuit cardio. Pour qui maîtrise déjà le tirage et le développé TRX.", days: ["Haut du corps", "Bas du corps", "Haut du corps et gainage", "Circuit jambes et cardio"] },
      en: { name: "Intermediate TRX", description: "Four upper- and lower-body sessions with suspension straps, including a cardio circuit. For those who already master the TRX row and chest press.", days: ["Upper body", "Lower body", "Upper body and core", "Legs and cardio circuit"] },
      de: { name: "TRX für Fortgeschrittene", description: "Vier Einheiten für Ober- und Unterkörper am Schlingentrainer, darunter ein Cardio-Zirkel. Für alle, die TRX-Rudern und -Brustpresse schon beherrschen.", days: ["Oberkörper", "Unterkörper", "Oberkörper und Rumpf", "Zirkel Beine und Cardio"] },
    },
  },
];

/** The TRX programs in every language; the French one keeps the plain id. */
export const TRX_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.flatMap((locale) =>
  ORIGINALS.map((o): ProgramTemplate => {
    const text = o.text[locale];
    return {
      id: locale === "fr" ? o.id : `${o.id}-${locale}`,
      locale,
      name: text.name,
      description: text.description,
      goal: o.goal,
      level: o.level,
      daysPerWeek: o.structure.length,
      homeFriendly: true,
      structure: o.structure.map((day, i) => ({ ...day, name: text.days[i] })),
    };
  })
);
