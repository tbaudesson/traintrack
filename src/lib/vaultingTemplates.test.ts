import { describe, expect, it } from "vitest";
import { VAULTING_TEMPLATES, vaultingPhase, vaultingTemplates } from "./vaultingTemplates";
import { VAULTING_EXERCISES } from "./vaultingExercises";
import { NAMES, DESCRIPTIONS } from "./exerciseNames";
import { INJURY_RULES } from "./injuries";
import { PROGRAM_TEMPLATES } from "./programTemplates";
import { programKind } from "./programCards";

describe("vaulting plans", () => {
  it("come in every language, with the same shape", () => {
    const [fr, en, de] = (["fr", "en", "de"] as const).map(vaultingTemplates);
    for (const other of [en, de])
      other.forEach((t, i) => {
        expect(t.structure.length).toBe(fr[i].structure.length);
        expect(t.structure.map((d) => d.exercises.map((e) => e.exerciseName))).toEqual(fr[i].structure.map((d) => d.exercises.map((e) => e.exerciseName)));
        expect(t.name).not.toBe(fr[i].name);
      });
    expect(new Set(VAULTING_TEMPLATES.map((t) => t.id)).size).toBe(VAULTING_TEMPLATES.length);
    expect(PROGRAM_TEMPLATES).toEqual(expect.arrayContaining(VAULTING_TEMPLATES));
  });

  it("run week after week, with the days of each week", () => {
    const [beginner, competition, fitness] = vaultingTemplates("fr");
    expect(beginner.structure).toHaveLength(8 * 3);
    expect(competition.structure).toHaveLength(12 * 4);
    expect(beginner.structure.every((d, i) => d.week === Math.floor(i / 3) + 1)).toBe(true);
    expect(fitness.structure.every((d) => d.week === undefined)).toBe(true);
  });

  it("go on the horse at walk first, then at canter", () => {
    const horse = vaultingTemplates("fr")[0].structure.filter((d) => d.name.includes("cheval"));
    expect(horse[0].cardio?.intensity).toBe("Pas");
    expect(horse[7].cardio?.intensity).toBe("Galop");
    expect(horse.every((d) => d.cardio?.sport === "vaulting" && d.cardio.notes)).toBe(true);
  });

  it("are filed with the endurance plans, as vaulting", () => {
    for (const t of VAULTING_TEMPLATES.filter((t) => t.structure.some((d) => d.cardio)))
      expect(programKind({ name: t.name, structure: t.structure }, VAULTING_TEMPLATES)).toEqual({ kind: "endurance", sport: "vaulting" });
  });

  it("use only exercises the library knows, translated and with injury rules", () => {
    const used = new Set(VAULTING_TEMPLATES.flatMap((t) => t.structure.flatMap((d) => d.exercises.map((e) => e.exerciseName))));
    for (const name of used) expect(NAMES[name], name).toBeDefined();
    for (const e of VAULTING_EXERCISES) {
      expect(DESCRIPTIONS[e.name], e.name).toBeDefined();
      expect(INJURY_RULES[e.name], e.name).toBeDefined();
    }
  });

  it("phase the competition plan", () => {
    expect([1, 4, 5, 8, 9, 11, 12].map(vaultingPhase)).toEqual(["foundation", "foundation", "development", "development", "competition", "competition", "taper"]);
  });
});
