import { readFileSync } from "node:fs";
import { parseTimed, type TimedGuidance } from "./intervals";
import { parseProgramEquipment, type ProgramEquipmentGuide } from "./programEquipment";
import { parseInjuryGuidance, type InjuryGuidance } from "./injuryGuidance";
import type { ExerciseRules, InjuryRules } from "./injuries";
import { parseMobility, type MobilityGuidance } from "./mobility";

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
  const g = parseInjuryGuidance(JSON.stringify({ ...base, ...added }), mobilityFromMigrations().moves.map((e) => e.key));
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

/** For the tests only: the warm-ups and stretches as migration 065 seeds them. */
export function mobilityFromMigrations(): MobilityGuidance {
  const text = sql("065_mobility_and_timed_sessions.sql");
  const block = text.slice(text.indexOf("'mobility_moves', '") + 19, text.indexOf("')\nON CONFLICT"));
  const g = parseMobility(block.replace(/''/g, "'"));
  if (!g) throw new Error("The warm-ups of migration 065 do not hold together");
  return g;
}

/** For the tests only: what timed sessions are built from, as migration 065 seeds it. */
export function timedFromMigrations(): TimedGuidance {
  const text = sql("065_mobility_and_timed_sessions.sql");
  const start = text.indexOf("'timed_sessions', '") + 19;
  const g = parseTimed(text.slice(start, text.indexOf("')\nON CONFLICT", start)).replace(/''/g, "'"));
  if (!g) throw new Error("The timed sessions of migration 065 do not hold together");
  return g;
}

/** For the tests only: what the ready-made programs need, as migration 066 seeds it. */
export function programEquipmentFromMigrations(): ProgramEquipmentGuide {
  const text = sql("066_program_equipment.sql");
  const start = text.indexOf("'program_equipment', '") + 22;
  const g = parseProgramEquipment(text.slice(start, text.indexOf("')\nON CONFLICT", start)).replace(/''/g, "'"));
  if (!g) throw new Error("The equipment reference of migration 066 does not hold together");
  return g;
}
