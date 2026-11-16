import type { TrainingGoal } from "@/db";
import type { FavoriteSport } from "./appTheme";
import type { DayType } from "./mealPlan";

/**
 * A day's food for one's sport. The energy comes first, as before: the
 * calories saved for the goal, more on a hard day and less on a rest day.
 * Then the sport shares them out, from the usual sports-nutrition guidance
 * (ACSM / IOC consensus): protein by the kilo of body weight, fat never
 * under 0.8 g a kilo, carbohydrates for the rest, but not under the range
 * the sport and the day ask for unless the athlete is losing fat. A starting
 * point to adjust, not a prescription.
 */

type Range = readonly [number, number];
type Family = "strength" | "endurance" | "cycling" | "vaulting" | "general";

const FAMILY: Record<FavoriteSport, Family> = {
  bodybuilding: "strength",
  strength: "strength",
  fitness: "strength",
  callisthenics: "strength",
  running: "endurance",
  swimming: "endurance",
  cycling: "cycling",
  vaulting: "vaulting",
};

/** Carbohydrates in grams a kilo, by kind of day. */
const CARBS: Record<Family, Record<DayType, Range>> = {
  strength: { rest: [2, 3], training: [3, 5], long: [4, 6] },
  endurance: { rest: [3, 5], training: [5, 7], long: [6, 10] },
  cycling: { rest: [3, 5], training: [5, 7], long: [7, 10] },
  vaulting: { rest: [3, 4], training: [4, 6], long: [5, 7] },
  general: { rest: [3, 4], training: [4, 5], long: [5, 7] },
};

/** Protein in grams a kilo, raised by the goal when it asks for more. */
const PROTEIN: Record<Family, number> = { strength: 1.8, endurance: 1.5, cycling: 1.5, vaulting: 1.6, general: 1.6 };
const PROTEIN_FOR_GOAL: Partial<Record<TrainingGoal, number>> = { fat_loss: 2, hypertrophy: 1.8 };

/** Energy on the day against the calories saved: endurance days differ the most. */
const DAY_ENERGY: Record<Family, Record<DayType, number>> = {
  strength: { rest: 0.92, training: 1, long: 1.1 },
  endurance: { rest: 0.9, training: 1, long: 1.2 },
  cycling: { rest: 0.9, training: 1, long: 1.25 },
  vaulting: { rest: 0.92, training: 1, long: 1.1 },
  general: { rest: 0.92, training: 1, long: 1.12 },
};

const FAT_FLOOR_PER_KG = 0.8;
const FAT_SHARE = 0.25;

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

export const familyOf = (sport: FavoriteSport | null | undefined): Family => (sport ? FAMILY[sport] : "general");

export function sportDay(input: { weightKg: number; calories: number; type: DayType; sport?: FavoriteSport | null; goal?: TrainingGoal }): SportDay {
  const family = familyOf(input.sport);
  const w = input.weightKg;
  const range = CARBS[family][input.type];
  const protein = Math.round(w * Math.max(PROTEIN[family], PROTEIN_FOR_GOAL[input.goal ?? "general_fitness"] ?? 0));
  let calories = Math.round((input.calories * DAY_ENERGY[family][input.type]) / 10) * 10;
  const fat = Math.round(Math.max(w * FAT_FLOOR_PER_KG, (calories * FAT_SHARE) / 9));
  let carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  let raised = false;
  // Short of fuel for the day: the carbohydrates come first, the calories follow.
  // Not while losing fat: there the deficit is the point.
  const least = Math.round(w * range[0]);
  if (carbs < least && input.goal !== "fat_loss") {
    carbs = least;
    calories = Math.round((protein * 4 + carbs * 4 + fat * 9) / 10) * 10;
    raised = true;
  }
  return { calories, protein, carbs, fat, carbsRange: range, raised };
}

export type Moment = "before_meal" | "before_snack" | "during" | "after";

export interface Fuelling {
  moment: Moment;
  /** "HH:MM" when the session's time is known. */
  at?: string;
  /** Carbohydrates in grams (a range), for the moment or by the hour during. */
  carbs?: Range;
  protein?: Range;
  /** Water in ml by the hour, during. */
  waterPerHour?: Range;
}

const shift = (time: string | undefined, minutes: number): string | undefined => {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return undefined;
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
const grams = (w: number, lo: number, hi: number): Range => [Math.round((w * lo) / 5) * 5, Math.round((w * hi) / 5) * 5];

/**
 * What to eat around a session: a meal 2 to 3 hours before, a small snack
 * just before, carbohydrates and water during an endurance effort over 75
 * minutes, and protein with carbohydrates in the hour or two after.
 */
export function fuelling(input: { weightKg: number; sport?: FavoriteSport | null; minutes: number; time?: string }): Fuelling[] {
  const family = familyOf(input.sport);
  const w = input.weightKg;
  const endurance = family === "endurance" || family === "cycling";
  const out: Fuelling[] = [
    { moment: "before_meal", at: shift(input.time, -150), carbs: grams(w, 1, endurance && input.minutes >= 75 ? 2 : 1.5) },
    { moment: "before_snack", at: shift(input.time, -45), carbs: [20, 40] },
  ];
  if (endurance && input.minutes >= 75) {
    out.push({ moment: "during", carbs: input.minutes >= 150 ? [60, 90] : [30, 60], waterPerHour: [400, 800] });
  } else if (input.minutes >= 90) {
    out.push({ moment: "during", waterPerHour: [400, 800] });
  }
  out.push({
    moment: "after",
    at: shift(input.time, input.minutes + 30),
    protein: [Math.max(20, Math.round((w * 0.25) / 5) * 5), Math.min(40, Math.round((w * 0.4) / 5) * 5)],
    carbs: endurance || input.minutes >= 75 ? grams(w, 1, 1.2) : grams(w, 0.5, 1),
  });
  return out;
}
