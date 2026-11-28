import { readFileSync } from "node:fs";

/** An app setting as a migration first puts it (tests only): the text of `VALUES ('key', '…') ON CONFLICT`. */
export function settingFromMigrations(file: string, key: string): string {
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
  const m = sql.match(new RegExp(`VALUES \\('${key}', '([\\s\\S]*?)'\\) ON CONFLICT`));
  if (!m) throw new Error(`${file}: no ${key}`);
  return m[1].replace(/''/g, "'");
}

/** What a later migration adds to an app setting (tests only): the object of `value::jsonb || '{…}'::jsonb … WHERE key = 'key'`. */
export function patchFromMigrations(file: string, key: string): Record<string, unknown> {
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
  const m = sql.match(new RegExp(`value::jsonb \\|\\| '((?:[^']|'')*)'::jsonb\\)::text\\s*WHERE key = '${key}'`));
  if (!m) throw new Error(`${file}: no patch of ${key}`);
  return JSON.parse(m[1].replace(/''/g, "'"));
}

/** An app setting as its first migration puts it, with what later ones add. */
export function settingWithPatches(file: string, key: string, patches: string[]): string {
  const base = JSON.parse(readSetting(file, key));
  return JSON.stringify(Object.assign(base, ...patches.map((p) => patchFromMigrations(p, key))));
}
const readSetting = (file: string, key: string) => {
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
  const start = sql.indexOf(`'${key}', '`) + key.length + 5;
  return sql.slice(start, sql.indexOf("')\nON CONFLICT", start)).replace(/''/g, "'");
};

/**
 * The list of equipment as migration 093 puts it, kept "on the device" for
 * code that reads it there (load steps, bars, warm-up sets).
 */
export function equipmentOnDeviceForTests(stub: (name: string, value: unknown) => void): void {
  const text = settingFromMigrations("093_lists.sql", "equipment");
  stub("localStorage", { getItem: (k: string) => (k === "traintrack.guidance.equipment" ? text : null), setItem: () => {}, removeItem: () => {} });
}
