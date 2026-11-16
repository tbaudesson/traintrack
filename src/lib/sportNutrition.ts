import type { TrainingGoal } from "@/db";
import { FAVORITE_SPORTS, type FavoriteSport } from "./appTheme";
import type { DayType, PlanSlot } from "./mealPlan";

/**
 * A day's food for one's sport. The energy comes first, as before: the
 * calories saved for the goal, more on a hard day and less on a rest day.
 * Then the sport shares them out: protein by the kilo of body weight, fat
 * never under its floor, carbohydrates for the rest, but not under the range
 * the sport and the day ask for unless the athlete is losing fat.
 *
 * No figure lives here: every one comes from the guidance an admin keeps in
 * the app settings (migration 056 seeds it), read and kept on the device.
 * Without it, the app shares nothing out by sport.
 */

export type Range = [number, number];
const DAY_TYPES: DayType[] = ["rest", "training", "long"];
const GOALS: TrainingGoal[] = ["fat_loss", "hypertrophy", "strength", "endurance", "general_fitness"];

export interface FamilyGuidance {
  /** Protein in g a kilo. */
  protein: number;
  /** Carbohydrates in g a kilo, by kind of day. */
  carbs: Record<DayType, Range>;
  /** The day's calories against those saved, by kind of day. */
  energy: Record<DayType, number>;
  /** Carbohydrates and water by the hour come in during the effort (endurance). */
  endurance: boolean;
}

export interface NutritionGuidance {
  /** The daily targets the calculator proposes, from the body, the goal and the week. */
  targets: {
    /** Activity on top of an ordinary day, by training days a week: the first row whose days are not exceeded. */
    activity: { upToDays: number; factor: number }[];
    /** Calories against those that keep the weight, by goal (−0.2 = 20 % less). */
    goalAdjustment: Record<TrainingGoal, number>;
    /** Protein in g a kilo, by goal. */
    proteinPerKg: Record<TrainingGoal, number>;
    waterMlPerKg: number;
    /** Training days a week assumed while the week plan is empty. */
    defaultTrainingDays: number;
  };
  /** How the meal ideas share the day. */
  meals: {
    /** Each meal's share of the day's calories, for three and for four meals. */
    split: Record<"3" | "4", [PlanSlot, number][]>;
    /** A session from this distance or length makes a big day. */
    longDay: { distanceKm: number; minutes: number };
    /** The highest share of the calories given to protein when choosing meals. */
    proteinShareMax: number;
    /** The share of the calories given to protein when no protein target is saved. */
    proteinShareDefault: number;
    /** How far a meal's portion may go down and up to meet its calories (× the recipe). */
    portionScale: Range;
  };
  /** The family of each sport; a sport left out takes "general". */
  sports: Partial<Record<FavoriteSport, string>>;
  families: Record<string, FamilyGuidance>;
  /** Protein raised for a goal, in g a kilo. */
  proteinForGoal: Partial<Record<TrainingGoal, number>>;
  fat: { floorPerKg: number; share: number };
  fuelling: {
    /** The length of a session whose length is not known, in minutes. */
    sessionMinutes: number;
    /** Minutes before the session. */
    mealBefore: number;
    snackBefore: number;
    /** Minutes after the end of the session. */
    recoveryAfter: number;
    mealCarbsPerKg: Range;
    /** For a long endurance effort. */
    mealCarbsPerKgLong: Range;
    snackCarbs: Range;
    /** Endurance minutes from which to eat during the effort, and from which to eat more. */
    duringFrom: number;
    duringHighFrom: number;
    duringCarbsPerHour: Range;
    duringCarbsPerHourHigh: Range;
    /** Minutes from which to drink during any session. */
    waterFrom: number;
    waterPerHour: Range;
    recoveryProteinPerKg: Range;
    recoveryProteinBounds: Range;
    recoveryCarbsPerKgLong: Range;
    recoveryCarbsPerKg: Range;
  };
}

