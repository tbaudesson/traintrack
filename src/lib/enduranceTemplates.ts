import type { CardioTarget, ProgramDay, Sport } from "@/db";
import type { ProgramTemplate } from "./programTemplates";

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec = 60) => ({
  exerciseName,
  targetSets,
  targetReps,
  restSec,
});

const day = (week: number, label: string, cardio: CardioTarget): ProgramDay => ({
  name: `S${week} · ${label}`,
  week,
  exercises: [],
  cardio,
});

const CAUTION = " Avis médical conseillé avant de commencer. À adapter à vos sensations.";

/** Long run of each week: build, ease off every fourth week, then taper. */
const MARATHON_LONG = [12, 14, 16, 13, 18, 20, 22, 16, 24, 26, 28, 20, 32, 24, 16];
const HALF_LONG = [8, 10, 12, 10, 13, 15, 16, 12, 18, 16, 12];
const TEN_K_LONG = [5, 6, 7, 6, 8, 9, 7];

function runPlan(longRuns: number[], race: { km: number; name: string }, easyBase: number, withExtraEasy: boolean): ProgramDay[] {
  const days: ProgramDay[] = [];
  longRuns.forEach((long, i) => {
    const week = i + 1;
    const easy = Math.max(4, Math.round(easyBase + long * 0.2));
    const run = (distanceKm: number, intensity: string, notes?: string): CardioTarget => ({ sport: "run", distanceKm, intensity, notes });
    days.push(day(week, "Footing", run(easy, "Zone 2", "Allure confortable : vous devez pouvoir parler.")));
    days.push(
      day(
        week,
        week % 2 ? "Seuil" : "Fractionné",
        week % 2
          ? run(easy + 2, "Zone 4", "15 min d'échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs.")
          : run(easy + 2, "Zone 5", "15 min d'échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque.")
      )
    );
    if (withExtraEasy) days.push(day(week, "Récupération", run(Math.max(4, easy - 2), "Zone 1", "Très facile, pour récupérer.")));
    days.push(day(week, "Sortie longue", run(long, "Zone 2", "Allure régulière, hydratez-vous.")));
  });
  const week = longRuns.length + 1;
  days.push(day(week, "Footing", { sport: "run", distanceKm: 6, intensity: "Zone 2", notes: "Court et facile." }));
  days.push(day(week, "Rappel", { sport: "run", distanceKm: 4, intensity: "Zone 3", notes: "Quelques accélérations de 30 s, sans forcer." }));
  days.push(day(week, race.name, { sport: "run", distanceKm: race.km, intensity: "Course", notes: "Partez prudemment, et bonne course !" }));
  return days;
}

function couchTo5k(): ProgramDay[] {
  const minutes = [20, 22, 24, 25, 27, 28, 30];
  const blocks = [
    "8 × (1 min de course, 2 min de marche)",
    "6 × (2 min de course, 2 min de marche)",
    "5 × (3 min de course, 2 min de marche)",
    "4 × (5 min de course, 1 min de marche)",
    "3 × (8 min de course, 1 min de marche)",
    "2 × (12 min de course, 1 min de marche)",
    "25 min de course sans s'arrêter",
  ];
  const days: ProgramDay[] = [];
  minutes.forEach((durationMin, i) => {
    for (let n = 1; n <= 3; n++) {
      days.push(day(i + 1, `Séance ${n}`, { sport: "run", durationMin, intensity: "Zone 2", notes: blocks[i] }));
    }
  });
  days.push(day(8, "Séance 1", { sport: "run", durationMin: 25, intensity: "Zone 2", notes: "Course continue." }));
  days.push(day(8, "Séance 2", { sport: "run", durationMin: 20, intensity: "Zone 2", notes: "Court et facile." }));
  days.push(day(8, "Objectif 5 km", { sport: "run", distanceKm: 5, intensity: "Course", notes: "Votre premier 5 km !" }));
  return days;
}

function weekly(sport: Sport, weeks: { label: string; target: Omit<CardioTarget, "sport"> }[][]): ProgramDay[] {
  return weeks.flatMap((sessions, i) => sessions.map((s) => day(i + 1, s.label, { sport, ...s.target })));
}

function swimPlan() {
  const base = [1, 1.2, 1.4, 1.2, 1.6, 1.8, 2, 2.5];
  return weekly(
    "swim",
    base.map((km) => [
      { label: "Technique", target: { distanceKm: km, intensity: "Zone 2", notes: "Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple." } },
      { label: "Séries", target: { distanceKm: Math.round((km + 0.2) * 10) / 10, intensity: "Zone 4", notes: "Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme." } },
      { label: "Endurance", target: { distanceKm: Math.round((km + 0.4) * 10) / 10, intensity: "Zone 2", notes: "Nage continue et régulière." } },
    ])
  );
}

function bikePlan() {
  const long = [60, 75, 90, 75, 105, 120, 135, 150];
  return weekly(
    "bike",
    long.map((durationMin) => [
      { label: "Endurance", target: { durationMin: 45, intensity: "Zone 2", notes: "Pédalage souple." } },
      { label: "Intervalles", target: { durationMin: 60, intensity: "Zone 4", notes: "15 min d'échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque." } },
      { label: "Sortie longue", target: { durationMin, intensity: "Zone 2", notes: "Mangez et buvez régulièrement." } },
    ])
  );
}

