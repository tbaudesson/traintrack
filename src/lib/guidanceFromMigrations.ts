import { readFileSync } from "node:fs";
import { parseGuidance, type NutritionGuidance } from "./sportNutrition";

/**
 * For the tests only: the nutrition references as the migrations leave them
 * (056 seeds them, 057 adds the calculator and the meals), so the tests read
 * the very data the app does and no figure is copied into them.
 */
export function guidanceFromMigrations(): NutritionGuidance {
  const json = (file: string) => {
    const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
    return JSON.parse(sql.slice(sql.indexOf("{"), sql.lastIndexOf("}") + 1));
  };
  const g = parseGuidance(JSON.stringify({ ...json("056_nutrition_guidance.sql"), ...json("057_nutrition_targets_guidance.sql") }));
  if (!g) throw new Error("The nutrition references of the migrations do not hold together");
  return g;
}
