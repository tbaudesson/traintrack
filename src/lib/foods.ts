/**
 * The foods and the meal ideas, kept by an admin (app_settings "foods" and
 * "meal_ideas", Admin > Foods and Meal ideas) rather than fixed in the code:
 * each food with its values per 100 g, its usual portion and what it holds
 * (meat, lactose…); the diets as the tags they leave out; the meal ideas as
 * foods and grams. One list serves the food search and the meal ideas.
 */

export const FOODS_KEY = "foods";
export const MEAL_IDEAS_KEY = "meal_ideas";

type Named = { id: string; fr: string; en: string; de: string };

/** What a food holds that a diet or an athlete may leave out; an excludable one is offered as "without". */
export interface FoodTag extends Named {
  excludable?: boolean;
}
/** A diet: the tags it leaves out (none for one who eats everything). */
export interface DietDef extends Named {
  bans: string[];
}
export interface FoodDef extends Named {
  /** Per 100 g. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** The usual portion, in grams. */
  serving: number;
  /** Weight of one piece (an egg, a banana), to say how many. */
  unitG?: number;
  tags: string[];
  /** Stays as it is when a meal's portion changes (oil, vegetables). */
  keepsPortion?: boolean;
}
export interface FoodsReference {
  tags: FoodTag[];
  diets: DietDef[];
  foods: FoodDef[];
}

export type MealSlot = "breakfast" | "main" | "snack";
export const MEAL_SLOTS: MealSlot[] = ["breakfast", "main", "snack"];
export interface MealIdea extends Named {
  slot: MealSlot;
  /** Grams of each food (its id), for the portion the meal is written for. */
  items: [string, number][];
}

/** What the meal ideas need: the foods and the diets, and the ideas. */
export type FoodCatalog = Pick<FoodsReference, "foods" | "diets"> & { meals: MealIdea[] };

export interface MealPrefs {
  /** An id of the diets; one no longer there leaves nothing out. */
  diet: string;
  /** Ids of the tags left out. */
  exclude: string[];
  /** 3: breakfast, lunch, dinner; 4: with a snack. */
  meals: 3 | 4;
}
/** Before any choice: the first diet of the list, nothing left out, four meals. */
export const DEFAULT_MEAL_PREFS: MealPrefs = { diet: "", exclude: [], meals: 4 };

const ID = /^[a-z0-9_-]{1,30}$/;
const named = (x: unknown): x is Named =>
  !!x && typeof x === "object" && typeof (x as Named).id === "string" && ID.test((x as Named).id) && (["fr", "en", "de"] as const).every((l) => typeof (x as Named)[l] === "string" && (x as Named)[l].trim().length > 0 && (x as Named)[l].length <= 80);
const unique = (list: Named[]) => new Set(list.map((x) => x.id)).size === list.length;
const amount = (n: unknown, max: number) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;

function json(text: string | null | undefined): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The foods, their tags and the diets, checked whole; null when anything is off. */
export function parseFoods(text: string | null | undefined): FoodsReference | null {
  const r = json(text) as FoodsReference | null;
  if (!r || typeof r !== "object" || !Array.isArray(r.tags) || !Array.isArray(r.diets) || !Array.isArray(r.foods)) return null;
  if (!r.tags.every(named) || !unique(r.tags) || r.tags.some((t) => t.excludable !== undefined && typeof t.excludable !== "boolean")) return null;
  const tags = new Set(r.tags.map((t) => t.id));
  if (!r.diets.length || !r.diets.every((d) => named(d) && Array.isArray(d.bans) && d.bans.every((b) => tags.has(b))) || !unique(r.diets)) return null;
  if (!r.foods.length || r.foods.length > 1000 || !unique(r.foods)) return null;
  for (const f of r.foods) {
    if (!named(f) || !amount(f.kcal, 900) || !amount(f.protein, 100) || !amount(f.carbs, 100) || !amount(f.fat, 100)) return null;
    if (!amount(f.serving, 2000) || f.serving <= 0 || (f.unitG !== undefined && (!amount(f.unitG, 2000) || f.unitG <= 0))) return null;
    if (!Array.isArray(f.tags) || !f.tags.every((t) => tags.has(t)) || (f.keepsPortion !== undefined && typeof f.keepsPortion !== "boolean")) return null;
  }
  return r;
}

