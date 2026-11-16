import { INGREDIENTS, MEALS, suits, type FoodKey, type Ingredient, type MealIdea, type MealPrefs } from "./mealCatalog";
import type { NutritionGuidance } from "./sportNutrition";

export type DayType = "rest" | "training" | "long";
export type PlanSlot = "breakfast" | "lunch" | "snack" | "dinner";

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface PlannedMeal {
  slot: PlanSlot;
  meal: MealIdea;
  items: [FoodKey, number][];
  macros: Macros;
}

/** A day's food against its targets. */
export interface DayPlan {
  type: DayType;
  calories: number;
  protein: number;
  meals: PlannedMeal[];
  total: Macros;
}

const food = (k: FoodKey) => INGREDIENTS[k] as Ingredient;

export function macrosOf(items: [FoodKey, number][]): Macros {
  const sum = items.reduce(
    (m, [k, g]) => {
      const f = food(k);
      return { calories: m.calories + (f.kcal * g) / 100, proteinG: m.proteinG + (f.protein * g) / 100, carbsG: m.carbsG + (f.carbs * g) / 100, fatG: m.fatG + (f.fat * g) / 100 };
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  return { calories: Math.round(sum.calories), proteinG: Math.round(sum.proteinG), carbsG: Math.round(sum.carbsG), fatG: Math.round(sum.fatG) };
}

/** Grams that read well: by 5 under 30 g, by 10 above; an egg stays whole, a fruit whole or half. */
function roundGrams(k: FoodKey, g: number): number {
  const unit = food(k).unitG;
  if (unit && unit >= 50) {
    const step = unit < 80 ? unit : unit / 2;
    return Math.max(step, Math.round(g / step) * step);
  }
  return g < 30 ? Math.max(5, Math.round(g / 5) * 5) : Math.round(g / 10) * 10;
}

/**
 * A meal to the calories wanted: the foods that make it (not the oil and the
 * vegetables) go up or down together, from half to a bit over twice the portion.
 */
export function scaleMeal(meal: MealIdea, calories: number, [least, most]: [number, number]): [FoodKey, number][] {
  const fixed = new Set(meal.fixed ?? []);
  const fixedKcal = macrosOf(meal.items.filter(([k]) => fixed.has(k))).calories;
  const movingKcal = macrosOf(meal.items.filter(([k]) => !fixed.has(k))).calories;
  const factor = movingKcal > 0 ? Math.min(most, Math.max(least, (calories - fixedKcal) / movingKcal)) : 1;
  return meal.items.map(([k, g]) => [k, fixed.has(k) ? g : roundGrams(k, g * factor)]);
}


const share = (m: Macros) => ({
  protein: m.calories ? (m.proteinG * 4) / m.calories : 0,
  carbs: m.calories ? (m.carbsG * 4) / m.calories : 0,
});

/**
 * Meal ideas for a day: breakfast, lunch, a snack and dinner (or three meals),
 * sharing the day's calories, each brought to its share. Meals are chosen for
 * their protein close to the day's, with more carbohydrates on a hard day and
 * fewer on a rest day. `seed` changes the ideas from one day to the next;
 * `swaps` gives, for a slot, the next idea asked for.
 */
export function planDay(g: NutritionGuidance, input: {
  calories: number;
  protein: number;
  type: DayType;
  prefs: MealPrefs;
  seed: number;
  swaps?: Partial<Record<PlanSlot, number>>;
  /** The day's own targets, for one's sport: the calories as they are, and the carbohydrates to aim at. */
  day?: { calories: number; carbs: number };
}): DayPlan {
  // Without one's sport's day, the day of a sport-less athlete in the references.
  const calories = input.day ? input.day.calories : Math.round((input.calories * g.families.general.energy[input.type]) / 10) * 10;
  const proteinShare = Math.min(g.meals.proteinShareMax, (input.protein * 4) / Math.max(1, calories));
  // The day's carbohydrates: one's sport's, else what is left after protein and fat.
  const carbs = input.day ? input.day.carbs : Math.max(0, (calories - input.protein * 4 - calories * g.fat.share) / 4);
  const carbShare = (carbs * 4) / Math.max(1, calories);
  const meals: PlannedMeal[] = [];
  g.meals.split[String(input.prefs.meals) as "3" | "4"].forEach(([slot, part], i) => {
    const kind = slot === "breakfast" ? "breakfast" : slot === "snack" ? "snack" : "main";
    const taken = new Set(meals.map((m) => m.meal.id));
    const ranked = MEALS.filter((m) => m.slot === kind && suits(m, input.prefs) && !taken.has(m.id))
      .map((m) => {
        const s = share(macrosOf(m.items));
        // The meals closest to the day's shares of protein and carbohydrates.
        return { m, score: Math.abs(s.protein - proteinShare) + Math.abs(s.carbs - carbShare) };
      })
      .sort((a, b) => a.score - b.score || a.m.id.localeCompare(b.m.id));
    if (!ranked.length) return;
    const pool = ranked.slice(0, Math.min(6, ranked.length));
    const pick = pool[(input.seed + i * 3 + (input.swaps?.[slot] ?? 0)) % pool.length].m;
    const items = scaleMeal(pick, calories * part, g.meals.portionScale);
    meals.push({ slot, meal: pick, items, macros: macrosOf(items) });
  });
  const total = meals.reduce(
    (t, m) => ({ calories: t.calories + m.macros.calories, proteinG: t.proteinG + m.macros.proteinG, carbsG: t.carbsG + m.macros.carbsG, fatG: t.fatG + m.macros.fatG }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  return { type: input.type, calories, protein: input.protein, meals, total };
}

/** The kind of day from its sessions: a long or hard endurance one, any training, or rest. */
export function dayTypeOf(g: NutritionGuidance, sessions: { cardio?: { distanceKm?: number; durationMin?: number } | null; strength?: boolean }[]): DayType {
  if (!sessions.length) return "rest";
  const { distanceKm, minutes } = g.meals.longDay;
  const long = sessions.some((s) => (s.cardio?.distanceKm ?? 0) >= distanceKm || (s.cardio?.durationMin ?? 0) >= minutes);
  return long ? "long" : "training";
}

/** A number for the day, so the ideas change from one day to the next. */
export const daySeed = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
