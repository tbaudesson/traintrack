import { readFileSync } from "node:fs";
import { parseInjuryGuidance, type InjuryGuidance } from "./injuryGuidance";
import type { ExerciseRules, InjuryRules } from "./injuries";
import { MOBILITY_EXERCISES } from "./mobility";

const sql = (file: string) => readFileSync(`supabase/migrations/${file}`, "utf8");

/**
 * For the tests only: the injury references as migrations 058 and 059 leave
 * them (059 adds the warm-up and stretch rules), the very data the app reads.
 */
export function injuryGuidanceFromMigrations(): InjuryGuidance {
  const seed = sql("058_injury_guidance.sql");
  const base = JSON.parse(seed.slice(seed.indexOf("{"), seed.lastIndexOf("}") + 1));
  const rules = sql("059_exercise_injury_rules.sql");
  const tail = rules.slice(rules.indexOf("UPDATE app_settings"));
  const added = JSON.parse(tail.slice(tail.indexOf("{"), tail.lastIndexOf("}") + 1));
  const g = parseInjuryGuidance(JSON.stringify({ ...base, ...added }), MOBILITY_EXERCISES.map((e) => e.key));
  if (!g) throw new Error("The injury references of migrations 058 and 059 do not hold together");
  return g;
}

/** For the tests only: what each library exercise loads, as migration 059 fills it. */
export function injuryRulesFromMigrations(): InjuryRules {
  const out: InjuryRules = {};
  for (const m of sql("059_exercise_injury_rules.sql").matchAll(/SET injury_rules = '(.+?)'::jsonb, updated_at = now\(\) WHERE user_id IS NULL AND name = '((?:[^']|'')+)'/g)) {
    out[m[2].replace(/''/g, "'")] = JSON.parse(m[1].replace(/''/g, "'")) as ExerciseRules;
  }
  return out;
}
