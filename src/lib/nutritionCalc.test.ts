import { describe, expect, it } from "vitest";
import { activityFactor, ageOn, nutritionPlan } from "./nutritionCalc";

describe("nutrition targets", () => {
  it("follow Mifflin-St Jeor and the activity", () => {
    const p = nutritionPlan({ weightKg: 80, heightCm: 180, age: 30, sex: "male", trainingDays: 3, goal: "general_fitness" });
    expect(p.bmr).toBe(1780);
    expect(p.activity).toBe(1.55);
    expect(p.maintenance).toBe(2759);
    expect(p.calories).toBe(2760);
  });

  it("cut for fat loss with more protein, add for muscle gain", () => {
    const base = { weightKg: 70, heightCm: 165, age: 35, sex: "female" as const, trainingDays: 4 };
    const cut = nutritionPlan({ ...base, goal: "fat_loss" });
    const bulk = nutritionPlan({ ...base, goal: "hypertrophy" });
    expect(cut.calories).toBeLessThan(cut.maintenance);
    expect(bulk.calories).toBeGreaterThan(bulk.maintenance);
    expect(cut.protein).toBe(140);
    expect(cut.protein * 4 + cut.carbs * 4 + cut.fat * 9).toBeGreaterThan(cut.calories - 20);
    expect(cut.water).toBe(2500);
  });

  it("scale the activity with the training days, and count the age", () => {
    expect([0, 2, 3, 5, 7].map(activityFactor)).toEqual([1.2, 1.375, 1.55, 1.725, 1.9]);
    expect(ageOn("1990-11-14", "2026-11-13")).toBe(35);
    expect(ageOn("1990-11-13", "2026-11-13")).toBe(36);
  });
});
