import type { ProgramDay, ProgramExercise } from "@/db";
import type { ProgramTemplate } from "./programTemplates";
import { PLAN_LOCALES, type PlanLocale } from "./enduranceText";

/**
 * Bodyweight (callisthenics) programs, filed on their own shelf: a beginner
 * and an intermediate plan in eight weeks, and an advanced rotation. Only
 * library exercises, so each keeps its demo and its injury warnings. Weeks 4
 * and 8 are lighter. The French plan is the original; the others take its
 * exercises with their own names and texts.
 */

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec = 75): ProgramExercise => ({
  exerciseName,
  targetSets,
  targetReps,
  restSec,
});

/** The value of a week, from one per week. */
const at = <T,>(values: T[], week: number) => values[week - 1];

interface Text {
  name: string;
  description: string;
  days: string[];
}

const TEXT: Record<"debutant" | "intermediaire" | "avance", Record<PlanLocale, Text>> = {
  debutant: {
    fr: {
      name: "Callisthenics : débuter en 8 semaines",
      description:
        "Trois séances au poids du corps par semaine, sans matériel sauf une barre de traction. Pompes, squats, tractions et gainage montent en répétitions semaine après semaine ; semaines 4 et 8 plus légères. Pas encore de traction ? Faites des négatives : sautez en haut, descendez en 5 secondes.",
      days: ["Poussée et jambes", "Tirage et gainage", "Corps entier"],
    },
    en: {
      name: "Callisthenics: get started in 8 weeks",
      description:
        "Three bodyweight sessions a week, with no equipment but a pull-up bar. Push-ups, squats, pull-ups and core work go up in reps week after week; weeks 4 and 8 are lighter. No pull-up yet? Do negatives: jump to the top, lower yourself in 5 seconds.",
      days: ["Push and legs", "Pull and core", "Full body"],
    },
    de: {
      name: "Calisthenics: Einstieg in 8 Wochen",
      description:
        "Drei Einheiten mit dem eigenen Körpergewicht pro Woche, ohne Geräte außer einer Klimmzugstange. Liegestütze, Kniebeugen, Klimmzüge und Rumpfübungen steigern sich Woche für Woche; Wochen 4 und 8 sind leichter. Noch kein Klimmzug? Mach Negative: hochspringen, in 5 Sekunden absenken.",
      days: ["Drücken und Beine", "Ziehen und Rumpf", "Ganzkörper"],
    },
  },
  intermediaire: {
    fr: {
      name: "Callisthenics intermédiaire en 8 semaines",
      description:
        "Quatre séances par semaine pour qui enchaîne déjà 5 tractions et 20 pompes : dips, équilibre sur les mains, squats bulgares et sauts. Le volume monte jusqu’à la semaine 7 ; semaines 4 et 8 plus légères.",
      days: ["Haut du corps A", "Bas du corps A", "Haut du corps B", "Bas du corps et cardio"],
    },
    en: {
      name: "Intermediate callisthenics in 8 weeks",
      description:
        "Four sessions a week for those who already do 5 pull-ups and 20 push-ups in a row: dips, handstands, Bulgarian split squats and jumps. The volume rises until week 7; weeks 4 and 8 are lighter.",
      days: ["Upper body A", "Lower body A", "Upper body B", "Lower body and cardio"],
    },
    de: {
      name: "Calisthenics für Fortgeschrittene in 8 Wochen",
      description:
        "Vier Einheiten pro Woche für alle, die schon 5 Klimmzüge und 20 Liegestütze am Stück schaffen: Dips, Handstand, bulgarische Kniebeugen und Sprünge. Der Umfang steigt bis Woche 7; Wochen 4 und 8 sind leichter.",
      days: ["Oberkörper A", "Unterkörper A", "Oberkörper B", "Unterkörper und Kondition"],
    },
  },
  avance: {
    fr: {
      name: "Callisthenics avancé",
      description:
        "Quatre séances en rotation, à gros volume : tirage, poussée, jambes et une séance de conditionnement. Pour qui fait 10 tractions et 15 dips. Quand toutes les séries sont réussies, ralentissez la descente ou ajoutez un lest.",
      days: ["Tirage", "Poussée", "Jambes", "Conditionnement"],
    },
    en: {
      name: "Advanced callisthenics",
      description:
        "Four high-volume sessions in rotation: pull, push, legs and a conditioning session. For those who do 10 pull-ups and 15 dips. Once every set is done, slow down the lowering or add a weight.",
      days: ["Pull", "Push", "Legs", "Conditioning"],
    },
    de: {
      name: "Calisthenics für Profis",
      description:
        "Vier umfangreiche Einheiten im Wechsel: Ziehen, Drücken, Beine und eine Konditionseinheit. Für alle, die 10 Klimmzüge und 15 Dips schaffen. Sind alle Sätze geschafft, das Absenken verlangsamen oder Gewicht hinzufügen.",
      days: ["Ziehen", "Drücken", "Beine", "Kondition"],
    },
  },
};

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];

