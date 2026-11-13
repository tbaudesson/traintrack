import { describe, it, expect } from "vitest";
import {
  beatsRecord, bestLifts, isTimedTarget, valuesForTick, estimateOneRepMax, lastPerformance, platesPerSide, recordHistory, topOfRepRange,
} from "./performance";

const workouts = [
  { id: 1, date: "2026-11-01" },
  { id: 2, date: "2026-11-03" },
  { id: 3, date: "2026-11-05" },
];
const set = (workoutId: number, setNumber: number, weightKg: number | undefined, reps: number | undefined, completed = true) => ({
  workoutId, exerciseId: 9, setNumber, weightKg, reps, completed,
});

describe("lastPerformance", () => {
  const sets = [set(1, 1, 50, 8), set(2, 1, 60, 8), set(2, 2, 60, 7), set(3, 1, 70, 8)];

  it("takes the most recent earlier session, in set order", () => {
    expect(lastPerformance(9, workouts[2], workouts, sets).map((s) => s.reps)).toEqual([8, 7]);
  });

  it("ignores sets that were never completed", () => {
    expect(lastPerformance(9, workouts[2], workouts, [set(2, 1, 60, 8, false), set(1, 1, 50, 8)])[0].weightKg).toBe(50);
  });

  it("looks at everything when there is no current session yet", () => {
    expect(lastPerformance(9, undefined, workouts, sets)[0].weightKg).toBe(70);
  });
});

describe("rep ranges", () => {
  it("has no opinion on timed targets", () => {
    expect(topOfRepRange("30-45s")).toBeNull();
  });
});

describe("records", () => {
  it("does not count the very first set as a record", () => {
    expect(recordHistory(9, workouts, [set(1, 1, 60, 8)])).toEqual([]);
  });

  it("counts a heavier weight, and more reps at the same weight", () => {
    const history = recordHistory(9, workouts, [set(1, 1, 60, 8), set(2, 1, 62.5, 5), set(3, 1, 60, 12)]);
    expect(history.map((r) => r.workoutId)).toEqual([2, 3]);
  });

  it("ignores a repeat of the best", () => {
    expect(recordHistory(9, workouts, [set(1, 1, 60, 8), set(2, 1, 60, 8)])).toEqual([]);
  });

  it("detects a record against earlier sets only", () => {
    expect(beatsRecord(set(2, 2, 65, 5), workouts[1], workouts, [set(1, 1, 60, 8), set(3, 1, 100, 5)])).toBe(true);
  });

  it("does not celebrate a first ever set", () => {
    expect(beatsRecord(set(1, 1, 60, 8), workouts[0], workouts, [])).toBe(false);
  });

  it("reports the best weight and estimated max", () => {
    expect(bestLifts(9, [set(1, 1, 100, 1), set(1, 2, 90, 10)])).toEqual({ weightKg: 100, oneRepMax: estimateOneRepMax(90, 10) });
  });
});

describe("platesPerSide", () => {
  it("loads the bar with the largest plates", () => {
    expect(platesPerSide(87.5, 20)).toEqual({ plates: [25, 5, 2.5, 1.25], left: 0 });
  });

  it("says when the weight cannot be made", () => {
    expect(platesPerSide(21, 20).left).toBe(0.5);
  });

  it("needs nothing at or below the bar", () => {
    expect(platesPerSide(20, 20).plates).toEqual([]);
  });
});

describe("valuesForTick", () => {
  it("saves the hints a set was ticked with", () => {
    expect(valuesForTick({}, { weightKg: 60, targetReps: "8-10" })).toEqual({ weightKg: 60, reps: 8 });
  });

  it("never overwrites what was typed", () => {
    expect(valuesForTick({ weightKg: 70, reps: 12 }, { weightKg: 60, targetReps: "8-10" })).toEqual({});
  });

  it("adds no reps for a timed target or a free exercise", () => {
    expect(valuesForTick({}, { targetReps: "30-45s" })).toEqual({});
    expect(valuesForTick({}, {})).toEqual({});
  });
});

describe("isTimedTarget", () => {
  it("recognises a held position", () => {
    expect(isTimedTarget("30-45s")).toBe(true);
    expect(isTimedTarget("8-10")).toBe(false);
    expect(isTimedTarget(undefined)).toBe(false);
  });
});
