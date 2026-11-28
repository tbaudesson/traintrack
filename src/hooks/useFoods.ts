import { useMemo } from "react";
import { FOODS_KEY, MEAL_IDEAS_KEY, parseFoods, parseMealIdeas, type FoodCatalog, type FoodsReference } from "@/lib/foods";
import { useAppGuidance } from "./useAppGuidance";

/** The foods, their tags and the diets, as the admin keeps them; null until read once. */
export const useFoods = (): FoodsReference | null => useAppGuidance(FOODS_KEY, parseFoods);

/** What the meal ideas are made of: the foods and diets, and the ideas; null until both are read. */
export function useFoodCatalog(): (FoodCatalog & Pick<FoodsReference, "tags">) | null {
  const foods = useFoods();
  const meals = useAppGuidance(MEAL_IDEAS_KEY, parseMealIdeas);
  return useMemo(() => (foods && meals ? { ...foods, meals } : null), [foods, meals]);
}
