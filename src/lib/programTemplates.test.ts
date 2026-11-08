import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { PROGRAM_TEMPLATES } from "./programTemplates";

// A name missing from the library would create a stray custom exercise for
// every user who starts the program.
const library = readFileSync("supabase/migrations/006_seed_exercises.sql", "utf8");

describe("built-in programs", () => {
  it("only use exercises from the seeded library", () => {
    const missing = PROGRAM_TEMPLATES.flatMap((t) => t.structure.flatMap((d) => d.exercises.map((e) => e.exerciseName)))
      .filter((name) => !library.includes(`'${name}'`));
    expect([...new Set(missing)]).toEqual([]);
  });
});
