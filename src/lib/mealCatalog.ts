/**
 * Simple meals to suggest, made of everyday foods with approximate values
 * (per 100 g). Names are translated in the "food" and "meals" messages, by
 * key. A starting point, not a prescription.
 */

export type FoodTag = "meat" | "pork" | "fish" | "egg" | "lactose" | "gluten" | "nuts" | "soy" | "honey";

export interface Ingredient {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tags?: FoodTag[];
  /** Weight of one piece (an egg, a banana), to say how many. */
  unitG?: number;
}

export const INGREDIENTS = {
  oats: { kcal: 389, protein: 17, carbs: 66, fat: 7, tags: ["gluten"] },
  milk: { kcal: 47, protein: 3.4, carbs: 4.9, fat: 1.6, tags: ["lactose"] },
  soyDrink: { kcal: 33, protein: 3.3, carbs: 0.6, fat: 1.8, tags: ["soy"] },
  greekYogurt: { kcal: 59, protein: 10, carbs: 3.6, fat: 0.4, tags: ["lactose"] },
  skyr: { kcal: 63, protein: 11, carbs: 4, fat: 0.2, tags: ["lactose"] },
  cottage: { kcal: 98, protein: 11, carbs: 3.4, fat: 4.3, tags: ["lactose"] },
  egg: { kcal: 155, protein: 13, carbs: 1.1, fat: 11, tags: ["egg"], unitG: 55 },
  bread: { kcal: 247, protein: 13, carbs: 41, fat: 3.4, tags: ["gluten"] },
  wrap: { kcal: 310, protein: 8, carbs: 52, fat: 7.5, tags: ["gluten"], unitG: 60 },
  riceCakes: { kcal: 387, protein: 8, carbs: 81, fat: 3, unitG: 9 },
  banana: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, unitG: 120 },
  berries: { kcal: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  apple: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, unitG: 150 },
  dates: { kcal: 282, protein: 2.5, carbs: 75, fat: 0.4, unitG: 8 },
  honey: { kcal: 304, protein: 0.3, carbs: 82, fat: 0, tags: ["honey"] },
  peanutButter: { kcal: 588, protein: 25, carbs: 20, fat: 50, tags: ["nuts"] },
  almonds: { kcal: 579, protein: 21, carbs: 22, fat: 50, tags: ["nuts"] },
  walnuts: { kcal: 654, protein: 15, carbs: 14, fat: 65, tags: ["nuts"] },
  chicken: { kcal: 165, protein: 31, carbs: 0, fat: 3.6, tags: ["meat"] },
  turkey: { kcal: 135, protein: 29, carbs: 0, fat: 1.7, tags: ["meat"] },
  beef: { kcal: 215, protein: 26, carbs: 0, fat: 12, tags: ["meat"] },
  pork: { kcal: 143, protein: 26, carbs: 0, fat: 3.5, tags: ["meat", "pork"] },
  ham: { kcal: 107, protein: 18, carbs: 1, fat: 3.5, tags: ["meat", "pork"] },
  salmon: { kcal: 208, protein: 20, carbs: 0, fat: 13, tags: ["fish"] },
  tuna: { kcal: 116, protein: 26, carbs: 0, fat: 1, tags: ["fish"] },
  whiteFish: { kcal: 82, protein: 18, carbs: 0, fat: 0.7, tags: ["fish"] },
  shrimp: { kcal: 99, protein: 24, carbs: 0.2, fat: 0.3, tags: ["fish"] },
  tofu: { kcal: 144, protein: 17, carbs: 3, fat: 9, tags: ["soy"] },
  tempeh: { kcal: 192, protein: 20, carbs: 8, fat: 11, tags: ["soy"] },
  lentils: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  chickpeas: { kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  blackBeans: { kcal: 132, protein: 8.9, carbs: 24, fat: 0.5 },
  rice: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  pasta: { kcal: 158, protein: 6, carbs: 31, fat: 0.9, tags: ["gluten"] },
  couscous: { kcal: 112, protein: 3.8, carbs: 23, fat: 0.2, tags: ["gluten"] },
  potato: { kcal: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  sweetPotato: { kcal: 90, protein: 2, carbs: 21, fat: 0.2 },
  quinoa: { kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  broccoli: { kcal: 35, protein: 2.4, carbs: 7, fat: 0.4 },
  greenBeans: { kcal: 31, protein: 1.8, carbs: 7, fat: 0.1 },
  spinach: { kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  salad: { kcal: 17, protein: 1.2, carbs: 3.3, fat: 0.2 },
  tomato: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  mixedVeg: { kcal: 40, protein: 1.5, carbs: 7, fat: 0.5 },
  oliveOil: { kcal: 884, protein: 0, carbs: 0, fat: 100 },
  avocado: { kcal: 160, protein: 2, carbs: 9, fat: 15 },
  feta: { kcal: 264, protein: 14, carbs: 4, fat: 21, tags: ["lactose"] },
  mozzarella: { kcal: 250, protein: 18, carbs: 2, fat: 19, tags: ["lactose"] },
  parmesan: { kcal: 431, protein: 38, carbs: 4, fat: 29, tags: ["lactose"] },
  hummus: { kcal: 166, protein: 8, carbs: 14, fat: 10 },
  whey: { kcal: 400, protein: 80, carbs: 8, fat: 6, tags: ["lactose"] },
  veganProtein: { kcal: 380, protein: 75, carbs: 8, fat: 6, tags: ["soy"] },
} satisfies Record<string, Ingredient>;

export type FoodKey = keyof typeof INGREDIENTS;
export type MealSlot = "breakfast" | "main" | "snack";

export interface MealIdea {
  id: string;
  slot: MealSlot;
  /** Grams of each food, for the portion the meal is written for. */
  items: [FoodKey, number][];
  /** Foods that stay as they are when the portion changes (oil, vegetables). */
  fixed?: FoodKey[];
}

const meal = (id: string, slot: MealSlot, items: [FoodKey, number][], fixed: FoodKey[] = []): MealIdea => ({ id, slot, items, fixed });
const VEG: FoodKey[] = ["broccoli", "greenBeans", "spinach", "salad", "tomato", "mixedVeg"];

export const MEALS: MealIdea[] = [
  // Breakfasts
  meal("porridge", "breakfast", [["oats", 60], ["milk", 250], ["banana", 100], ["honey", 10]]),
  meal("porridgeVegan", "breakfast", [["oats", 60], ["soyDrink", 250], ["berries", 100], ["almonds", 15]]),
  meal("skyrBowl", "breakfast", [["skyr", 200], ["berries", 100], ["oats", 40], ["honey", 10]]),
  meal("eggsToast", "breakfast", [["egg", 110], ["bread", 70], ["tomato", 100], ["oliveOil", 5]], ["tomato"]),
  meal("pbToast", "breakfast", [["bread", 80], ["peanutButter", 25], ["banana", 120]]),
  meal("tofuScramble", "breakfast", [["tofu", 150], ["bread", 60], ["spinach", 60], ["oliveOil", 5]], ["spinach"]),
  meal("yogurtNuts", "breakfast", [["greekYogurt", 250], ["apple", 150], ["walnuts", 20], ["oats", 30]]),
  meal("eggsAvocado", "breakfast", [["egg", 165], ["avocado", 70], ["tomato", 100], ["riceCakes", 27]], ["tomato"]),
  meal("smoothie", "breakfast", [["milk", 250], ["banana", 120], ["whey", 30], ["oats", 30]]),
  meal("veganSmoothie", "breakfast", [["soyDrink", 300], ["banana", 120], ["veganProtein", 25], ["berries", 100]]),
  meal("riceCakesPb", "breakfast", [["riceCakes", 36], ["peanutButter", 25], ["banana", 120], ["soyDrink", 200]]),
  // Lunches and dinners
  meal("chickenRice", "main", [["chicken", 150], ["rice", 200], ["broccoli", 150], ["oliveOil", 10]]),
  meal("salmonPotatoes", "main", [["salmon", 150], ["potato", 250], ["greenBeans", 150], ["oliveOil", 5]]),
  meal("bolognese", "main", [["beef", 120], ["pasta", 220], ["tomato", 150], ["parmesan", 10], ["oliveOil", 5]]),
  meal("tunaPasta", "main", [["tuna", 120], ["pasta", 200], ["tomato", 100], ["salad", 50], ["oliveOil", 10]]),
  meal("lentilCurry", "main", [["lentils", 250], ["rice", 150], ["spinach", 100], ["oliveOil", 10]]),
  meal("buddhaBowl", "main", [["chickpeas", 200], ["quinoa", 150], ["avocado", 50], ["salad", 50], ["tomato", 100], ["oliveOil", 5]]),
  meal("tofuStirFry", "main", [["tofu", 200], ["rice", 200], ["mixedVeg", 200], ["oliveOil", 10]]),
  meal("turkeyWrap", "main", [["turkey", 120], ["wrap", 120], ["salad", 50], ["tomato", 80], ["hummus", 30]]),
  meal("codSweetPotato", "main", [["whiteFish", 180], ["sweetPotato", 250], ["broccoli", 150], ["oliveOil", 10]]),
  meal("porkPotatoes", "main", [["pork", 150], ["potato", 250], ["mixedVeg", 200], ["oliveOil", 10]]),
  meal("shrimpQuinoa", "main", [["shrimp", 150], ["quinoa", 180], ["mixedVeg", 150], ["oliveOil", 10]]),
  meal("omelettePotatoes", "main", [["egg", 165], ["potato", 200], ["salad", 80], ["oliveOil", 5]]),
  meal("chiliSinCarne", "main", [["blackBeans", 200], ["rice", 150], ["tomato", 150], ["avocado", 40]]),
  meal("chickenCouscous", "main", [["chicken", 140], ["couscous", 200], ["mixedVeg", 200], ["oliveOil", 10]]),
  meal("greekSalad", "main", [["feta", 80], ["chickpeas", 120], ["tomato", 150], ["salad", 80], ["bread", 60], ["oliveOil", 10]]),
  meal("beefPotatoSalad", "main", [["beef", 140], ["potato", 250], ["salad", 80], ["oliveOil", 5]]),
  meal("salmonBowl", "main", [["salmon", 140], ["rice", 200], ["avocado", 40], ["spinach", 60]]),
  meal("tempehBowl", "main", [["tempeh", 150], ["quinoa", 180], ["broccoli", 150], ["oliveOil", 5]]),
  meal("pestoChicken", "main", [["chicken", 120], ["pasta", 200], ["spinach", 80], ["parmesan", 15], ["oliveOil", 10]]),
  meal("caprese", "main", [["mozzarella", 125], ["pasta", 200], ["tomato", 150], ["oliveOil", 10]]),
  meal("hamPotatoes", "main", [["ham", 100], ["potato", 250], ["greenBeans", 150], ["oliveOil", 5]]),
  meal("lentilSalad", "main", [["lentils", 200], ["egg", 110], ["tomato", 100], ["salad", 50], ["oliveOil", 10]]),
  // Snacks
  meal("yogurtHoney", "snack", [["greekYogurt", 200], ["honey", 15]]),
  meal("bananaPb", "snack", [["banana", 120], ["peanutButter", 20]]),
  meal("riceCakesHummus", "snack", [["riceCakes", 27], ["hummus", 60]]),
  meal("shake", "snack", [["whey", 30], ["milk", 250]]),
  meal("cottageBerries", "snack", [["cottage", 150], ["berries", 100]]),
  meal("appleAlmonds", "snack", [["apple", 150], ["almonds", 25]]),
  meal("datesSoy", "snack", [["dates", 40], ["soyDrink", 250]]),
  meal("veganShake", "snack", [["veganProtein", 30], ["soyDrink", 250], ["banana", 100]]),
  meal("eggsBread", "snack", [["egg", 110], ["bread", 40]]),
].map((m) => ({ ...m, fixed: [...new Set([...(m.fixed ?? []), ...m.items.map(([k]) => k).filter((k) => VEG.includes(k))])] }));

export type Diet = "omnivore" | "pescetarian" | "vegetarian" | "vegan";
export type Exclusion = "lactose" | "gluten" | "pork" | "fish" | "nuts" | "egg" | "soy";
export const DIETS: Diet[] = ["omnivore", "pescetarian", "vegetarian", "vegan"];
export const EXCLUSIONS: Exclusion[] = ["lactose", "gluten", "pork", "fish", "nuts", "egg", "soy"];

export interface MealPrefs {
  diet: Diet;
  exclude: Exclusion[];
  /** 3: breakfast, lunch, dinner; 4: with a snack. */
  meals: 3 | 4;
}

export const DEFAULT_MEAL_PREFS: MealPrefs = { diet: "omnivore", exclude: [], meals: 4 };

/** The tags a meal carries, from its foods. */
export const mealTags = (m: MealIdea) => new Set(m.items.flatMap(([k]) => (INGREDIENTS[k] as Ingredient).tags ?? []));

/** Whether a meal suits a diet and the foods left out. */
export function suits(m: MealIdea, prefs: Pick<MealPrefs, "diet" | "exclude">): boolean {
  const tags = mealTags(m);
  const banned: FoodTag[] = [
    ...(prefs.diet === "pescetarian" ? (["meat"] as FoodTag[]) : []),
    ...(prefs.diet === "vegetarian" ? (["meat", "fish"] as FoodTag[]) : []),
    ...(prefs.diet === "vegan" ? (["meat", "fish", "egg", "lactose", "honey"] as FoodTag[]) : []),
    ...prefs.exclude,
  ];
  return !banned.some((t) => tags.has(t));
}
