import { readFileSync } from "node:fs";
import { parseInjuryGuidance, type InjuryGuidance } from "./injuryGuidance";
import { MOBILITY_EXERCISES } from "./mobility";

/** For the tests only: the injury references as migration 058 seeds them, the very data the app reads. */
export function injuryGuidanceFromMigrations(): InjuryGuidance {
  const sql = readFileSync("supabase/migrations/058_injury_guidance.sql", "utf8");
  const g = parseInjuryGuidance(sql.slice(sql.indexOf("{"), sql.lastIndexOf("}") + 1), MOBILITY_EXERCISES.map((e) => e.key));
  if (!g) throw new Error("The injury references of migration 058 do not hold together");
  return g;
}
