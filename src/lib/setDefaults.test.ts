import { describe, expect, it } from "vitest";
import { defaultSetValues, startingLoad } from "./setDefaults";

const set = (setNumber: number, values: { weightKg?: number; reps?: number; rpe?: number; completed?: boolean } = {}) => ({
  setNumber,
  completed: false,
  ...values,
});
const bench = { equipment: "barbell" as const, muscleGroup: "chest" as const };
const done = (setNumber: number, weightKg: number, reps: number) => ({ workoutId: 1, exerciseId: 1, setNumber, weightKg, reps, completed: true });

describe("default set values", () => {
  it("start a beginner light, with the program's reps", () => {
    expect(defaultSetValues({ set: set(1), totalSets: 3, level: "beginner", exercise: bench, targetReps: "8-10", previous: [], suggestion: null }))
      .toEqual({ weightKg: 30, reps: 8, rpe: 7 });
  });

  it("load more for an advanced lifter and push the last set", () => {
    expect(defaultSetValues({ set: set(3), totalSets: 3, level: "advanced", exercise: bench, previous: [], suggestion: null }))
      .toEqual({ weightKg: 70, reps: 8, rpe: 9 });
  });

  it("prefer last time over the level", () => {
    const previous = [done(1, 62.5, 9), done(2, 60, 8)];
    expect(defaultSetValues({ set: set(2), totalSets: 3, level: "beginner", exercise: bench, previous, suggestion: null }))
      .toMatchObject({ weightKg: 60, reps: 8 });
  });

  it("prefer the suggested progression over last time", () => {
    const previous = [done(1, 60, 10)];
    expect(defaultSetValues({ set: set(1), totalSets: 1, exercise: bench, targetReps: "8-10", previous, suggestion: 62.5 }).weightKg).toBe(62.5);
  });

  it("never replace what was typed, nor touch a finished set", () => {
    expect(defaultSetValues({ set: set(1, { weightKg: 50, reps: 5 }), totalSets: 3, exercise: bench, previous: [], suggestion: null }))
      .toEqual({ rpe: 7 });
    expect(defaultSetValues({ set: set(1, { completed: true }), totalSets: 3, exercise: bench, previous: [], suggestion: null })).toEqual({});
  });

  it("hold a plank for seconds, with no weight", () => {
    const plank = { equipment: "bodyweight" as const, muscleGroup: "core" as const };
    expect(defaultSetValues({ set: set(1), totalSets: 3, exercise: plank, targetReps: "30-45s", previous: [], suggestion: null }))
      .toEqual({ reps: 30, rpe: 7 });
  });

  it("leave bodyweight exercises unloaded", () => {
    expect(startingLoad({ equipment: "bodyweight", muscleGroup: "back" }, "advanced")).toBeUndefined();
  });
});
