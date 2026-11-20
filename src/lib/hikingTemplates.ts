import type { ProgramDay } from "@/db";
import { PLAN_LOCALES, type PlanLocale } from "./enduranceText";
import type { ProgramTemplate } from "./programTemplates";

/**
 * Two hiking programs of 8 weeks, three sessions a week: get ready for a
 * trek of several days (a heavier pack, longer days, two days back to back),
 * and get ready for the mountain (climbing, and above all coming down).
 * Each week: legs and trunk strength, a walk in the week, a long outing.
 * Written in French; English and German change only the words.
 */

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec = 60) => ({ exerciseName, targetSets, targetReps, restSec });

interface Words {
  week: string;
  label: Record<"strength" | "walk" | "hills" | "long" | "backToBack" | "climb" | "easy", string>;
  purpose: Record<"strength" | "walk" | "hills" | "long" | "backToBack" | "climb" | "easy" | "descent", string>;
  warmUp: string;
  coolDown: string;
  walk: (min: number, pack: number) => string;
  hills: (n: number, min: number) => string;
  long: (h: string, pack: number) => string;
  secondDay: (h: string, pack: number) => string;
  climb: (m: number, h: string) => string;
  descent: string;
  poles: string;
  eat: string;
  checklist: string;
  programs: Record<"trek" | "mountain", { name: string; description: string }>;
}

const hours = (min: number, locale: PlanLocale) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return locale === "en" ? (m ? `${h} h ${m}` : `${h} h`) : m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
};

