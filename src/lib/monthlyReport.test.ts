import { describe, expect, it } from "vitest";
import { monthBounds, monthlyReport, plannedDays, shiftMonth } from "./monthlyReport";

describe("months", () => {
  it("know their bounds and their neighbours", () => {
    expect(monthBounds("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("count the planned days, up to today for the month in progress", () => {
    // November 2026 starts on a Sunday: Mondays 2, 9, 16, 23, 30; Wednesdays 4, 11, 18, 25.
    expect(plannedDays("2026-11", [1, 3], "2026-12-31")).toBe(9);
    expect(plannedDays("2026-11", [1, 3], "2026-11-14")).toBe(4);
  });
});

describe("monthlyReport", () => {
  const workouts = [
    { id: 1, date: "2026-10-05", kind: "strength", durationMin: 60 },
    { id: 2, date: "2026-11-02", kind: "strength", durationMin: 50 },
    { id: 3, date: "2026-11-04", kind: "strength", durationMin: 55 },
    { id: 4, date: "2026-11-09", kind: "cardio", distanceM: 8000, durationSec: 2400 },
  ];
  const set = (workoutId: number, exerciseId: number, weightKg: number, reps: number, rpe?: number) => ({ workoutId, exerciseId, setNumber: 1, completed: true, weightKg, reps, rpe });
  const r = monthlyReport({
    month: "2026-11",
    today: "2026-11-14",
    workouts,
    sets: [set(1, 7, 60, 8), set(2, 7, 62.5, 8, 8), set(3, 7, 65, 8, 9), set(3, 9, 40, 10)],
    trainingDays: [1, 3],
    readiness: [{ date: "2026-11-02", score: 60 }, { date: "2026-11-09", score: 80 }, { date: "2026-10-01", score: 10 }],
    competitions: [{ date: "2026-11-08", event: "Cup", compulsory: 6, freestyle: 7 }, { date: "2026-11-30", event: "Next" }],
  });

  it("measures attendance against the plan", () => {
    expect(r).toMatchObject({ sessions: 3, daysTrained: 3, planned: 4, adherence: 75, strengthSessions: 2, minutes: 145 });
    expect(r.cardio).toEqual({ sessions: 1, distanceM: 8000, durationSec: 2400 });
  });

  it("sums the volume and compares it with the month before", () => {
    expect(r.volume).toBe(500 + 520 + 400);
    expect(r.volumeChange).toBe(196);
  });

  it("keeps the records and the biggest gain", () => {
    expect(r.records).toEqual([{ exerciseId: 7, weightKg: 65, reps: 8 }]);
    expect(r.progress).toEqual([{ exerciseId: 7, before: 76, best: 82.3, percent: 8.3 }]);
  });

  it("averages effort and form, and keeps the competitions judged", () => {
    expect(r.avgRpe).toBe(8.5);
    expect(r.readiness).toBe(70);
    expect(r.competitions.map((c) => [c.event, c.final])).toEqual([["Cup", 6.5]]);
  });
});
