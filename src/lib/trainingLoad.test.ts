import { describe, expect, it } from "vitest";
import { loadZone, sessionLoad, trainingLoad } from "./trainingLoad";

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

describe("sessionLoad", () => {
  it("weighs minutes by how hard the session felt", () => {
    const sets = [
      { workoutId: 1, completed: true, rpe: 8 },
      { workoutId: 1, completed: true, rpe: 6 },
      { workoutId: 1, completed: true, isWarmup: true, rpe: 3 },
    ];
    expect(sessionLoad({ id: 1, date: "2026-11-01", durationMin: 60 }, sets)).toBe(420);
  });

  it("guesses what was not said: the effort by kind, the minutes by sets", () => {
    expect(sessionLoad({ date: "2026-11-01", kind: "cardio", durationSec: 1800 }, [])).toBe(180);
    expect(sessionLoad({ date: "2026-11-01", kind: "interval", durationSec: 1200 }, [])).toBe(160);
    const sets = Array.from({ length: 10 }, () => ({ workoutId: 1, completed: true }));
    expect(sessionLoad({ id: 1, date: "2026-11-01" }, sets)).toBe(210);
  });
});

describe("trainingLoad", () => {
  const today = "2026-11-14";
  // Three sessions of an hour at RPE 7 (420) each week.
  const steady = (weeks: number) =>
    Array.from({ length: weeks }, (_, w) => [1, 3, 5].map((d) => ({ date: addDays(today, -(w * 7 + d)), kind: "cardio", durationMin: 70 }))).flat();

  it("says nothing before three weeks of history", () => {
    expect(trainingLoad({ today, workouts: steady(2), sets: [] })).toBeNull();
  });

  it("finds a steady load in the right zone", () => {
    const load = trainingLoad({ today, workouts: steady(6), sets: [] })!;
    expect(load.weeks).toEqual([1260, 1260, 1260, 1260]);
    expect(load).toMatchObject({ acute: 1260, chronic: 1260, ratio: 1, zone: "optimal" });
  });

  it("warns of a sharp rise this week", () => {
    const extra = [0, 2, 4, 6].map((d) => ({ date: addDays(today, -d), kind: "interval", durationMin: 60 }));
    const load = trainingLoad({ today, workouts: [...steady(6), ...extra], sets: [] })!;
    expect(load.acute).toBe(1260 + 4 * 480);
    expect(load.zone).toBe("danger");
  });

  it("sees a week off as a drop", () => {
    const load = trainingLoad({ today, workouts: steady(6).filter((w) => w.date < addDays(today, -6)), sets: [] })!;
    expect(load.acute).toBe(0);
    expect(load.zone).toBe("low");
  });
});

it("draws the zones where the studies do", () => {
  expect([0.5, 0.8, 1.3, 1.31, 1.5, 1.6].map(loadZone)).toEqual(["low", "optimal", "optimal", "caution", "caution", "danger"]);
});
