import { describe, expect, it } from "vitest";
import { byMonth, companions, monthGrid, practisedShelves, sameWeekday, shiftMonth } from "./suggest";

describe("companions", () => {
  it("offers what is usually done with the exercises of the session, a habit only", () => {
    const sets = [
      { workoutId: 1, exerciseId: 10 }, { workoutId: 1, exerciseId: 20 }, { workoutId: 1, exerciseId: 30 },
      { workoutId: 2, exerciseId: 10 }, { workoutId: 2, exerciseId: 20 },
      { workoutId: 3, exerciseId: 10 }, { workoutId: 3, exerciseId: 40 },
      { workoutId: 4, exerciseId: 50 }, { workoutId: 4, exerciseId: 60 },
    ];
    expect(companions([10], sets)).toEqual([20]);
    expect(companions([10, 20], sets)).toEqual([]);
    expect(companions([], sets)).toEqual([]);
  });
});

describe("sameWeekday", () => {
  const sets = [1, 2, 3, 4].map((workoutId) => ({ workoutId, completed: true }));
  it("finds last Friday's session, not a run, not one older than four weeks", () => {
    const workouts = [
      { id: 1, date: "2026-11-13", kind: "strength" as const },
      { id: 2, date: "2026-11-06", kind: "strength" as const },
      { id: 3, date: "2026-11-14", kind: "cardio" as const },
      { id: 4, date: "2026-10-16", kind: "strength" as const },
    ];
    expect(sameWeekday(workouts, sets, "2026-11-20")?.id).toBe(1);
    expect(sameWeekday(workouts, sets, "2026-11-20", { id: 1 })?.id).toBe(2);
    expect(sameWeekday(workouts.slice(2), sets, "2026-11-20")).toBeUndefined();
  });
});

describe("practisedShelves", () => {
  it("ranks the sports by sessions done", () => {
    const shelf = (id: number) => (id === 1 ? "running" : id === 2 ? "trx" : null);
    expect(practisedShelves([{ programId: 2 }, { programId: 1 }, { programId: 1 }, { programId: 3 }, {}], shelf)).toEqual(["running", "trx"]);
  });
});

describe("history", () => {
  it("groups by month, newest first", () => {
    const g = byMonth([{ id: 1, date: "2026-10-30" }, { id: 2, date: "2026-11-02" }, { id: 3, date: "2026-11-20" }]);
    expect(g.map((x) => [x.month, x.items.map((w) => w.id)])).toEqual([["2026-11", [3, 2]], ["2026-10", [1]]]);
  });

  it("lays a month out in weeks from Monday", () => {
    const grid = monthGrid("2026-11");
    expect(grid[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});
