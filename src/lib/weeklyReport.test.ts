import { describe, expect, it } from "vitest";
import { weeklyReport } from "./weeklyReport";

const workouts = [
  { id: 1, date: "2026-10-27", kind: "strength", durationMin: 60 },
  { id: 2, date: "2026-11-02", kind: "strength", durationMin: 55 },
  { id: 3, date: "2026-11-04", kind: "strength", durationMin: 65 },
  { id: 4, date: "2026-11-06", kind: "cardio", distanceM: 8000, durationSec: 2400 },
  { id: 5, date: "2026-11-10", kind: "strength", durationMin: 50 },
];
const set = (workoutId: number, setNumber: number, weightKg: number, reps: number, rpe?: number, extra = {}) =>
  ({ workoutId, exerciseId: 7, setNumber, completed: true, weightKg, reps, rpe, ...extra });
const sets = [
  set(1, 1, 100, 5, 8),
  set(2, 1, 100, 5, 7),
  set(2, 2, 105, 5, 8),
  set(3, 1, 50, 10, undefined, { isWarmup: true }),
  set(3, 1, 107.5, 4, 9),
  set(3, 2, 110, 2, 9.5, { completed: false }),
  set(5, 1, 120, 3, 9),
];

describe("weekly report", () => {
  const report = weeklyReport({
    monday: "2026-11-02",
    workouts,
    sets,
    trainingDays: [1, 3, 5],
    pains: [{ date: "2026-11-04", area: "knee", level: 4 }, { date: "2026-11-10", area: "hip", level: 6 }],
  });

  it("count the days against the plan, and the endurance apart", () => {
    expect(report).toMatchObject({ monday: "2026-11-02", sunday: "2026-11-08", daysTrained: 3, planned: 3, strengthSessions: 2 });
    expect(report.cardio).toEqual({ sessions: 1, distanceM: 8000, durationSec: 2400 });
    expect(report.minutes).toBe(160);
  });

  it("add up the working volume and compare it with the week before", () => {
    expect(report.volume).toBe(500 + 525 + 430);
    expect(report.volumeChange).toBe(Math.round(((1455 - 500) / 500) * 100));
  });

  it("keep the best record of the week and the average RPE", () => {
    expect(report.records).toEqual([{ exerciseId: 7, weightKg: 105, reps: 5 }]);
    expect(report.avgRpe).toBe(8);
  });

  it("list the pains of the week only", () => {
    expect(report.pains.map((p) => p.area)).toEqual(["knee"]);
  });
});