export const NUTRITION_GUIDANCE_KEY = "nutrition_guidance";

const num = (v: unknown, lo = 0, hi = 10_000): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const range = (v: unknown, hi = 10_000): v is Range => Array.isArray(v) && v.length === 2 && num(v[0], 0, hi) && num(v[1], 0, hi) && v[0] <= v[1];

/** Guidance read from the settings, or null when it is missing or does not hold together. */
export function parseGuidance(text: string | null | undefined): NutritionGuidance | null {
  if (!text) return null;
  let g: NutritionGuidance;
  try {
    g = JSON.parse(text);
  } catch {
    return null;
  }
  if (!g || typeof g !== "object" || !g.families || !g.families.general || !g.fat || !g.fuelling || !g.sports || !g.targets || !g.meals) return null;
  const tg = g.targets;
  if (!Array.isArray(tg.activity) || !tg.activity.length || !tg.activity.every((a) => num(a?.upToDays, 0, 7) && num(a?.factor, 1, 2.5))) return null;
  for (const goal of GOALS) if (!num(tg.goalAdjustment?.[goal] + 1, 0.5, 1.5) || !num(tg.proteinPerKg?.[goal], 0.5, 4)) return null;
  if (!num(tg.waterMlPerKg, 10, 80) || !num(tg.defaultTrainingDays, 0, 7)) return null;
  const SLOTS: PlanSlot[] = ["breakfast", "lunch", "snack", "dinner"];
  for (const n of ["3", "4"] as const) {
    const split = g.meals.split?.[n];
    if (!Array.isArray(split) || split.length !== Number(n) || !split.every(([slot, share]) => SLOTS.includes(slot) && num(share, 0.05, 0.8))) return null;
    if (new Set(split.map(([slot]) => slot)).size !== split.length) return null;
    const total = split.reduce((sum, [, share]) => sum + share, 0);
    if (total < 0.98 || total > 1.02) return null;
  }
  if (!num(g.meals.longDay?.distanceKm, 1, 300) || !num(g.meals.longDay?.minutes, 15, 600) || !num(g.meals.proteinShareMax, 0.15, 0.6) || !num(g.meals.proteinShareDefault, 0.1, 0.5) || !range(g.meals.portionScale, 5) || g.meals.portionScale[0] <= 0) return null;
  for (const f of Object.values(g.families)) {
    if (!num(f?.protein, 0.5, 4) || typeof f.endurance !== "boolean") return null;
    for (const d of DAY_TYPES) if (!range(f.carbs?.[d], 15) || !num(f.energy?.[d], 0.5, 2)) return null;
  }
  for (const [sport, family] of Object.entries(g.sports)) if (!FAVORITE_SPORTS.includes(sport as FavoriteSport) || !g.families[family as string]) return null;
  for (const [goal, p] of Object.entries(g.proteinForGoal ?? {})) if (!GOALS.includes(goal as TrainingGoal) || !num(p, 0.5, 4)) return null;
  if (!num(g.fat.floorPerKg, 0.3, 2) || !num(g.fat.share, 0.1, 0.5)) return null;
  const f = g.fuelling;
  const minutes = [f.sessionMinutes, f.mealBefore, f.snackBefore, f.recoveryAfter, f.duringFrom, f.duringHighFrom, f.waterFrom];
  const ranges: [unknown, number][] = [
    [f.mealCarbsPerKg, 10], [f.mealCarbsPerKgLong, 10], [f.snackCarbs, 500], [f.duringCarbsPerHour, 500], [f.duringCarbsPerHourHigh, 500],
    [f.waterPerHour, 3000], [f.recoveryProteinPerKg, 2], [f.recoveryProteinBounds, 200], [f.recoveryCarbsPerKgLong, 10], [f.recoveryCarbsPerKg, 10],
  ];
  if (!minutes.every((m) => num(m, 0, 600)) || !ranges.every(([r, hi]) => range(r, hi))) return null;
  return { ...g, proteinForGoal: g.proteinForGoal ?? {} };
}

