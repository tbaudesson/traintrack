import { readFileSync } from "node:fs";

/** An app setting as a migration first puts it (tests only): the text of `VALUES ('key', '…') ON CONFLICT`. */
export function settingFromMigrations(file: string, key: string): string {
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
  const m = sql.match(new RegExp(`VALUES \\('${key}', '([\\s\\S]*?)'\\) ON CONFLICT`));
  if (!m) throw new Error(`${file}: no ${key}`);
  return m[1].replace(/''/g, "'");
}

/**
 * The list of equipment as migration 093 puts it, kept "on the device" for
 * code that reads it there (load steps, bars, warm-up sets).
 */
export function equipmentOnDeviceForTests(stub: (name: string, value: unknown) => void): void {
  const text = settingFromMigrations("093_lists.sql", "equipment");
  stub("localStorage", { getItem: (k: string) => (k === "traintrack.guidance.equipment" ? text : null), setItem: () => {}, removeItem: () => {} });
}
