import type { ProgramDay } from "@/db";
import type { PainArea } from "./pain";
import { PLAN_LOCALES, type PlanLocale } from "./enduranceText";
import type { ProgramTemplate } from "./programTemplates";

/**
 * One program per injured area: three sessions a week that keep training
 * everything the injury leaves alone. Not a rehabilitation: no exercise of
 * these programs loads the area at all, by the rules of injuries.ts (a test
 * checks it), and each description sends the athlete to a health professional.
 * Written in French; the other languages change the name, description and days.
 */

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec = 75) => ({ exerciseName, targetSets, targetReps, restSec });

interface Original {
  area: Exclude<PainArea, "other">;
  structure: ProgramDay[];
}

const ORIGINALS: Original[] = [
  {
    area: "shoulder",
    structure: [
      { name: "", exercises: [ex("Leg Press", 3, "10-12", 90), ex("Leg Curl", 3, "10-12"), ex("Walking Lunge", 3, "10-12"), ex("Standing Calf Raise", 3, "12-15", 60), ex("Crunch", 3, "15-20", 45)] },
      { name: "", exercises: [ex("Crunch", 3, "15-20", 45), ex("Lying Leg Raise", 3, "12-15", 45), ex("Bicycle Crunch", 3, "20", 45), ex("Hollow Hold", 3, "20-30s", 45), ex("Glute Bridge", 3, "12-15", 60)] },
      { name: "", exercises: [ex("Hip Thrust", 3, "10-12", 90), ex("Bulgarian Split Squat", 3, "8-10", 90), ex("Leg Extension", 3, "12-15", 60), ex("Single-Leg Calf Raise", 3, "12-15", 45), ex("Flutter Kicks", 3, "20-30s", 45)] },
    ],
  },
  {
    area: "elbow",
    structure: [
      { name: "", exercises: [ex("Cable Fly", 3, "12-15", 60), ex("Straight-Arm Pulldown", 3, "12-15", 60), ex("Lateral Raise", 3, "12-15", 45), ex("Rear Delt Fly", 3, "12-15", 45), ex("Dead Bug", 3, "10-12", 45)] },
      { name: "", exercises: [ex("Leg Press", 3, "10-12", 90), ex("Romanian Deadlift", 3, "8-10", 120), ex("Leg Curl", 3, "10-12"), ex("Standing Calf Raise", 3, "12-15", 60), ex("Crunch", 3, "15-20", 45)] },
      { name: "", exercises: [ex("Hip Thrust", 3, "10-12", 90), ex("Walking Lunge", 3, "10-12"), ex("Face Pull", 3, "12-15", 60), ex("Leg Extension", 3, "12-15", 60), ex("Lying Leg Raise", 3, "12-15", 45)] },
    ],
  },
  {
    area: "wrist",
    structure: [
      { name: "", exercises: [ex("Dumbbell Bench Press", 3, "8-10", 90), ex("Lat Pulldown", 3, "10-12"), ex("Seated Cable Row", 3, "10-12"), ex("Lateral Raise", 3, "12-15", 45), ex("Hammer Curl", 3, "10-12", 60)] },
      { name: "", exercises: [ex("Leg Press", 3, "10-12", 90), ex("Romanian Deadlift", 3, "8-10", 120), ex("Leg Curl", 3, "10-12"), ex("Standing Calf Raise", 3, "12-15", 60), ex("Crunch", 3, "15-20", 45)] },
      { name: "", exercises: [ex("Incline Dumbbell Press", 3, "10-12", 90), ex("Dumbbell Row", 3, "10-12"), ex("Face Pull", 3, "12-15", 60), ex("Hip Thrust", 3, "10-12", 90), ex("Dead Bug", 3, "10-12", 45)] },
    ],
  },
  {
    area: "neck",
    structure: [
      { name: "", exercises: [ex("Leg Press", 3, "10-12", 90), ex("Dumbbell Bench Press", 3, "8-10", 90), ex("Seated Cable Row", 3, "10-12"), ex("Leg Curl", 3, "10-12"), ex("Dead Bug", 3, "10-12", 45)] },
      { name: "", exercises: [ex("Romanian Deadlift", 3, "8-10", 120), ex("Hip Thrust", 3, "10-12", 90), ex("Lat Pulldown", 3, "10-12"), ex("Lateral Raise", 3, "12-15", 45), ex("Plank", 3, "30-45s", 45)] },
      { name: "", exercises: [ex("Goblet Squat", 3, "10-12", 90), ex("Incline Dumbbell Press", 3, "10-12", 90), ex("Dumbbell Row", 3, "10-12"), ex("Face Pull", 3, "12-15", 60), ex("Lying Leg Raise", 3, "12-15", 45)] },
    ],
  },
  {
    area: "upper_back",
    structure: [
      { name: "", exercises: [ex("Leg Press", 3, "10-12", 90), ex("Dumbbell Bench Press", 3, "8-10", 90), ex("Lat Pulldown", 3, "10-12"), ex("Leg Curl", 3, "10-12"), ex("Dead Bug", 3, "10-12", 45)] },
      { name: "", exercises: [ex("Goblet Squat", 3, "10-12", 90), ex("Hip Thrust", 3, "10-12", 90), ex("Cable Fly", 3, "12-15", 60), ex("Lateral Raise", 3, "12-15", 45), ex("Plank", 3, "30-45s", 45)] },
      { name: "", exercises: [ex("Leg Extension", 3, "12-15", 60), ex("Incline Dumbbell Press", 3, "10-12", 90), ex("Seated Cable Row", 3, "10-12"), ex("Face Pull", 3, "12-15", 60), ex("Crunch", 3, "15-20", 45)] },
    ],
  },
  {
    area: "lower_back",
    structure: [
      { name: "", exercises: [ex("Dumbbell Bench Press", 3, "8-10", 90), ex("Lat Pulldown", 3, "10-12"), ex("Cable Fly", 3, "12-15", 60), ex("Face Pull", 3, "12-15", 60), ex("Dead Bug", 3, "10-12", 45)] },
      { name: "", exercises: [ex("Leg Extension", 3, "12-15", 60), ex("Leg Curl", 3, "10-12"), ex("Glute Bridge", 3, "12-15", 60), ex("Step-up", 3, "10-12", 60), ex("Bird Dog", 3, "8-10", 45)] },
      { name: "", exercises: [ex("Incline Dumbbell Press", 3, "10-12", 90), ex("Straight-Arm Pulldown", 3, "12-15", 60), ex("Lateral Raise", 3, "12-15", 45), ex("Single-Leg Calf Raise", 3, "12-15", 45), ex("Crunch", 3, "15-20", 45)] },
    ],
  },
  {
    area: "hip",
    structure: [
      { name: "", exercises: [ex("Dumbbell Bench Press", 3, "8-10", 90), ex("Incline Dumbbell Press", 3, "10-12", 90), ex("Lateral Raise", 3, "12-15", 45), ex("Triceps Pushdown", 3, "10-12", 60), ex("Crunch", 3, "15-20", 45)] },
      { name: "", exercises: [ex("Lat Pulldown", 3, "10-12"), ex("Seated Cable Row", 3, "10-12"), ex("Face Pull", 3, "12-15", 60), ex("Dumbbell Curl", 3, "10-12", 60), ex("Dead Bug", 3, "10-12", 45)] },
      { name: "", exercises: [ex("Leg Extension", 3, "12-15", 60), ex("Leg Curl", 3, "10-12"), ex("Standing Calf Raise", 3, "12-15", 60), ex("Cable Fly", 3, "12-15", 60), ex("Plank", 3, "30-45s", 45)] },
    ],
  },
  {
    area: "knee",
    structure: [
      { name: "", exercises: [ex("Dumbbell Bench Press", 3, "8-10", 90), ex("Lat Pulldown", 3, "10-12"), ex("Seated Cable Row", 3, "10-12"), ex("Lateral Raise", 3, "12-15", 45), ex("Crunch", 3, "15-20", 45)] },
      { name: "", exercises: [ex("Romanian Deadlift", 3, "8-10", 120), ex("Hip Thrust", 3, "10-12", 90), ex("Glute Bridge", 3, "12-15", 60), ex("Standing Calf Raise", 3, "12-15", 60), ex("Dead Bug", 3, "10-12", 45)] },
      { name: "", exercises: [ex("Incline Dumbbell Press", 3, "10-12", 90), ex("Dumbbell Row", 3, "10-12"), ex("Face Pull", 3, "12-15", 60), ex("Hammer Curl", 3, "10-12", 60), ex("Triceps Pushdown", 3, "10-12", 60)] },
    ],
  },
  {
    area: "ankle",
    structure: [
      { name: "", exercises: [ex("Leg Press", 3, "10-12", 90), ex("Leg Curl", 3, "10-12"), ex("Dumbbell Bench Press", 3, "8-10", 90), ex("Lat Pulldown", 3, "10-12"), ex("Crunch", 3, "15-20", 45)] },
      { name: "", exercises: [ex("Hip Thrust", 3, "10-12", 90), ex("Leg Extension", 3, "12-15", 60), ex("Seated Cable Row", 3, "10-12"), ex("Lateral Raise", 3, "12-15", 45), ex("Dead Bug", 3, "10-12", 45)] },
      { name: "", exercises: [ex("Glute Bridge", 3, "12-15", 60), ex("Incline Dumbbell Press", 3, "10-12", 90), ex("Dumbbell Row", 3, "10-12"), ex("Face Pull", 3, "12-15", 60), ex("Plank", 3, "30-45s", 45)] },
    ],
  },
];