/** The meal ideas, checked for their form (their foods are checked against the list when used). */
export function parseMealIdeas(text: string | null | undefined): MealIdea[] | null {
  const list = json(text) as MealIdea[] | null;
  if (!Array.isArray(list) || !list.length || list.length > 500 || !unique(list)) return null;
  for (const m of list) {
    if (!named(m) || !MEAL_SLOTS.includes(m.slot) || !Array.isArray(m.items) || !m.items.length || m.items.length > 20) return null;
    if (!m.items.every((i) => Array.isArray(i) && i.length === 2 && typeof i[0] === "string" && ID.test(i[0]) && amount(i[1], 2000) && i[1] > 0)) return null;
  }
  return list;
}

/** An item's name in the app's language; its id when it is no longer there. */
export function nameOf(list: readonly Named[] | null | undefined, id: string, locale: string): string {
  const x = list?.find((i) => i.id === id);
  if (!x) return id;
  return locale === "fr" ? x.fr : locale === "de" ? x.de : x.en;
}

/** The diet chosen, else the first of the list (before any choice, or once it is gone). */
export const dietOf = (diets: readonly DietDef[], id: string | undefined) => diets.find((d) => d.id === id) ?? diets[0];

/** A meal's foods, those the list still holds. */
const foodsOf = (c: Pick<FoodCatalog, "foods">, m: Pick<MealIdea, "items">) => m.items.flatMap(([id]) => c.foods.filter((f) => f.id === id));

/** The tags a meal carries, from its foods. */
export const mealTags = (c: Pick<FoodCatalog, "foods">, m: Pick<MealIdea, "items">) => new Set(foodsOf(c, m).flatMap((f) => f.tags));

/** Whether a meal can be offered: all its foods are in the list, and it suits the diet and what is left out. */
export function suits(c: Pick<FoodCatalog, "foods" | "diets">, m: Pick<MealIdea, "items">, prefs: Pick<MealPrefs, "diet" | "exclude">): boolean {
  if (foodsOf(c, m).length !== m.items.length) return false;
  const tags = mealTags(c, m);
  const banned = [...(dietOf(c.diets, prefs.diet)?.bans ?? []), ...prefs.exclude];
  return !banned.some((t) => tags.has(t));
}

/** A food as the food log takes it: its name in the app's language, its values per 100 g and its portion. */
export interface FoodItem {
  name: string;
  /** per 100 g */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** typical serving size in grams */
  serving: number;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** The foods whose name, in any of the three languages, holds the words typed; named in the app's language. */
export function searchFoods(foods: readonly FoodDef[] | null | undefined, query: string, locale: string, limit = 8): FoodItem[] {
  const q = fold(query.trim());
  if (!q) return [];
  const own = (f: FoodDef) => fold(nameOf([f], f.id, locale));
  return (foods ?? [])
    .filter((f) => [f.fr, f.en, f.de].some((n) => fold(n).includes(q)))
    // Those named so in the app's language first, then those starting with it.
    .sort((a, b) => Number(own(b).includes(q)) - Number(own(a).includes(q)) || Number(own(b).startsWith(q)) - Number(own(a).startsWith(q)))
    .slice(0, limit)
    .map((f) => ({ name: nameOf([f], f.id, locale), kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, serving: f.serving }));
}

export interface ScaledMacros {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Scale a food's per-100g macros to the given gram amount (rounded). */
export function scaleFood(food: FoodItem, grams: number): ScaledMacros {
  const f = grams / 100;
  return {
    name: food.name,
    calories: Math.round(food.kcal * f),
    proteinG: Math.round(food.protein * f),
    carbsG: Math.round(food.carbs * f),
    fatG: Math.round(food.fat * f),
  };
}
