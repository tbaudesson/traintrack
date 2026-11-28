import { readFileSync } from "node:fs";
import { parseLevels, type LevelsReference } from "./levels";

/** For the tests only: the levels as migration 099 seeds them, so no figure is copied into the tests. */
export function levelsForTests(): LevelsReference {
  const sql = readFileSync("supabase/migrations/099_levels.sql", "utf8");
  const ref = parseLevels(sql.match(/VALUES \('levels', '([\s\S]*?)'\) ON CONFLICT/)![1].replace(/''/g, "'"));
  if (!ref) throw new Error("The levels of migration 099 do not hold together");
  return ref;
}