export function familyOf(g: NutritionGuidance, sport: FavoriteSport | null | undefined): { id: string; family: FamilyGuidance } {
  const id = (sport && g.sports[sport]) || "general";
  return { id, family: g.families[id] ?? g.families.general };
}

export interface SportDay {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** The carbohydrates the sport and the day call for, in g a kilo. */
  carbsRange: Range;
  /** The calories were raised to give the carbohydrates the day needs. */
  raised: boolean;
}

export function sportDay(g: NutritionGuidance, input: { weightKg: number; calories: number; type: DayType; sport?: FavoriteSport | null; goal?: TrainingGoal }): SportDay {
  const { family } = familyOf(g, input.sport);
  const w = input.weightKg;
  const carbsRange = family.carbs[input.type];
  const protein = Math.round(w * Math.max(family.protein, g.proteinForGoal[input.goal ?? "general_fitness"] ?? 0));
  let calories = Math.round((input.calories * family.energy[input.type]) / 10) * 10;
  const fat = Math.round(Math.max(w * g.fat.floorPerKg, (calories * g.fat.share) / 9));
  let carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  let raised = false;
  // Short of fuel for the day: the carbohydrates come first, the calories follow.
  // Not while losing fat: there the deficit is the point.
  const least = Math.round(w * carbsRange[0]);
  if (carbs < least && input.goal !== "fat_loss") {
    carbs = least;
    calories = Math.round((protein * 4 + carbs * 4 + fat * 9) / 10) * 10;
    raised = true;
  }
  return { calories, protein, carbs, fat, carbsRange, raised };
}

export type Moment = "before_meal" | "before_snack" | "during" | "after";

export interface Fuelling {
  moment: Moment;
  /** "HH:MM" when the session's time is known. */
  at?: string;
  carbs?: Range;
  protein?: Range;
  waterPerHour?: Range;
}

const shift = (time: string | undefined, minutes: number): string | undefined => {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return undefined;
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
const grams = (w: number, [lo, hi]: Range): Range => [Math.round((w * lo) / 5) * 5, Math.round((w * hi) / 5) * 5];

/** What to eat around a session: a meal and a snack before, fuel and water during a long effort, then recovery. */
export function fuelling(g: NutritionGuidance, input: { weightKg: number; sport?: FavoriteSport | null; minutes: number; time?: string }): Fuelling[] {
  const { family } = familyOf(g, input.sport);
  const f = g.fuelling;
  const w = input.weightKg;
  const length = input.minutes > 0 ? input.minutes : f.sessionMinutes;
  const long = family.endurance && length >= f.duringFrom;
  const out: Fuelling[] = [
    { moment: "before_meal", at: shift(input.time, -f.mealBefore), carbs: grams(w, long ? f.mealCarbsPerKgLong : f.mealCarbsPerKg) },
    { moment: "before_snack", at: shift(input.time, -f.snackBefore), carbs: f.snackCarbs },
  ];
  if (long) {
    out.push({ moment: "during", carbs: length >= f.duringHighFrom ? f.duringCarbsPerHourHigh : f.duringCarbsPerHour, waterPerHour: f.waterPerHour });
  } else if (length >= f.waterFrom) {
    out.push({ moment: "during", waterPerHour: f.waterPerHour });
  }
  const [pLo, pHi] = grams(w, f.recoveryProteinPerKg);
  out.push({
    moment: "after",
    at: shift(input.time, length + f.recoveryAfter),
    protein: [Math.max(f.recoveryProteinBounds[0], pLo), Math.min(f.recoveryProteinBounds[1], Math.max(pHi, f.recoveryProteinBounds[0]))],
    carbs: grams(w, family.endurance || length >= f.duringFrom ? f.recoveryCarbsPerKgLong : f.recoveryCarbsPerKg),
  });
  return out;
}
