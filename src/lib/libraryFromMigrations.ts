import { readFileSync } from "node:fs";
import type { Equipment, Exercise, MuscleGroup } from "@/db";
import { injuryRulesFromMigrations } from "./injuryGuidanceFromMigrations";

/**
 * For the tests only: the exercise library as the migrations leave it, the
 * very rows the app syncs (names, muscle group, equipment, descriptions and
 * their translations, videos, injury rules), so no list of them lives in the
 * app's code or the tests.
 */
const sql = (file: string) => readFileSync(`supabase/migrations/${file}`, "utf8");

/** The SQL string literals and NULLs of a tuple, in order. */
function values(tuple: string): (string | null)[] {
  const out: (string | null)[] = [];
  const re = /'((?:[^']|'')*)'|\bNULL\b/g;
  for (const m of tuple.matchAll(re)) out.push(m[1] === undefined ? null : m[1].replace(/''/g, "'"));
  return out;
}

type Row = Pick<Exercise, "name" | "muscleGroup" | "equipment" | "description" | "nameFr" | "nameDe" | "descriptionFr" | "descriptionDe" | "videoUrl" | "injuryRules">;

export function libraryFromMigrations(): Row[] {
  const rows = new Map<string, Row>();
  const add = (v: (string | null)[]) => {
    const [name, muscleGroup, equipment, description, nameFr, nameDe, descriptionFr, descriptionDe] = v;
    if (!name || rows.has(name)) return;
    rows.set(name, {
      name,
      muscleGroup: muscleGroup as MuscleGroup,
      equipment: (equipment ?? undefined) as Equipment | undefined,
      description: description ?? undefined,
      nameFr: nameFr ?? null,
      nameDe: nameDe ?? null,
      descriptionFr: descriptionFr ?? null,
      descriptionDe: descriptionDe ?? null,
    });
  };
  // Seeds as VALUES lists: one tuple per line.
  for (const file of ["006_seed_exercises.sql", "024_endurance.sql", "038_interval_sessions.sql", "040_vaulting.sql", "053_more_timed_exercises.sql"]) {
    // Only the tuples of an INSERT INTO exercises, up to its "AS v(…)".
    let inExercises = false;
    for (const line of sql(file).split("\n")) {
      if (line.startsWith("INSERT INTO exercises")) inExercises = true;
      else if (/^\) AS v\(/.test(line)) inExercises = false;
      else if (inExercises && /^\s+\('/.test(line)) add(values(line));
    }
  }
  // Seeds as one INSERT per exercise (TRX).
  for (const m of sql("055_trx.sql").matchAll(/SELECT NULL, (.+?), false, (.+)\nWHERE NOT EXISTS \(SELECT 1 FROM exercises/g)) {
    const [name, group, equipment] = values(m[1]);
    add([name, group, equipment, ...values(m[2])]);
  }
  // Translations, descriptions and videos filled where empty (064).
  for (const line of sql("064_exercise_content.sql").split("\n")) {
    if (!line.startsWith("UPDATE exercises SET name_fr")) continue;
    const name = values(line.slice(line.indexOf("AND name =")))[0];
    const row = name ? rows.get(name) : undefined;
    if (!row) continue;
    const pick = (col: string) => {
      const m = line.match(new RegExp(`${col} = COALESCE\\(${col}, ('(?:[^']|'')*'|NULL)\\)`));
      return m && m[1] !== "NULL" ? m[1].slice(1, -1).replace(/''/g, "'") : null;
    };
    row.nameFr ??= pick("name_fr");
    row.nameDe ??= pick("name_de");
    row.descriptionFr ??= pick("description_fr");
    row.descriptionDe ??= pick("description_de");
    row.videoUrl ??= pick("video_url") ?? undefined;
  }
  const rules = injuryRulesFromMigrations();
  for (const row of rows.values()) row.injuryRules = rules[row.name] ?? null;
  return [...rows.values()];
}
