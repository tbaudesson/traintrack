/**
 * A small built-in food database so users can pick common foods (with known
 * macros) instead of typing every number. All values are per 100 g.
 * `serving` is a sensible default portion in grams.
 */

export interface FoodItem {
  name: string;
  /** per 100 g */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** typical serving size in grams */
  serving: number;
  /** rough category, for grouping/filtering */
  cat: "protein" | "carb" | "fat" | "veg" | "fruit" | "dairy" | "drink" | "snack";
}

export const FOOD_CATALOG: FoodItem[] = [
  // Protein
  { name: "Chicken breast (cooked)", kcal: 165, protein: 31, carbs: 0, fat: 3.6, serving: 150, cat: "protein" },
  { name: "Chicken thigh (cooked)", kcal: 209, protein: 26, carbs: 0, fat: 11, serving: 150, cat: "protein" },
  { name: "Lean beef mince (cooked)", kcal: 215, protein: 26, carbs: 0, fat: 12, serving: 150, cat: "protein" },
  { name: "Salmon (cooked)", kcal: 208, protein: 20, carbs: 0, fat: 13, serving: 150, cat: "protein" },
  { name: "Tuna (canned in water)", kcal: 116, protein: 26, carbs: 0, fat: 1, serving: 100, cat: "protein" },
  { name: "Whole egg", kcal: 155, protein: 13, carbs: 1.1, fat: 11, serving: 50, cat: "protein" },
  { name: "Egg white", kcal: 52, protein: 11, carbs: 0.7, fat: 0.2, serving: 33, cat: "protein" },
  { name: "Pork tenderloin (cooked)", kcal: 143, protein: 26, carbs: 0, fat: 3.5, serving: 150, cat: "protein" },
  { name: "Shrimp (cooked)", kcal: 99, protein: 24, carbs: 0.2, fat: 0.3, serving: 120, cat: "protein" },
  { name: "Tofu (firm)", kcal: 144, protein: 17, carbs: 3, fat: 9, serving: 150, cat: "protein" },
  { name: "Tempeh", kcal: 192, protein: 20, carbs: 8, fat: 11, serving: 100, cat: "protein" },
  { name: "Whey protein powder", kcal: 400, protein: 80, carbs: 8, fat: 6, serving: 30, cat: "protein" },
  // Carbs
  { name: "White rice (cooked)", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, serving: 200, cat: "carb" },
  { name: "Brown rice (cooked)", kcal: 123, protein: 2.7, carbs: 26, fat: 1, serving: 200, cat: "carb" },
  { name: "Pasta (cooked)", kcal: 158, protein: 6, carbs: 31, fat: 0.9, serving: 200, cat: "carb" },
  { name: "Potato (boiled)", kcal: 87, protein: 1.9, carbs: 20, fat: 0.1, serving: 200, cat: "carb" },
  { name: "Sweet potato (baked)", kcal: 90, protein: 2, carbs: 21, fat: 0.2, serving: 200, cat: "carb" },
  { name: "Oats (dry)", kcal: 389, protein: 17, carbs: 66, fat: 7, serving: 50, cat: "carb" },
  { name: "Bread (white)", kcal: 265, protein: 9, carbs: 49, fat: 3.2, serving: 40, cat: "carb" },
  { name: "Bread (wholemeal)", kcal: 247, protein: 13, carbs: 41, fat: 3.4, serving: 40, cat: "carb" },
  { name: "Quinoa (cooked)", kcal: 120, protein: 4.4, carbs: 21, fat: 1.9, serving: 185, cat: "carb" },
  { name: "Cornflakes", kcal: 357, protein: 7, carbs: 84, fat: 0.4, serving: 40, cat: "carb" },
  // Legumes
  { name: "Black beans (cooked)", kcal: 132, protein: 8.9, carbs: 24, fat: 0.5, serving: 150, cat: "carb" },
  { name: "Chickpeas (cooked)", kcal: 164, protein: 8.9, carbs: 27, fat: 2.6, serving: 150, cat: "carb" },
  { name: "Lentils (cooked)", kcal: 116, protein: 9, carbs: 20, fat: 0.4, serving: 150, cat: "carb" },
  // Dairy
  { name: "Greek yogurt (0%)", kcal: 59, protein: 10, carbs: 3.6, fat: 0.4, serving: 170, cat: "dairy" },
  { name: "Greek yogurt (full fat)", kcal: 97, protein: 9, carbs: 4, fat: 5, serving: 170, cat: "dairy" },
  { name: "Cottage cheese", kcal: 98, protein: 11, carbs: 3.4, fat: 4.3, serving: 150, cat: "dairy" },
  { name: "Milk (whole)", kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, serving: 250, cat: "dairy" },
  { name: "Milk (skimmed)", kcal: 34, protein: 3.4, carbs: 5, fat: 0.1, serving: 250, cat: "dairy" },
  { name: "Cheddar cheese", kcal: 402, protein: 25, carbs: 1.3, fat: 33, serving: 30, cat: "dairy" },
  { name: "Mozzarella", kcal: 280, protein: 28, carbs: 3.1, fat: 17, serving: 30, cat: "dairy" },
  // Fats / nuts
  { name: "Almonds", kcal: 579, protein: 21, carbs: 22, fat: 50, serving: 30, cat: "fat" },
  { name: "Peanut butter", kcal: 588, protein: 25, carbs: 20, fat: 50, serving: 32, cat: "fat" },
  { name: "Walnuts", kcal: 654, protein: 15, carbs: 14, fat: 65, serving: 30, cat: "fat" },
  { name: "Olive oil", kcal: 884, protein: 0, carbs: 0, fat: 100, serving: 14, cat: "fat" },
  { name: "Avocado", kcal: 160, protein: 2, carbs: 9, fat: 15, serving: 100, cat: "fat" },
  // Veg
  { name: "Broccoli (cooked)", kcal: 35, protein: 2.4, carbs: 7, fat: 0.4, serving: 150, cat: "veg" },
  { name: "Spinach", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, serving: 100, cat: "veg" },
  { name: "Mixed salad", kcal: 17, protein: 1.2, carbs: 3.3, fat: 0.2, serving: 100, cat: "veg" },
  { name: "Carrot", kcal: 41, protein: 0.9, carbs: 10, fat: 0.2, serving: 80, cat: "veg" },
  { name: "Tomato", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, serving: 100, cat: "veg" },
  // Fruit
  { name: "Banana", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, serving: 120, cat: "fruit" },
  { name: "Apple", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, serving: 150, cat: "fruit" },
  { name: "Blueberries", kcal: 57, protein: 0.7, carbs: 14, fat: 0.3, serving: 100, cat: "fruit" },
  { name: "Orange", kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, serving: 130, cat: "fruit" },
  { name: "Strawberries", kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3, serving: 100, cat: "fruit" },
  // Snacks / misc
  { name: "Dark chocolate (70%)", kcal: 598, protein: 7.8, carbs: 46, fat: 43, serving: 25, cat: "snack" },
  { name: "Protein bar", kcal: 350, protein: 30, carbs: 35, fat: 9, serving: 60, cat: "snack" },
  { name: "Honey", kcal: 304, protein: 0.3, carbs: 82, fat: 0, serving: 21, cat: "snack" },
];

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

/** Case-insensitive substring search, capped. */
export function searchFoods(query: string, limit = 8): FoodItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return FOOD_CATALOG.filter((f) => f.name.toLowerCase().includes(q)).slice(0, limit);
}
