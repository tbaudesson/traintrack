import { describe, expect, it } from "vitest";
import { cardioSportOf, detectSport, kindOf, weekOverview } from "./activityProfile";

const today = "2026-11-12"; // Thursday
const monday = "2026-11-09";

describe("kindOf", () => {
  it("files each sport", () => {
    expect(kindOf("running")).toBe("endurance");
    expect(kindOf("bodybuilding")).toBe("strength");
    expect(kindOf("fitness")).toBe("strength");
    expect(kindOf("callisthenics")).toBe("bodyweight");
    expect(kindOf("vaulting")).toBe("vaulting");
    expect(kindOf(null)).toBeNull();
    expect(cardioSportOf("swimming")).toBe("swim");
  });
});

describe("detectSport", () => {
  const runs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, date: `2026-11-${String(1 + i).padStart(2, "0")}`, kind: "cardio", sport: "run" as const }));

  it("finds the sport of most recent sessions", () => {
    expect(detectSport({ today, workouts: runs(7), sets: [] })).toBe("running");
  });

  it("tells weight training from callisthenics", () => {
    const workouts = Array.from({ length: 6 }, (_, i) => ({ id: 100 + i, date: `2026-11-0${1 + i}`, kind: "strength" }));
    const sets = workouts.map((w) => ({ workoutId: w.id, completed: true, reps: 10 }));
    expect(detectSport({ today, workouts, sets })).toBe("callisthenics");
    expect(detectSport({ today, workouts, sets: sets.map((s) => ({ ...s, weightKg: 40 })) })).toBe("bodybuilding");
  });

  it("says nothing with too few sessions or no clear sport", () => {
    expect(detectSport({ today, workouts: runs(4), sets: [] })).toBeNull();
    const mixed = [...runs(4), ...Array.from({ length: 4 }, (_, i) => ({ id: 50 + i, date: "2026-11-05", kind: "cardio", sport: "bike" as const }))];
    expect(detectSport({ today, workouts: mixed, sets: [] })).toBeNull();
  });
});

describe("weekOverview", () => {
  const workouts = [
    { id: 1, date: "2026-11-02", kind: "cardio", sport: "run" as const, distanceM: 8000 },
    { id: 2, date: "2026-11-07", kind: "cardio", sport: "run" as const, distanceM: 20000 },
    { id: 3, date: "2026-11-10", kind: "cardio", sport: "run" as const, distanceM: 10000 },
    { id: 4, date: "2026-11-11", kind: "strength" },
  ];
  const sets = [
    { workoutId: 4, completed: true, reps: 10, weightKg: 50 },
    { workoutId: 4, completed: true, reps: 12 },
    { workoutId: 4, completed: true, reps: 12, isWarmup: true },
  ];

  it("counts kilometres for a runner, against last week up to the same day", () => {
    // Last week to Thursday: 8 km (the 20 km came on Saturday).
    expect(weekOverview({ kind: "endurance", cardioSport: "run", monday, today, workouts, sets })).toEqual({ metric: "distance", value: 10, unit: "km", change: 25, sessions: 2 });
  });

  it("counts kilos for weight training and repetitions for callisthenics", () => {
    expect(weekOverview({ kind: "strength", monday, today, workouts, sets })).toMatchObject({ value: 500, unit: "kg", change: null });
    expect(weekOverview({ kind: "bodyweight", monday, today, workouts, sets })).toMatchObject({ value: 12, unit: "reps" });
  });
});

describe("detectSport, empty sessions", () => {
  it("leaves out sessions with nothing done", () => {
    const runs = Array.from({ length: 6 }, (_, i) => ({ id: i, date: `2026-11-0${1 + i}`, kind: "cardio", sport: "run" as const }));
    const empty = Array.from({ length: 5 }, (_, i) => ({ id: 20 + i, date: "2026-11-10", kind: "strength" }));
    expect(detectSport({ today, workouts: [...runs, ...empty], sets: [] })).toBe("running");
  });
});
