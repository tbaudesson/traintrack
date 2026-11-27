import { describe, expect, it } from "vitest";
import { lastIntensity, scaleDay, scaleTarget } from "./intensity";

describe("scaleTarget", () => {
  it("raises reps and holds by the percentage, rounded up", () => {
    expect(scaleTarget("10", 20)).toBe("12");
    expect(scaleTarget("8-12", 20)).toBe("10-15");
    expect(scaleTarget("25s", 20)).toBe("30s");
    expect(scaleTarget("2-4", 20)).toBe("3-5");
    expect(scaleTarget("10", 10)).toBe("11");
    expect(scaleTarget("15", 30)).toBe("20");
  });

  it("lowers them too, never below 1, and leaves a target without numbers or at 0 % alone", () => {
    expect(scaleTarget("10", -20)).toBe("8");
    expect(scaleTarget("1-3", -20)).toBe("1-3");
    expect(scaleTarget("max", 20)).toBe("max");
    expect(scaleTarget("8-12", 0)).toBe("8-12");
    expect(scaleTarget("8-12", null)).toBe("8-12");
  });
});

describe("scaleDay", () => {
  it("scales every exercise's target, sets unchanged", () => {
    const day = { name: "A", exercises: [{ exerciseName: "Dead Bug", targetSets: 3, targetReps: "10" }, { exerciseName: "Plank", targetSets: 3, targetReps: "25s" }] };
    expect(scaleDay(day, 20).exercises.map((e) => `${e.targetSets}x${e.targetReps}`)).toEqual(["3x12", "3x30s"]);
    expect(scaleDay(day, 0)).toBe(day);
  });
});

describe("lastIntensity", () => {
  it("takes the most recent session of the same program that had one", () => {
    const ws = [
      { programId: 1, date: "2026-11-20", id: 1, intensityPct: 10 },
      { programId: 1, date: "2026-11-25", id: 2, intensityPct: 20 },
      { programId: 1, date: "2026-11-26", id: 3, intensityPct: null },
      { programId: 2, date: "2026-11-27", id: 4, intensityPct: 30 },
      { programId: 1, date: "2026-11-27", id: 5, intensityPct: -20, deletedAt: "2026-11-27T10:00:00Z" },
    ];
    expect(lastIntensity(ws, 1)).toBe(20);
    expect(lastIntensity(ws, 3)).toBeNull();
    expect(lastIntensity(ws, null)).toBeNull();
  });
});