const W: Record<PlanLocale, Words> = {
  fr: {
    week: "S",
    label: { strength: "Renforcement", walk: "Marche active", hills: "Côtes et escaliers", long: "Sortie longue", backToBack: "Deux jours enchaînés", climb: "Sortie avec dénivelé", easy: "Sortie tranquille" },
    purpose: {
      strength: "Des jambes, des chevilles et un tronc solides : moins de fatigue et moins d'entorses sur le sentier.",
      walk: "Marcher d'un bon pas, sac au dos, pour habituer le corps sans l'user.",
      hills: "Monter en souffle et en puissance, puis redescendre en contrôlant.",
      long: "Allonger le temps sur les jambes et la charge du sac, sans se presser.",
      backToBack: "Enchaîner deux journées pour apprendre à repartir le lendemain, comme en trek.",
      climb: "Monter le dénivelé à une allure qu'on tient longtemps, et ménager les genoux en descente.",
      easy: "Semaine plus légère : le corps assimile le travail des semaines précédentes.",
      descent: "Freiner les descentes : c'est là que les genoux et les cuisses souffrent le plus.",
    },
    warmUp: "Échauffement : 10 min de marche facile, puis cercles de chevilles et de hanches",
    coolDown: "Retour au calme : 5 à 10 min de marche lente, puis étirements des mollets et des cuisses",
    walk: (min, pack) => `${min} min de marche soutenue (on peut parler mais pas chanter)${pack ? `, sac de ${pack} kg` : ""}`,
    hills: (n, min) => `${n} montées de ${min} min à bon rythme (côte ou escaliers), redescente en marchant lentement`,
    long: (h, pack) => `${h} de randonnée à allure régulière, sac de ${pack} kg`,
    secondDay: (h, pack) => `Le lendemain : ${h} de randonnée, même sac (${pack} kg), allure tranquille`,
    climb: (m, h) => `Environ ${m} m de dénivelé positif sur ${h}, montée à allure régulière`,
    descent: "En descente : petits pas, genoux souples, bâtons si vous en avez",
    poles: "Les bâtons soulagent les genoux en descente et aident en montée : réglez-les à hauteur de coude.",
    eat: "Mangez un peu toutes les heures et buvez avant d'avoir soif.",
    checklist: "Avant de partir : itinéraire laissé à un proche, météo vérifiée, eau, de quoi manger, une couche chaude, une trousse de secours et un téléphone chargé.",
    programs: {
      trek: { name: "Préparer un trek de plusieurs jours", description: "Huit semaines pour porter un sac plus lourd, plus longtemps, et repartir le lendemain : renforcement des jambes et du tronc, marche en semaine, sortie longue le week-end, jusqu'à deux jours enchaînés." },
      mountain: { name: "Randonnée en montagne", description: "Huit semaines pour monter le dénivelé et le redescendre sans casse : renforcement des jambes en freinage, côtes et escaliers, sorties de 400 à 1 000 m de dénivelé positif." },
    },
  },
  en: {
    week: "W",
    label: { strength: "Strength", walk: "Brisk walk", hills: "Hills and stairs", long: "Long outing", backToBack: "Two days back to back", climb: "Outing with climbing", easy: "Easy outing" },
    purpose: {
      strength: "Strong legs, ankles and trunk: less tiredness and fewer sprains on the trail.",
      walk: "Walk at a good pace with a pack, to get the body used to it without wearing it out.",
      hills: "Climb with breath and power, then come down under control.",
      long: "Lengthen the time on your feet and the weight of the pack, without hurrying.",
      backToBack: "Put two days together to learn to set off again the next day, as on a trek.",
      climb: "Climb at a pace you can hold for long, and spare the knees on the way down.",
      easy: "Lighter week: the body takes in the work of the weeks before.",
      descent: "Brake on the descents: that is where knees and thighs suffer most.",
    },
    warmUp: "Warm-up: 10 min of easy walking, then ankle and hip circles",
    coolDown: "Cool-down: 5 to 10 min of slow walking, then calf and thigh stretches",
    walk: (min, pack) => `${min} min of brisk walking (you can talk but not sing)${pack ? `, ${pack} kg pack` : ""}`,
    hills: (n, min) => `${n} climbs of ${min} min at a good pace (hill or stairs), walking slowly back down`,
    long: (h, pack) => `${h} of hiking at a steady pace, ${pack} kg pack`,
    secondDay: (h, pack) => `The next day: ${h} of hiking, same pack (${pack} kg), easy pace`,
    climb: (m, h) => `About ${m} m of climbing over ${h}, steady pace uphill`,
    descent: "Downhill: short steps, soft knees, poles if you have them",
    poles: "Poles spare the knees downhill and help uphill: set them at elbow height.",
    eat: "Eat a little every hour and drink before you are thirsty.",
    checklist: "Before you go: route left with someone, weather checked, water, food, a warm layer, a first-aid kit and a charged phone.",
    programs: {
      trek: { name: "Get ready for a multi-day trek", description: "Eight weeks to carry a heavier pack for longer and set off again the next day: leg and trunk strength, a walk in the week, a long outing at the weekend, up to two days back to back." },
      mountain: { name: "Mountain hiking", description: "Eight weeks to climb and come back down unharmed: braking leg strength, hills and stairs, outings of 400 to 1,000 m of climbing." },
    },
  },
  de: {
    week: "W",
    label: { strength: "Kräftigung", walk: "Zügiges Gehen", hills: "Hügel und Treppen", long: "Lange Tour", backToBack: "Zwei Tage am Stück", climb: "Tour mit Höhenmetern", easy: "Lockere Tour" },
    purpose: {
      strength: "Starke Beine, Knöchel und Rumpf: weniger Ermüdung und weniger Umknicken auf dem Weg.",
      walk: "Zügig mit Rucksack gehen, um den Körper zu gewöhnen, ohne ihn zu verschleißen.",
      hills: "Mit Puste und Kraft bergauf, dann kontrolliert bergab.",
      long: "Zeit auf den Beinen und Rucksackgewicht steigern, ohne Eile.",
      backToBack: "Zwei Tage verbinden, um am nächsten Tag wieder loszugehen, wie auf einem Trek.",
      climb: "In einem Tempo bergauf, das man lange hält, und bergab die Knie schonen.",
      easy: "Leichtere Woche: der Körper verarbeitet die Arbeit der Vorwochen.",
      descent: "Bergab bremsen: dort leiden Knie und Oberschenkel am meisten.",
    },
    warmUp: "Aufwärmen: 10 Min. lockeres Gehen, dann Knöchel- und Hüftkreisen",
    coolDown: "Ausklang: 5 bis 10 Min. langsames Gehen, dann Waden und Oberschenkel dehnen",
    walk: (min, pack) => `${min} Min. zügiges Gehen (sprechen geht, singen nicht)${pack ? `, Rucksack ${pack} kg` : ""}`,
    hills: (n, min) => `${n} Anstiege à ${min} Min. in gutem Tempo (Hügel oder Treppen), langsam zurück bergab`,
    long: (h, pack) => `${h} Wandern in gleichmäßigem Tempo, Rucksack ${pack} kg`,
    secondDay: (h, pack) => `Am nächsten Tag: ${h} Wandern, gleicher Rucksack (${pack} kg), lockeres Tempo`,
    climb: (m, h) => `Etwa ${m} Höhenmeter bergauf in ${h}, gleichmäßiges Tempo im Anstieg`,
    descent: "Bergab: kleine Schritte, weiche Knie, Stöcke, wenn vorhanden",
    poles: "Stöcke entlasten die Knie bergab und helfen bergauf: auf Ellbogenhöhe einstellen.",
    eat: "Jede Stunde etwas essen und trinken, bevor der Durst kommt.",
    checklist: "Vor dem Aufbruch: Route bei jemandem hinterlassen, Wetter geprüft, Wasser, Essen, eine warme Schicht, ein Erste-Hilfe-Set und ein geladenes Handy.",
    programs: {
      trek: { name: "Vorbereitung auf ein mehrtägiges Trekking", description: "Acht Wochen, um einen schwereren Rucksack länger zu tragen und am nächsten Tag wieder loszugehen: Bein- und Rumpfkraft, Gehen unter der Woche, lange Tour am Wochenende, bis zu zwei Tagen am Stück." },
      mountain: { name: "Bergwandern", description: "Acht Wochen, um Höhenmeter zu machen und heil wieder herunterzukommen: bremsende Beinkraft, Hügel und Treppen, Touren mit 400 bis 1.000 Höhenmetern." },
    },
  },
};

