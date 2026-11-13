import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exerciseDescription, exerciseLabel } from "./exerciseNames";

const library = [
  ...readFileSync("supabase/migrations/006_seed_exercises.sql", "utf8").matchAll(/^\s+\('([^']+)', '[a-z_]+', '[a-z]+'/gm),
  ...readFileSync("supabase/migrations/024_endurance.sql", "utf8").matchAll(/^\s+\('([^']+)', '[a-z_]+', '[a-z]+'/gm),
].map((m) => m[1]);

describe("exercise names", () => {
  it("translate every exercise of the library", () => {
    expect(library.length).toBeGreaterThanOrEqual(49);
    for (const locale of ["fr", "de"]) {
      expect(library.filter((name) => exerciseLabel(name, locale) === name && !["Hip Thrust", "Face Pull", "Russian Twist", "Dead Bug", "Glute Bridge", "Step-up", "Leg extension", "Leg curl"].includes(name))).toEqual([]);
    }
  });

  it("keep English, and custom names, as they are", () => {
    expect(exerciseLabel("Back Squat", "en")).toBe("Back Squat");
    expect(exerciseLabel("Back Squat", "fr")).toBe("Squat arrière");
    expect(exerciseLabel("Mon exercice", "fr")).toBe("Mon exercice");
    expect(exerciseLabel(undefined, "fr")).toBe("?");
  });

  it("translate the descriptions the library has", () => {
    expect(exerciseDescription("Side Plank", "On one forearm…", "de")).toMatch(/^Auf einem Unterarm/);
    expect(exerciseDescription("Mon exercice", "Ma description", "fr")).toBe("Ma description");
  });
});
