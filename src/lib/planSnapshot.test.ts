import { describe, expect, it } from "vitest";
import type { ProgramDay } from "@/db";
import { changeSummary, MAX_REVISIONS, planVsDone, plannedIndex, reviseProgram, withDayKeys } from "./planSnapshot";

const day = (name: string, exercises: [string, number, string][] = [], key?: string): ProgramDay => ({
  ...(key ? { key } : {}),
  name,
  exercises: exercises.map(([exerciseName, targetSets, targetReps]) => ({ exerciseName, targetSets, targetReps, restSec: 90 })),
});

describe("withDayKeys", () => {
  it("gives every day its own key and keeps those it has", () => {
    const out = withDayKeys([day("A", [], "k1"), day("B"), day("C", [], "k1")]);
    expect(out[0].key).toBe("k1");
    expect(new Set(out.map((d) => d.key)).size).toBe(3);
  });
});

describe("plannedIndex", () => {
  const program = { structure: [day("A", [], "a"), day("B", [], "b"), day("C", [], "c")] };
  it("follows the day through moves, and lets go once it is deleted", () => {
    expect(plannedIndex(program, { programDayIndex: 0, plannedDay: day("B", [], "b") })).toBe(1);
    expect(plannedIndex({ structure: [day("A", [], "a"), day("C", [], "c")] }, { programDayIndex: 2, plannedDay: day("C", [], "c") })).toBe(1);
    expect(plannedIndex({ structure: [day("A", [], "a")] }, { programDayIndex: 1, plannedDay: day("B", [], "b") })).toBeNull();
    // Sessions from before: no answer here, the position decides.
    expect(plannedIndex(program, { programDayIndex: 1 })).toBeUndefined();
  });
});

describe("reviseProgram", () => {
  const before = { name: "PPL", structure: [day("Push", [["Push-up", 3, "10"]], "p")], revisions: [] };
  it("keeps the version before a change, not before a mere key or nothing", () => {
    expect(reviseProgram(before, { structure: [day("Push", [["Push-up", 4, "10"]], "p")] }, "2026-11-21")).toEqual([{ at: "2026-11-21", name: "PPL", structure: before.structure }]);
    expect(reviseProgram(before, { name: "PPL 2" }, "x")).toHaveLength(1);
    expect(reviseProgram(before, { structure: [day("Push", [["Push-up", 3, "10"]])] }, "x")).toBeUndefined();
    expect(reviseProgram(before, {}, "x")).toBeUndefined();
  });
  it("keeps only the last versions", () => {
    const many = { ...before, revisions: Array.from({ length: MAX_REVISIONS }, (_, i) => ({ at: String(i), name: "PPL", structure: [] })) };
    const out = reviseProgram(many, { name: "New" }, "now")!;
    expect(out).toHaveLength(MAX_REVISIONS);
    expect(out[0].at).toBe("1");
  });
});

describe("changeSummary", () => {
  it("counts the days and exercises added, removed or changed", () => {
    const from = [day("A", [["Squat", 3, "5"], ["Plank", 3, "30"]], "a"), day("B", [], "b")];
    const to = [day("A renamed", [["Squat", 4, "5"], ["Lunge", 3, "10"]], "a"), day("C", [], "c")];
    expect(changeSummary(from, to)).toEqual({ daysAdded: 1, daysRemoved: 1, exercisesAdded: 1, exercisesRemoved: 1, targetsChanged: 1 });
  });
});

describe("planVsDone", () => {
  const exercises = [{ id: 1, name: "Squat" }, { id: 2, name: "Plank" }, { id: 3, name: "Lunge" }];
  const planned = day("Legs", [["Squat", 3, "5-8"], ["Plank", 3, "30"]]);
  it("tells what went as planned, what changed, what was skipped or added", () => {
    const sets = [
      { exerciseId: 1, reps: 6, weightKg: 100, completed: true },
      { exerciseId: 1, reps: 5, weightKg: 100, completed: true },
      { exerciseId: 1, reps: 5, weightKg: 102.5, completed: true },
      { exerciseId: 1, reps: 10, weightKg: 60, completed: true, isWarmup: true },
      { exerciseId: 3, reps: 10, weightKg: 0, completed: true },
      { exerciseId: 2, reps: 30, completed: false },
    ];
    expect(planVsDone(planned, sets, exercises)).toEqual([
      { name: "Squat", planned: { sets: 3, reps: "5-8", restSec: 90 }, done: { sets: 3, reps: [6, 5, 5], topKg: 102.5 }, status: "asPlanned" },
      { name: "Plank", planned: { sets: 3, reps: "30", restSec: 90 }, done: null, status: "skipped" },
      { name: "Lunge", planned: null, done: { sets: 1, reps: [10], topKg: null }, status: "added" },
    ]);
    const fewer = planVsDone(planned, sets.slice(0, 2), exercises)[0];
    expect(fewer.status).toBe("changed");
  });
});