const hike = (name: string, week: number, durationMin: number, intensity: string, purpose: string, steps: string[], notes?: string): ProgramDay => ({
  name,
  week,
  exercises: [],
  cardio: { sport: "hike", durationMin, intensity, purpose, steps, ...(notes ? { notes } : {}) },
});
const weeks = Array.from({ length: 8 }, (_, i) => i + 1);

function trek(w: Words, locale: PlanLocale): ProgramDay[] {
  const walk = [45, 50, 55, 40, 60, 65, 70, 45];
  const longMin = [120, 150, 180, 120, 210, 240, 240, 150];
  const pack = [5, 6, 7, 5, 8, 9, 10, 6];
  return weeks.flatMap((week) => {
    const name = (label: string) => `${w.week}${week} · ${label}`;
    const easy = week === 4 || week === 8;
    const sets = easy ? 2 : 3;
    return [
      {
        name: name(w.label.strength),
        week,
        exercises: [
          ex("Goblet Squat", sets, "10-12", 75),
          ex("Step-up", sets, "10-12"),
          ex("Single-Leg Calf Raise", sets, "12-15", 45),
          ex("Glute Bridge", sets, "12-15", 45),
          ex("Side Plank", sets, "30s", 45),
          ex("Bird Dog", sets, "10", 45),
        ],
      },
      hike(name(w.label.walk), week, walk[week - 1], "Zone 2", w.purpose.walk, [w.warmUp, w.walk(walk[week - 1] - 15, week >= 3 ? Math.round(pack[week - 1] / 2) : 0), w.coolDown]),
      week === 7
        ? hike(name(w.label.backToBack), week, longMin[6] + 180, "Zone 1-2", w.purpose.backToBack, [w.warmUp, w.long(hours(longMin[6], locale), pack[6]), w.secondDay(hours(180, locale), pack[6]), w.coolDown], `${w.eat} ${w.checklist}`)
        : hike(name(easy ? w.label.easy : w.label.long), week, longMin[week - 1], "Zone 1-2", easy ? w.purpose.easy : w.purpose.long, [w.warmUp, w.long(hours(longMin[week - 1], locale), pack[week - 1]), w.coolDown], week >= 3 ? `${w.eat} ${w.checklist}` : w.checklist),
    ];
  });
}

function mountain(w: Words, locale: PlanLocale): ProgramDay[] {
  const hills: [number, number][] = [[4, 3], [5, 3], [5, 4], [3, 3], [6, 4], [6, 5], [7, 5], [4, 3]];
  const climb = [400, 500, 600, 400, 800, 900, 1000, 600];
  const climbMin = [180, 210, 240, 180, 300, 330, 360, 240];
  return weeks.flatMap((week) => {
    const name = (label: string) => `${w.week}${week} · ${label}`;
    const easy = week === 4 || week === 8;
    const sets = easy ? 2 : 3;
    const [n, min] = hills[week - 1];
    return [
      {
        name: name(w.label.strength),
        week,
        exercises: [
          ex("Bulgarian Split Squat", sets, "8-10", 90),
          ex("Step-up", sets + 1, "10-12"),
          ex("Single-Leg Romanian Deadlift", sets, "8-10", 75),
          ex("Reverse Lunge", sets, "10-12"),
          ex("Single-Leg Calf Raise", sets, "12-15", 45),
          ex("Plank", sets, "30-45s", 45),
        ],
      },
      hike(name(w.label.hills), week, 15 + n * min * 2 + 10, easy ? "Zone 2-3" : "Zone 3-4", w.purpose.hills, [w.warmUp, w.hills(n, min), w.coolDown], w.poles),
      hike(name(easy ? w.label.easy : w.label.climb), week, climbMin[week - 1], "Zone 2", easy ? w.purpose.easy : w.purpose.climb, [w.warmUp, w.climb(climb[week - 1], hours(climbMin[week - 1], locale)), w.descent, w.coolDown], `${w.purpose.descent} ${w.eat} ${w.checklist}`),
    ];
  });
}

const PLANS = [
  { id: "rando-trek", key: "trek" as const, level: "beginner" as const, build: trek },
  { id: "rando-montagne", key: "mountain" as const, level: "intermediate" as const, build: mountain },
];

/** The hiking programs in every language; the French one keeps the plain id. */
export const HIKING_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.flatMap((locale) =>
  PLANS.map((p): ProgramTemplate => ({
    id: locale === "fr" ? p.id : `${p.id}-${locale}`,
    locale,
    name: W[locale].programs[p.key].name,
    description: W[locale].programs[p.key].description,
    goal: "endurance",
    level: p.level,
    daysPerWeek: 3,
    structure: p.build(W[locale], locale),
  }))
);