/** Eight weeks, three sessions: reps and holds up each week, weeks 4 and 8 lighter. */
function beginnerPlan(days: string[]): ProgramDay[] {
  const sets = [3, 3, 3, 2, 3, 3, 4, 3];
  const push = ["5-8", "6-10", "8-12", "6-8", "8-12", "10-12", "10-15", "8-10"];
  const squat = ["12", "15", "15-20", "12", "20", "20", "20-25", "15"];
  const lunge = ["8", "8-10", "10", "8", "10-12", "12", "12", "10"];
  const pull = ["1-3", "2-4", "3-5", "2-3", "3-6", "4-6", "5-8", "3-5"];
  const hold = ["20s", "25s", "30s", "20s", "35s", "40s", "45s", "30s"];
  return WEEKS.flatMap((week) => {
    const s = at(sets, week);
    return [
      {
        name: days[0],
        week,
        exercises: [
          ex("Push-up", s, at(push, week)),
          ex("Bodyweight Squat", s, at(squat, week)),
          ex("Reverse Lunge", s, at(lunge, week)),
          ex("Glute Bridge", s, "15", 60),
          ex("Plank", s, at(hold, week), 60),
        ],
      },
      {
        name: days[1],
        week,
        exercises: [
          ex("Chin-up", s, at(pull, week), 120),
          ex("Superman Hold", s, at(hold, week), 60),
          ex("Dead Bug", s, "10", 60),
          ex("Side Plank", s, at(hold, week), 60),
          ex("Hollow Hold", s, at(hold, week), 60),
        ],
      },
      {
        name: days[2],
        week,
        exercises: [
          ex(week >= 3 ? "Jump Squat" : "Bodyweight Squat", s, week >= 3 ? "10" : at(squat, week)),
          ex("Push-up", s, at(push, week)),
          ex("Pull-up", s, at(pull, week), 120),
          ex("Mountain Climber", s, "20", 45),
          ex("Plank Shoulder Tap", s, "16", 45),
        ],
      },
    ];
  });
}

