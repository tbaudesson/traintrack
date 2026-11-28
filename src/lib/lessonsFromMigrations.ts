import { readFileSync } from "node:fs";
import { parseLessonsReference, type LessonsReference } from "./lessonsReference";

/** Tests only: what the migrations put in the app, read from their files. */
const sql = (file: string) => readFileSync(`supabase/migrations/${file}`, "utf8");
const unquote = (s: string) => s.replace(/''/g, "'");

/** The group lessons' reference as migration 092 first puts it: tennis, then vaulting. */
export function lessonsReferenceFromMigrations(): LessonsReference {
  const m = sql("092_group_lessons.sql").match(/jsonb_build_array\(\n\s*'(\{[\s\S]*?\})'::jsonb \|\| COALESCE[\s\S]*?,\n\s*'(\{[\s\S]*?\})'::jsonb\n\)\)/);
  if (!m) throw new Error("092: no reference");
  const parsed = parseLessonsReference(JSON.stringify({ sports: [JSON.parse(unquote(m[1])), JSON.parse(unquote(m[2]))] }));
  if (!parsed) throw new Error("092: the reference does not hold together");
  return parsed;
}

export interface LessonExerciseRow {
  name: string;
  nameFr: string;
  nameDe: string;
  sport: string;
  theme: string;
  minutes: number;
  ages: string[];
  gear: string[];
}

/** The library's lesson exercises: the tennis drills of 088 (moved by 092) and the vaulting exercises of 092. */
export function lessonExercisesFromMigrations(): LessonExerciseRow[] {
  const tennis = [...sql("088_tennis.sql").matchAll(/^INSERT INTO tennis_drills .*? VALUES \(NULL, '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', .*?, '([\w-]+)', (\d+), '(\[.*?\])'::jsonb, '(\[.*?\])'::jsonb\)/gm)].map((m) => ({
    name: unquote(m[1]),
    nameFr: unquote(m[2]),
    nameDe: unquote(m[3]),
    sport: "tennis",
    theme: m[4],
    minutes: Number(m[5]),
    ages: JSON.parse(m[6]),
    gear: JSON.parse(m[7]),
  }));
  const vaulting = [...sql("092_group_lessons.sql").matchAll(/^INSERT INTO exercises .*? SELECT NULL, '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', .*?, '(\w+)', '([\w-]+)', (\d+), '(\[.*?\])'::jsonb, '(\[.*?\])'::jsonb WHERE/gm)].map((m) => ({
    name: unquote(m[1]),
    nameFr: unquote(m[2]),
    nameDe: unquote(m[3]),
    sport: m[4],
    theme: m[5],
    minutes: Number(m[6]),
    ages: JSON.parse(m[7]),
    gear: JSON.parse(m[8]),
  }));
  return [...tennis, ...vaulting];
}
