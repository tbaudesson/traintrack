import { describe, expect, it } from "vitest";
import { INJURY_TEMPLATES } from "./injuryTemplates";
import { INJURY_AREAS, INJURY_RULES, programLoad } from "./injuries";
import { injuryAreaOf, programCategory, shelves } from "./programCategories";
import { PROGRAM_TEMPLATES } from "./programTemplates";

describe("programs for an injury", () => {
  it("offer one program per area, in French, English and German", () => {
    for (const locale of ["fr", "en", "de"]) {
      expect(INJURY_TEMPLATES.filter((t) => t.locale === locale).map((t) => t.forInjury).sort()).toEqual([...INJURY_AREAS].sort());
    }
  });

  it("have no exercise that loads their area, not even with caution", () => {
    for (const tpl of INJURY_TEMPLATES) {
      const loading = tpl.structure.flatMap((d) => d.exercises.map((e) => e.exerciseName)).filter((n) => INJURY_RULES[n]?.[tpl.forInjury!]);
      expect({ id: tpl.id, loading }).toEqual({ id: tpl.id, loading: [] });
      expect(programLoad(tpl.structure, tpl.forInjury!)).toBeNull();
    }
  });

  it("only use exercises the injury rules know, so the check above means something", () => {
    const unknown = INJURY_TEMPLATES.flatMap((t) => t.structure.flatMap((d) => d.exercises.map((e) => e.exerciseName))).filter((n) => !INJURY_RULES[n] && n !== "Dead Bug");
    expect([...new Set(unknown)]).toEqual([]);
  });

  it("name every day, and send the athlete to a health professional", () => {
    for (const tpl of INJURY_TEMPLATES) {
      expect(tpl.structure.every((d) => d.name.length > 0)).toBe(true);
      expect(tpl.description).toMatch(/professionnel de santé|health professional|medizinischen Fachperson/);
    }
  });

  it("sit on the injury shelf, also as a catalogue row read from the server", () => {
    const fr = INJURY_TEMPLATES.find((t) => t.id === "blessure-knee")!;
    expect(programCategory(fr)).toBe("injury");
    const row = { name: fr.name, structure: fr.structure, goal: fr.goal };
    expect(injuryAreaOf(row)).toBe("knee");
    expect(programCategory(row)).toBe("injury");
    expect(shelves(PROGRAM_TEMPLATES.filter((t) => t.locale === "fr")).get("injury")).toHaveLength(9);
  });
});

describe("programLoad", () => {
  it("is the worst level of the program's exercises for the area", () => {
    const day = (...names: string[]) => ({ exercises: names.map((exerciseName) => ({ exerciseName })) });
    expect(programLoad([day("Leg Press", "Crunch")], "shoulder")).toBeNull();
    expect(programLoad([day("Leg Press"), day("Lateral Raise")], "shoulder")).toBe("caution");
    expect(programLoad([day("Lateral Raise", "Overhead Press")], "shoulder")).toBe("avoid");
  });
});

describe("migration 054", () => {
  it("adds every program for an injury to the online catalogue", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("supabase/migrations/054_injury_programs.sql", "utf8");
    const missing = INJURY_TEMPLATES.filter((t) => !sql.includes(`'${t.name.replace(/'/g, "''")}'`)).map((t) => t.id);
    expect(missing).toEqual([]);
  });
});