interface Text {
  name: string;
  description: string;
  days: [string, string, string];
}

/** The closing words of every description: the program does not replace care. */
const CARE: Record<PlanLocale, string> = {
  fr: "À faire sans douleur, avec l'accord d'un professionnel de santé.",
  en: "Train without pain, with the go-ahead of a health professional.",
  de: "Schmerzfrei trainieren, mit dem Einverständnis einer medizinischen Fachperson.",
};

const TEXT: Record<Exclude<PainArea, "other">, Record<PlanLocale, Text>> = {
  shoulder: {
    fr: { name: "Épaule blessée : jambes et abdos", description: "Trois séances pour garder le rythme sans solliciter l'épaule : jambes, fessiers, abdos et gainage au sol, rien au-dessus de la tête ni en poussée.", days: ["Jambes", "Abdos et gainage", "Fessiers et jambes"] },
    en: { name: "Injured shoulder: legs and abs", description: "Three sessions to keep training without loading the shoulder: legs, glutes, abs and floor core work, nothing overhead and no pressing.", days: ["Legs", "Abs and core", "Glutes and legs"] },
    de: { name: "Verletzte Schulter: Beine und Bauch", description: "Drei Einheiten, um ohne Belastung der Schulter weiterzutrainieren: Beine, Gesäß, Bauch und Rumpf am Boden, nichts über Kopf und kein Drücken.", days: ["Beine", "Bauch und Rumpf", "Gesäß und Beine"] },
  },
  elbow: {
    fr: { name: "Coude blessé : sans flexion des bras", description: "Trois séances sans curl ni développé : le haut du corps travaille bras tendus, le bas du corps et les abdos comme d'habitude.", days: ["Haut du corps bras tendus", "Bas du corps", "Fessiers et épaules"] },
    en: { name: "Injured elbow: straight arms", description: "Three sessions without curls or presses: the upper body works with straight arms, legs and abs as usual.", days: ["Straight-arm upper body", "Lower body", "Glutes and shoulders"] },
    de: { name: "Verletzter Ellbogen: gestreckte Arme", description: "Drei Einheiten ohne Curls und Drücken: der Oberkörper arbeitet mit gestreckten Armen, Beine und Bauch wie gewohnt.", days: ["Oberkörper mit gestreckten Armen", "Unterkörper", "Gesäß und Schultern"] },
  },
  wrist: {
    fr: { name: "Poignet blessé : sans barre", description: "Trois séances aux haltères, poulies et machines, sans barre ni appui sur les mains : tout le corps continue de travailler.", days: ["Haut du corps", "Bas du corps", "Corps complet"] },
    en: { name: "Injured wrist: no barbell", description: "Three sessions with dumbbells, cables and machines, no barbell and no weight on the hands: the whole body keeps working.", days: ["Upper body", "Lower body", "Full body"] },
    de: { name: "Verletztes Handgelenk: ohne Langhantel", description: "Drei Einheiten mit Kurzhanteln, Kabelzug und Maschinen, ohne Langhantel und ohne Stütz auf den Händen: der ganze Körper trainiert weiter.", days: ["Oberkörper", "Unterkörper", "Ganzkörper"] },
  },
  neck: {
    fr: { name: "Nuque blessée : sans charge sur la nuque", description: "Trois séances complètes sans barre sur les épaules, sans charge au-dessus de la tête ni crunch qui tire sur la nuque.", days: ["Séance A", "Séance B", "Séance C"] },
    en: { name: "Injured neck: no load on the neck", description: "Three full-body sessions with no barbell on the shoulders, nothing overhead and no crunch pulling on the neck.", days: ["Session A", "Session B", "Session C"] },
    de: { name: "Verletzter Nacken: ohne Last auf dem Nacken", description: "Drei Ganzkörpereinheiten ohne Langhantel auf den Schultern, nichts über Kopf und keine Crunches, die am Nacken ziehen.", days: ["Einheit A", "Einheit B", "Einheit C"] },
  },
  upper_back: {
    fr: { name: "Haut du dos blessé : machines et haltères", description: "Trois séances sans soulevé de terre ni rowing lourd à la barre : machines, haltères et gainage pour tout le reste du corps.", days: ["Séance A", "Séance B", "Séance C"] },
    en: { name: "Injured upper back: machines and dumbbells", description: "Three sessions without deadlifts or heavy barbell rows: machines, dumbbells and core work for the rest of the body.", days: ["Session A", "Session B", "Session C"] },
    de: { name: "Verletzter oberer Rücken: Maschinen und Kurzhanteln", description: "Drei Einheiten ohne Kreuzheben und schweres Langhantelrudern: Maschinen, Kurzhanteln und Rumpftraining für den restlichen Körper.", days: ["Einheit A", "Einheit B", "Einheit C"] },
  },
  lower_back: {
    fr: { name: "Bas du dos blessé : sans charge sur le dos", description: "Trois séances sans squat, soulevé de terre ni rowing penché : le haut du corps sur banc et poulies, les jambes sur machines, un gainage doux.", days: ["Haut du corps", "Jambes sur machines", "Haut du corps et mollets"] },
    en: { name: "Injured lower back: no load on the spine", description: "Three sessions without squats, deadlifts or bent-over rows: upper body on a bench and cables, legs on machines, gentle core work.", days: ["Upper body", "Legs on machines", "Upper body and calves"] },
    de: { name: "Verletzter unterer Rücken: ohne Last auf der Wirbelsäule", description: "Drei Einheiten ohne Kniebeugen, Kreuzheben und vorgebeugtes Rudern: Oberkörper auf der Bank und am Kabelzug, Beine an Maschinen, sanftes Rumpftraining.", days: ["Oberkörper", "Beine an Maschinen", "Oberkörper und Waden"] },
  },
  hip: {
    fr: { name: "Hanche blessée : haut du corps", description: "Trois séances centrées sur le haut du corps, avec des jambes sur machines qui ne sollicitent pas la hanche.", days: ["Poussée", "Tirage", "Jambes sur machines"] },
    en: { name: "Injured hip: upper body", description: "Three sessions focused on the upper body, with leg machines that leave the hip alone.", days: ["Push", "Pull", "Legs on machines"] },
    de: { name: "Verletzte Hüfte: Oberkörper", description: "Drei Einheiten mit Schwerpunkt Oberkörper, dazu Beinmaschinen, die die Hüfte nicht belasten.", days: ["Drücken", "Ziehen", "Beine an Maschinen"] },
  },
  knee: {
    fr: { name: "Genou blessé : haut du corps et hanches", description: "Trois séances sans squat, fente ni saut : le haut du corps, et des fessiers et ischios travaillés genoux peu fléchis.", days: ["Haut du corps", "Hanches et fessiers", "Haut du corps et bras"] },
    en: { name: "Injured knee: upper body and hips", description: "Three sessions without squats, lunges or jumps: the upper body, and glutes and hamstrings worked with little knee bend.", days: ["Upper body", "Hips and glutes", "Upper body and arms"] },
    de: { name: "Verletztes Knie: Oberkörper und Hüfte", description: "Drei Einheiten ohne Kniebeugen, Ausfallschritte und Sprünge: Oberkörper sowie Gesäß und Beinbeuger mit wenig Kniebeugung.", days: ["Oberkörper", "Hüfte und Gesäß", "Oberkörper und Arme"] },
  },
  ankle: {
    fr: { name: "Cheville blessée : assis et allongé", description: "Trois séances sans saut, fente ni travail debout sur les jambes : machines, banc et exercices au sol.", days: ["Séance A", "Séance B", "Séance C"] },
    en: { name: "Injured ankle: seated and lying", description: "Three sessions without jumps, lunges or standing leg work: machines, a bench and floor exercises.", days: ["Session A", "Session B", "Session C"] },
    de: { name: "Verletzter Knöchel: im Sitzen und Liegen", description: "Drei Einheiten ohne Sprünge, Ausfallschritte und Beinarbeit im Stehen: Maschinen, Bank und Übungen am Boden.", days: ["Einheit A", "Einheit B", "Einheit C"] },
  },
};

/** The programs for an injury, in every language; the French one keeps the plain id. */
export const INJURY_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.flatMap((locale) =>
  ORIGINALS.map((o): ProgramTemplate => {
    const text = TEXT[o.area][locale];
    return {
      id: locale === "fr" ? `blessure-${o.area}` : `blessure-${o.area}-${locale}`,
      locale,
      name: text.name,
      description: `${text.description} ${CARE[locale]}`,
      goal: "general",
      level: "beginner",
      daysPerWeek: o.structure.length,
      forInjury: o.area,
      structure: o.structure.map((day, i) => ({ ...day, name: text.days[i] })),
    };
  })
);
