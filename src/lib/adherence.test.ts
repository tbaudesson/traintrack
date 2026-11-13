import { describe, expect, it } from "vitest";
import { adherence, byAttention } from "./adherence";

// Today: Wednesday 11 November 2026. Plan: Monday, Wednesday, Friday.
const today = "2026-11-11";
const plan = [1, 3, 5];
const w = (id: number, date: string) => ({ id, date });

describe("adherence", () => {
  it("count the days trained against the days planned so far", () => {
    const a = adherence({
      today,
      trainingDays: plan,
      workouts: [w(1, "2026-10-19"), w(2, "2026-10-21"), w(3, "2026-10-23"), w(4, "2026-10-28"), w(5, "2026-11-02"), w(6, "2026-11-04"), w(7, "2026-11-06"), w(8, "2026-11-09")],
    });
    expect(a.weeks.map((x) => [x.monday, x.done, x.planned])).toEqual([
      ["2026-10-19", 3, 3],
      ["2026-10-26", 1, 3],
      ["2026-11-02", 3, 3],
      ["2026-11-09", 1, 2],
    ]);
    expect(a.rate).toBeCloseTo(8 / 11);
    expect(a.daysSinceLast).toBe(2);
    expect(a.status).toBe("good");
  });

  it("watch an athlete under 60 % of the plan, alert after a week without training", () => {
    expect(adherence({ today, trainingDays: plan, workouts: [w(1, "2026-11-09"), w(2, "2026-10-20")] }).status).toBe("watch");
    expect(adherence({ today, workouts: [w(1, "2026-11-03")] }).status).toBe("alert");
    expect(adherence({ today, workouts: [] }).status).toBe("alert");
  });

  it("work without a plan, counting the sessions only", () => {
    const a = adherence({ today, workouts: [w(1, "2026-11-10")] });
    expect(a.rate).toBeNull();
    expect(a.weeks.at(-1)).toMatchObject({ done: 1, planned: null });
    expect(a.status).toBe("good");
  });

  it("average the RPE of the last week's working sets", () => {
    const a = adherence({
      today,
      workouts: [w(1, "2026-11-10"), w(2, "2026-10-01")],
      sets: [
        { workoutId: 1, completed: true, rpe: 9 },
        { workoutId: 1, completed: true, rpe: 9.5 },
        { workoutId: 1, completed: true, rpe: 6, isWarmup: true },
        { workoutId: 2, completed: true, rpe: 5 },
        { workoutId: 1, completed: true, rpe: 66 },
      ],
    });
    expect(a.recentRpe).toBe(9.3);
  });

  it("put the athletes needing attention first", () => {
    const status = { a: "good", b: "alert", c: "watch" } as const;
    expect(byAttention(["a", "b", "c"] as const, (x) => status[x])).toEqual(["b", "c", "a"]);
  });
});
