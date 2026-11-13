import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { PROGRAM_TEMPLATES } from "./programTemplates";

// A name missing from the library would create a stray custom exercise for
// every user who starts the program.
const library =
  readFileSync("supabase/migrations/006_seed_exercises.sql", "utf8") +
  readFileSync("supabase/migrations/024_endurance.sql", "utf8");

describe("built-in programs", () => {
  it("only use exercises from the seeded library", () => {
    const missing = PROGRAM_TEMPLATES.flatMap((t) => t.structure.flatMap((d) => d.exercises.map((e) => e.exerciseName)))
      .filter((name) => !library.includes(`'${name}'`));
    expect([...new Set(missing)]).toEqual([]);
  });
});

describe("strength programs in every language", () => {
  const strength = PROGRAM_TEMPLATES.filter((t) => t.goal !== "endurance");
  const byLocale = (locale: string) => strength.filter((t) => t.locale === locale);

  it("offer all fourteen in French, English and German", () => {
    for (const locale of ["fr", "en", "de"]) expect(byLocale(locale)).toHaveLength(14);
  });

  it("keep the same exercises, with a name for every day", () => {
    const exercises = (locale: string) => byLocale(locale).map((t) => t.structure.map((d) => d.exercises));
    expect(exercises("en")).toEqual(exercises("fr"));
    expect(exercises("de")).toEqual(exercises("fr"));
    expect(strength.flatMap((t) => t.structure).filter((d) => !d.name)).toEqual([]);
  });

  it("give every program a different name within a language", () => {
    for (const locale of ["fr", "en", "de"]) {
      const names = PROGRAM_TEMPLATES.filter((t) => t.locale === locale).map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("circuits", () => {
  it("chain every exercise of a circuit day, in every language", () => {
    const circuits = PROGRAM_TEMPLATES.filter((t) => t.id.startsWith("fatloss-fullbody-3") || t.id.startsWith("seche-4"));
    expect(circuits).toHaveLength(6);
    for (const t of circuits) {
      const linked = t.structure.filter((d) => d.exercises.slice(0, -1).every((e) => e.supersetWithNext) && !d.exercises.at(-1)?.supersetWithNext);
      expect(linked).toHaveLength(2);
    }
  });
});
