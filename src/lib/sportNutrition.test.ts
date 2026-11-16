import { describe, expect, it } from "vitest";
import { fuelling, sportDay } from "./sportNutrition";

describe("a day's food for one's sport", () => {
  it("keeps the calories of the goal on a training day, and shares them out by the kilo", () => {
    const d = sportDay({ weightKg: 58, calories: 2350, type: "training", sport: "running", goal: "endurance" });
    expect(d.calories).toBe(2350);
    expect(d.protein).toBe(87); // 1.5 g/kg
    expect(d.fat).toBeGreaterThanOrEqual(Math.round(58 * 0.8));
    expect(d.protein * 4 + d.carbs * 4 + d.fat * 9).toBeGreaterThan(2330);
    expect(d.carbsRange).toEqual([5, 7]);
  });

  it("raises a long endurance day to the carbohydrates it needs", () => {
    const d = sportDay({ weightKg: 72, calories: 2200, type: "long", sport: "cycling", goal: "endurance" });
    expect(d.raised).toBe(true);
    expect(d.carbs).toBe(72 * 7);
  });

  it("keeps the deficit while losing fat, with more protein", () => {
    const d = sportDay({ weightKg: 70, calories: 1750, type: "training", sport: "fitness", goal: "fat_loss" });
    expect(d.raised).toBe(false);
    expect(d.calories).toBe(1750);
    expect(d.protein).toBe(140); // 2 g/kg
  });

  it("asks less on a rest day, and more protein for a strength sport than for an endurance one", () => {
    const rest = sportDay({ weightKg: 80, calories: 3000, type: "rest", sport: "bodybuilding" });
    const train = sportDay({ weightKg: 80, calories: 3000, type: "training", sport: "bodybuilding" });
    expect(rest.calories).toBeLessThan(train.calories);
    expect(train.protein).toBeGreaterThan(sportDay({ weightKg: 80, calories: 3000, type: "training", sport: "running" }).protein);
  });

  it("never leaves the fat under 0.8 g a kilo", () => {
    expect(sportDay({ weightKg: 90, calories: 1500, type: "rest", sport: "strength", goal: "fat_loss" }).fat).toBeGreaterThanOrEqual(72);
  });
});

describe("food around a session", () => {
  it("times the meal, the snack and the recovery from the session's time", () => {
    const f = fuelling({ weightKg: 60, sport: "bodybuilding", minutes: 60, time: "18:00" });
    expect(f.map((x) => [x.moment, x.at])).toEqual([["before_meal", "15:30"], ["before_snack", "17:15"], ["after", "19:30"]]);
    expect(f.find((x) => x.moment === "after")!.protein).toEqual([20, 25]);
  });

  it("fuels a long endurance effort by the hour, more beyond two and a half hours", () => {
    expect(fuelling({ weightKg: 70, sport: "running", minutes: 90 }).find((x) => x.moment === "during")).toMatchObject({ carbs: [30, 60], waterPerHour: [400, 800] });
    expect(fuelling({ weightKg: 70, sport: "cycling", minutes: 180 }).find((x) => x.moment === "during")!.carbs).toEqual([60, 90]);
    expect(fuelling({ weightKg: 70, sport: "running", minutes: 45 }).some((x) => x.moment === "during")).toBe(false);
  });

  it("gives no time when the session's time is unknown", () => {
    expect(fuelling({ weightKg: 70, sport: "running", minutes: 60 }).every((x) => x.at === undefined)).toBe(true);
  });
});
