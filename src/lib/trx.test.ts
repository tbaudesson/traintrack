import { describe, expect, it } from "vitest";
import { TRX_EXERCISES } from "./trxExercises";
import { TRX_TEMPLATES } from "./trxTemplates";
import { buildIntervalSession } from "./intervals";
import { timedFromMigrations } from "./injuryGuidanceFromMigrations";

const TIMED = timedFromMigrations();
import { missingEquipment } from "./programEquipment";
import { programCategory } from "./programCategories";
import { recommendPrograms } from "./onboarding";
import { PROGRAM_TEMPLATES } from "./programTemplates";
import { injuryRulesFromMigrations } from "./injuryGuidanceFromMigrations";
import { libraryFromMigrations } from "./libraryFromMigrations";

const LIBRARY = new Map(libraryFromMigrations().map((r) => [r.name, r]));


const INJURY_RULES = injuryRulesFromMigrations();

describe("TRX", () => {
  it("has every exercise named, described and ruled for injuries", () => {
    for (const e of TRX_EXERCISES) {
      expect(LIBRARY.get(e.name)?.nameFr, e.name).toBeTruthy();
      expect(LIBRARY.get(e.name)?.descriptionDe, e.name).toBeTruthy();
      expect(INJURY_RULES[e.name], e.name).toBeDefined();
    }
  });

  it("offers two programs in each language, with straps only, on their own shelf", () => {
    for (const locale of ["fr", "en", "de"]) expect(TRX_TEMPLATES.filter((t) => t.locale === locale)).toHaveLength(2);
    for (const t of TRX_TEMPLATES) {
      expect(missingEquipment(t.structure, ["suspension"]), t.id).toEqual([]);
      expect(t.structure.flatMap((d) => d.exercises).every((e) => e.exerciseName.startsWith("TRX ")), t.id).toBe(true);
      expect(programCategory(t)).toBe("trx");
    }
  });

  it("puts straps in a timed session only when they are chosen", () => {
    const base = { focus: "full" as const, dumbbells: false, pattern: "45-15" as const, minutes: 20 };
    for (let seed = 1; seed <= 20; seed++) {
      const without = buildIntervalSession(TIMED, { ...base, seed }).rounds.flat();
      expect(without.some((e) => e.equipment !== "bodyweight")).toBe(false);
      const withTrx = buildIntervalSession(TIMED, { ...base, trx: true, seed }).rounds.flat();
      expect(withTrx.some((e) => e.equipment === "suspension")).toBe(true);
      expect(withTrx.some((e) => e.equipment === "dumbbell")).toBe(false);
    }
    expect(TIMED.exercises.filter((e) => e.equipment === "suspension")).toHaveLength(TRX_EXERCISES.length);
  });

  it("is suggested at sign-up to an athlete with straps", () => {
    const fr = PROGRAM_TEMPLATES.filter((t) => t.locale === "fr");
    const picks = recommendPrograms({ goal: "general_fitness", level: "beginner", equipment: ["bodyweight", "suspension"] }, fr);
    expect(picks[0].name).toBe("TRX débutant");
    const none = recommendPrograms({ goal: "general_fitness", level: "beginner", equipment: ["bodyweight"] }, fr);
    expect(none.some((t) => t.name.startsWith("TRX"))).toBe(false);
  });
});
