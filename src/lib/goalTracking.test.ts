import { describe, expect, it } from "vitest";
import type { Goal } from "@/db";
import { bestTimeOver, byPriority, goalStatus, startValueFor, type GoalData } from "./goalTracking";

const goal = (g: Partial<Goal>): Goal => ({ uuid: "g", type: "time", targetValue: 1, priority: 2, createdAt: "2026-10-01T08:00:00Z", updatedAt: "", _dirty: 0, ...g }) as Goal;
const data = (d: Partial<GoalData>): GoalData => ({ today: "2026-11-22", workouts: [], sets: [], exercises: [], bodyMetrics: [], ...d });
const run = (id: number, date: string, km: number, min: number) => ({ id, date, kind: "cardio" as const, sport: "run" as const, distanceM: km * 1000, durationSec: min * 60 });

describe("a time goal: 10 km under 50 min", () => {
  const tenK = goal({ type: "time", scope: "run", distanceM: 10000, targetValue: 50 * 60, startValue: 55 * 60 });

  it("reads the best pace held over at least the distance", () => {
    const workouts = [run(1, "2026-10-05", 10, 54), run(2, "2026-10-20", 12, 63), run(3, "2026-11-01", 5, 22)];
    // 12 km in 63 min: 52:30 over 10 km. The 5 km does not count.
    expect(bestTimeOver(workouts, "run", 10000)).toEqual({ seconds: 3150, date: "2026-10-20" });
    const s = goalStatus(tenK, data({ workouts }));
    expect(s.current).toBe(3150);
    expect(s.share).toBeCloseTo(0.5);
    expect(s.achievedOn).toBeUndefined();
    expect(s.lowerIsBetter).toBe(true);
  });

  it("is reached on the first session under the target", () => {
    const s = goalStatus(tenK, data({ workouts: [run(1, "2026-11-10", 10, 49.5)] }));
    expect(s.share).toBe(1);
    expect(s.achievedOn).toBe("2026-11-10");
  });
});

describe("a distance goal", () => {
  it("adds up what was covered since it was set, and says if it keeps up with its deadline", () => {
    const g = goal({ type: "distance", scope: "run", targetValue: 100000, deadline: "2026-11-30", createdAt: "2026-11-01T00:00:00Z" });
    const workouts = [run(1, "2026-10-30", 20, 100), run(2, "2026-11-05", 30, 150), run(3, "2026-11-15", 40, 200)];
    const s = goalStatus(g, data({ workouts }));
    expect(s.current).toBe(70000);
    expect(s.share).toBeCloseTo(0.7);
    // 21 of 29 days gone: 72.4 km due by now, 70 km covered: just behind.
    expect(s.onTrack).toBe(false);
  });
});

describe("a frequency goal", () => {
  it("counts the sessions done a week over the last four weeks, of its kind only", () => {
    const g = goal({ type: "frequency", scope: "run", targetValue: 3, createdAt: "2026-09-01T00:00:00Z" });
    const workouts = Array.from({ length: 8 }, (_, i) => run(i + 1, `2026-11-${String(i * 3 + 1).padStart(2, "0")}`, 5, 30));
    const s = goalStatus(g, data({ workouts }));
    expect(s.current).toBe(2);
    expect(s.onTrack).toBe(false);
  });
});

describe("a weight goal", () => {
  it("works downwards from where it started", () => {
    const g = goal({ type: "weight", targetValue: 75, startValue: 80 });
    const bodyMetrics = [{ date: "2026-10-01", weightKg: 80 }, { date: "2026-11-20", weightKg: 77.5 }];
    const s = goalStatus(g, data({ bodyMetrics }));
    expect(s.current).toBe(77.5);
    expect(s.share).toBeCloseTo(0.5);
    expect(s.lowerIsBetter).toBe(true);
  });
});

describe("a strength goal", () => {
  it("reads the estimated one-rep max of its exercise", () => {
    const g = goal({ type: "strength", exerciseName: "Back Squat", targetValue: 120, startValue: 100 });
    const s = goalStatus(g, data({
      exercises: [{ id: 7, name: "Back Squat" }],
      workouts: [{ id: 1, date: "2026-11-10", kind: "strength" as const }],
      sets: [{ workoutId: 1, exerciseId: 7, completed: true, weightKg: 100, reps: 6 }],
    }));
    expect(s.current).toBeCloseTo(120);
    expect(s.achievedOn).toBe("2026-11-10");
  });
});

describe("the goals' order and starting point", () => {
  it("puts the main goal first, then the nearest deadline", () => {
    const list = [goal({ uuid: "a", priority: 2, deadline: "2027-01-01" }), goal({ uuid: "b", priority: 2, deadline: "2026-12-01" }), goal({ uuid: "c", priority: 1 })];
    expect(byPriority(list).map((g) => g.uuid)).toEqual(["c", "b", "a"]);
  });

  it("starts a time goal from the best time so far, a distance goal from nothing", () => {
    const d = data({ workouts: [run(1, "2026-11-01", 10, 55)] });
    expect(startValueFor({ type: "time", scope: "run", distanceM: 10000, targetValue: 3000 }, d)).toBe(3300);
    expect(startValueFor({ type: "distance", scope: "run", targetValue: 100000 }, d)).toBeNull();
  });
});