/** Plans whose days follow each other week after week. */
export const ENDURANCE_TEMPLATES: ProgramTemplate[] = [
  {
    id: "plan-marathon-16", name: "Marathon en 16 semaines",
    description: `Quatre sorties par semaine, sortie longue jusqu'à 32 km, puis affûtage.${CAUTION}`,
    goal: "endurance", level: "intermediate", daysPerWeek: 4,
    structure: runPlan(MARATHON_LONG, { km: 42.2, name: "Marathon" }, 5, true),
  },
  {
    id: "plan-semi-12", name: "Semi-marathon en 12 semaines",
    description: `Trois sorties par semaine pour courir 21 km sereinement.${CAUTION}`,
    goal: "endurance", level: "intermediate", daysPerWeek: 3,
    structure: runPlan(HALF_LONG, { km: 21.1, name: "Semi-marathon" }, 4, false),
  },
  {
    id: "plan-10k-8", name: "10 km en 8 semaines",
    description: `Trois sorties par semaine pour réussir votre premier 10 km.${CAUTION}`,
    goal: "endurance", level: "beginner", daysPerWeek: 3,
    structure: runPlan(TEN_K_LONG, { km: 10, name: "10 km" }, 3, false),
  },
  {
    id: "plan-5k-8", name: "Débuter la course : 5 km",
    description: `En alternant course et marche, de zéro à 5 km en 8 semaines.${CAUTION}`,
    goal: "endurance", level: "beginner", daysPerWeek: 3,
    structure: couchTo5k(),
  },
  {
    id: "plan-natation-8", name: "Natation endurance",
    description: `Technique, séries et endurance, de 1 à près de 3 km par séance.${CAUTION}`,
    goal: "endurance", level: "intermediate", daysPerWeek: 3,
    structure: swimPlan(),
  },
  {
    id: "plan-velo-8", name: "Vélo endurance",
    description: `Trois sorties par semaine, sortie longue jusqu'à 2 h 30.${CAUTION}`,
    goal: "endurance", level: "intermediate", daysPerWeek: 3,
    structure: bikePlan(),
  },
  {
    id: "renfo-coureur", name: "Renfo coureur",
    description: "Hanches, mollets et gainage : deux séances courtes pour courir plus solide.",
    goal: "endurance", level: "beginner", daysPerWeek: 2, homeFriendly: true,
    structure: [
      { name: "Renfo A", exercises: [ex("Bulgarian Split Squat", 3, "8-10", 90), ex("Single-Leg Calf Raise", 3, "12-15"), ex("Glute Bridge", 3, "12-15"), ex("Side Plank", 3, "30-45s")] },
      { name: "Renfo B", exercises: [ex("Single-Leg Romanian Deadlift", 3, "8-10", 90), ex("Step-up", 3, "10-12"), ex("Dead Bug", 3, "10-12"), ex("Plank", 3, "45-60s")] },
    ],
  },
  {
    id: "renfo-trail", name: "Renfo trail",
    description: "Force des jambes et stabilité pour encaisser les montées et les descentes.",
    goal: "endurance", level: "intermediate", daysPerWeek: 2,
    structure: [
      { name: "Montées", exercises: [ex("Back Squat", 4, "6-8", 150), ex("Step-up", 3, "10-12", 90), ex("Single-Leg Calf Raise", 3, "15-20"), ex("Side Plank", 3, "45-60s")] },
      { name: "Descentes", exercises: [ex("Walking Lunge", 4, "10-12", 90), ex("Single-Leg Romanian Deadlift", 3, "8-10", 90), ex("Leg Curl", 3, "10-12"), ex("Bird Dog", 3, "10-12")] },
    ],
  },
  {
    id: "renfo-nageur", name: "Renfo nageur",
    description: "Dos, épaules et gainage pour une nage plus puissante et des épaules protégées.",
    goal: "endurance", level: "intermediate", daysPerWeek: 2,
    structure: [
      { name: "Tirage", exercises: [ex("Lat Pulldown", 4, "8-10", 90), ex("Straight-Arm Pulldown", 3, "12-15"), ex("Seated Cable Row", 3, "10-12", 90), ex("External Shoulder Rotation", 3, "15-20")] },
      { name: "Gainage", exercises: [ex("Pull-up", 3, "5-8", 120), ex("Face Pull", 3, "15-20"), ex("Dead Bug", 3, "10-12"), ex("Side Plank", 3, "30-45s")] },
    ],
  },
  {
    id: "renfo-cycliste", name: "Renfo cycliste",
    description: "Jambes, fessiers et bas du dos, pour tenir la position et relancer plus fort.",
    goal: "endurance", level: "intermediate", daysPerWeek: 2,
    structure: [
      { name: "Force", exercises: [ex("Back Squat", 4, "6-8", 150), ex("Hip Thrust", 3, "8-10", 90), ex("Standing Calf Raise", 3, "12-15")] },
      { name: "Stabilité", exercises: [ex("Bulgarian Split Squat", 3, "8-10", 90), ex("Romanian Deadlift", 3, "8-10", 90), ex("Bird Dog", 3, "10-12"), ex("Plank", 3, "45-60s")] },
    ],
  },
];