/** Eight weeks, four sessions: three then four sets, more reps, weeks 4 and 8 lighter. */
function intermediatePlan(days: string[]): ProgramDay[] {
  const sets = [3, 3, 4, 3, 4, 4, 5, 3];
  const pull = ["5-6", "6-7", "6-8", "5", "7-8", "8-10", "8-10", "6"];
  const dip = ["8", "8-10", "10", "8", "10-12", "12", "12-15", "10"];
  const handstand = ["20s", "25s", "30s", "20s", "30s", "35s", "40s", "30s"];
  const split = ["8", "10", "10", "8", "12", "12", "12-15", "10"];
  const jumps = ["10", "12", "12", "10", "14", "16", "16", "12"];
  return WEEKS.flatMap((week) => {
    const s = at(sets, week);
    return [
      {
        name: days[0],
        week,
        exercises: [
          ex("Pull-up", s, at(pull, week), 120),
          ex("Chest Dip", s, at(dip, week), 120),
          ex("Push-up", s, "15-20"),
          ex("Hollow Hold", s, "30-40s", 60),
        ],
      },
      {
        name: days[1],
        week,
        exercises: [
          ex("Bulgarian Split Squat", s, at(split, week)),
          ex("Jump Squat", s, at(jumps, week)),
          ex("Single-Leg Calf Raise", s, "15", 45),
          ex("Hanging Leg Raise", s, "8-12", 75),
        ],
      },
      {
        name: days[2],
        week,
        exercises: [
          ex("Chin-up", s, at(pull, week), 120),
          ex("Handstand Hold", s, at(handstand, week), 90),
          ex("Chest Dip", s, at(dip, week), 120),
          ex("Plank Shoulder Tap", s, "20", 45),
          ex("Side Plank", s, "40s", 45),
        ],
      },
      {
        name: days[3],
        week,
        exercises: [
          ex("Jumping Lunge", s, at(jumps, week)),
          ex("Walking Lunge", s, "20"),
          ex("Wall Sit", s, "45-60s", 60),
          ex("Burpee", s, "10", 60),
          ex("Lying Leg Raise", s, "12-15", 45),
        ],
      },
    ];
  });
}

/** Four sessions that repeat, at high volume. */
function advancedPlan(days: string[]): ProgramDay[] {
  return [
    {
      name: days[0],
      exercises: [ex("Pull-up", 5, "6-10", 150), ex("Chin-up", 4, "AMRAP", 120), ex("Hanging Leg Raise", 4, "10-15"), ex("Hollow Hold", 4, "45-60s", 60)],
    },
    {
      name: days[1],
      exercises: [ex("Chest Dip", 5, "10-15", 120), ex("Handstand Hold", 5, "30-60s", 90), ex("Push-up", 4, "20-30"), ex("Plank Shoulder Tap", 3, "30", 45)],
    },
    {
      name: days[2],
      exercises: [
        ex("Bulgarian Split Squat", 5, "10-12", 90),
        ex("Jumping Lunge", 4, "20"),
        ex("Jump Squat", 4, "15"),
        ex("Single-Leg Calf Raise", 4, "15-20", 45),
        ex("Wall Sit", 3, "60-90s", 60),
      ],
    },
    {
      name: days[3],
      exercises: [ex("Burpee", 5, "15", 60), ex("Mountain Climber", 5, "40", 45), ex("Pull-up", 5, "5", 60), ex("Push-up", 5, "20", 45), ex("Side Plank", 3, "45s", 45)],
    },
  ];
}

const PLANS = [
  { id: "callisthenics-debutant", text: TEXT.debutant, level: "beginner", daysPerWeek: 3, build: beginnerPlan },
  { id: "callisthenics-intermediaire", text: TEXT.intermediaire, level: "intermediate", daysPerWeek: 4, build: intermediatePlan },
  { id: "callisthenics-avance", text: TEXT.avance, level: "advanced", daysPerWeek: 4, build: advancedPlan },
] as const;

/** The callisthenics programs in every language; the French one keeps the id. */
export const CALLISTHENICS_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.flatMap((locale) =>
  PLANS.map((plan): ProgramTemplate => {
    const text = plan.text[locale];
    return {
      id: locale === "fr" ? plan.id : `${plan.id}-${locale}`,
      locale,
      name: text.name,
      description: text.description,
      goal: "general",
      level: plan.level,
      daysPerWeek: plan.daysPerWeek,
      homeFriendly: true,
      structure: plan.build(text.days),
    };
  })
);

/** Ids of the callisthenics programs (the French originals), for their shelf. */
export const CALLISTHENICS_IDS = PLANS.map((p) => p.id);
