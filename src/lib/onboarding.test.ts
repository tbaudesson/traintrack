import { describe, expect, it } from "vitest";
import { programEquipmentFromMigrations } from "./injuryGuidanceFromMigrations";
import { PROGRAM_TEMPLATES } from "./programTemplates";
import { defaultTrainingDays, recommendPrograms } from "./onboarding";

const EQ = programEquipmentFromMigrations();

const fr = PROGRAM_TEMPLATES.filter((t) => t.locale === "fr");

describe("sign-up suggestions", () => {
  it("suggest three programs for the goal", () => {
    const picks = recommendPrograms({ goal: "endurance", level: "beginner", equipment: ["barbell"], equipmentGuide: EQ }, fr);
    expect(picks).toHaveLength(3);
    expect(picks.every((t) => t.goal === "endurance")).toBe(true);
  });

  it("keep to home programs without gym equipment", () => {
    const picks = recommendPrograms({ goal: "general_fitness", level: "beginner", equipment: ["dumbbell", "bodyweight"], equipmentGuide: EQ }, fr);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every((t) => t.homeFriendly || t.goal === "endurance" || picks.length === 3)).toBe(true);
    expect(picks[0].homeFriendly).toBe(true);
  });

  it("put the programs of one's sport first, at one's level first", () => {
    const running = recommendPrograms({ goal: "endurance", level: "beginner", equipment: [], sport: "running", equipmentGuide: EQ }, fr);
    expect(running.map((t) => t.level)[0]).toBe("beginner");
    expect(running.every((t) => t.goal === "endurance" || /Renfo/.test(t.name))).toBe(true);
    const calisthenics = recommendPrograms({ goal: "general_fitness", level: "intermediate", equipment: ["bodyweight"], sport: "callisthenics", equipmentGuide: EQ }, fr);
    expect(calisthenics[0].name).toBe("Callisthenics intermédiaire en 8 semaines");
    const vaulting = recommendPrograms({ goal: "general_fitness", level: "beginner", equipment: [], sport: "vaulting", equipmentGuide: EQ }, fr);
    expect(vaulting.every((t) => /Voltige|voltigeur/.test(t.name))).toBe(true);
  });

  it("spread the training days over the week", () => {
    expect(defaultTrainingDays(3)).toEqual([1, 3, 5]);
    expect(defaultTrainingDays(2)).toEqual([2, 5]);
    expect(defaultTrainingDays(9)).toHaveLength(7);
  });

  it("never suggest an exercise hung from a pull-up bar to an athlete without one", () => {
    const bar = /^(Pull-up|Chin-up|Hanging Leg Raise)$/;
    for (const sport of [null, "callisthenics", "fitness", "bodybuilding"] as const) {
      for (const equipment of [["bodyweight"], ["dumbbell", "bodyweight", "bands"]] as const) {
        const picks = recommendPrograms({ goal: "general_fitness", level: "beginner", equipment: [...equipment], sport, equipmentGuide: EQ }, fr);
        expect(picks.length).toBeGreaterThan(0);
        const hung = picks.flatMap((t) => t.structure.flatMap((d) => d.exercises.map((e) => e.exerciseName))).filter((n) => bar.test(n));
        expect({ sport, equipment, hung }).toEqual({ sport, equipment, hung: [] });
      }
    }
  });
});
