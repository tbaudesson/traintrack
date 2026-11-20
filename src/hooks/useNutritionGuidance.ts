import { NUTRITION_GUIDANCE_KEY, parseGuidance, type NutritionGuidance } from "@/lib/sportNutrition";
import { useAppGuidance } from "./useAppGuidance";

/** The nutrition references the admin keeps; null until they have been read once. */
export const useNutritionGuidance = (): NutritionGuidance | null => useAppGuidance(NUTRITION_GUIDANCE_KEY, parseGuidance);
