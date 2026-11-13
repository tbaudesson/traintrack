import { describe, expect, it } from "vitest";
import { goalProgress, oneRepMaxHistory, type StrengthGoal } from "./goals";

const goal: StrengthGoal = { id: "g", exerciseName: "Bench", targetKg: 100, startKg: 80, createdAt: "2026-09-01T10:00:00Z" };

describe("strength goals", () => {
  it("keep the best estimated 1RM of each session", () => {
    const history = oneRepMaxHistory(
      7,
      [{ id: 1, date: "2026-09-02" }, { id: 2, date: "2026-09-09" }],
      [
        { workoutId: 1, exerciseId: 7, completed: true, weightKg: 70, reps: 8 },
        { workoutId: 1, exerciseId: 7, completed: true, weightKg: 80, reps: 1 },
        { workoutId: 1, exerciseId: 7, completed: true, weightKg: 90, reps: 5, isWarmup: true },
        { workoutId: 2, exerciseId: 7, completed: false, weightKg: 100, reps: 1 },
        { workoutId: 2, exerciseId: 3, completed: true, weightKg: 100, reps: 1 },
      ]
    );
    expect(history.map((p) => [p.date, Math.round(p.oneRepMax)])).toEqual([["2026-09-02", 89]]);
  });

  it("measure the way done and project the date from the trend", () => {
    const history = [
      { date: "2026-10-01", oneRepMax: 85 },
      { date: "2026-10-15", oneRepMax: 87 },
      { date: "2026-10-29", oneRepMax: 89 },
      { date: "2026-11-12", oneRepMax: 91 },
    ];
    const p = goalProgress({ ...goal, deadline: "2027-06-01" }, history, "2026-11-13");
    expect(p.currentKg).toBe(91);
    expect(p.share).toBeCloseTo(11 / 20);
    // One kilo a week: nine more weeks from 12 November.
    expect(p.projectedOn).toBe("2027-01-14");
    expect(p.onTrack).toBe(true);
  });

  it("say when the target was reached", () => {
    const p = goalProgress(goal, [{ date: "2026-08-01", oneRepMax: 101 }, { date: "2026-10-20", oneRepMax: 100.5 }], "2026-11-13");
    expect(p).toMatchObject({ share: 1, achievedOn: "2026-10-20" });
  });

  it("not guess from too little, nor from a falling trend", () => {
    expect(goalProgress(goal, [{ date: "2026-11-10", oneRepMax: 85 }], "2026-11-13").projectedOn).toBeNull();
    const falling = [{ date: "2026-10-01", oneRepMax: 90 }, { date: "2026-10-20", oneRepMax: 88 }, { date: "2026-11-10", oneRepMax: 86 }];
    expect(goalProgress({ ...goal, deadline: "2027-01-01" }, falling, "2026-11-13")).toMatchObject({ projectedOn: null, onTrack: false });
  });
});
