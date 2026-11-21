import { describe, expect, it } from "vitest";
import type { Exercise, Program } from "@/db";
import { applyChange, coachProposals } from "./coach";

const exercises = [
  { id: 1, name: "Back Squat", muscleGroup: "legs" as const, equipment: "barbell" as const },
  { id: 2, name: "Leg Press", muscleGroup: "legs" as const, equipment: "machine" as const },
  { id: 3, name: "Goblet Squat", muscleGroup: "legs" as const, equipment: "dumbbell" as const },
  { id: 4, name: "Plank", muscleGroup: "core" as const, equipment: "bodyweight" as const },
  { id: 5, name: "Crunch", muscleGroup: "core" as const, equipment: "bodyweight" as const },
] as unknown as Exercise[];
const program = (over: Partial<Program> = {}): Program => ({
  id: 7,
  uuid: "p7",
  name: "Legs",
  createdAt: "2026-10-01",
  updatedAt: "2026-10-01",
  structure: [{ key: "a", name: "Day A", exercises: [
    { exerciseName: "Back Squat", targetSets: 3, targetReps: "8-10", restSec: 120 },
    { exerciseName: "Leg Press", targetSets: 3, targetReps: "10-12", restSec: 90 },
    { exerciseName: "Plank", targetSets: 3, targetReps: "30", restSec: 60 },
  ] }],
  ...over,
}) as Program;
const session = (id: number, date: string) => ({ id, date, title: "Legs — Day A", programId: 7, programDayIndex: 0 });
const sets = (workoutId: number, exerciseId: number, reps: number[]) => reps.map((r) => ({ workoutId, exerciseId, reps: r, completed: true }));

describe("coachProposals", () => {
  const today = "2026-11-21";
  const workouts = [session(1, "2026-11-10"), session(2, "2026-11-14"), session(3, "2026-11-18")];

  it("offers a stand-in for an exercise skipped in 2 of the last 3 sessions, with what it saw", () => {
    const done = [1, 2, 3].flatMap((w) => [...sets(w, 1, [8, 8, 8]), ...sets(w, 4, [30, 30, 30])]).concat(sets(1, 2, [10, 10, 10]));
    const out = coachProposals({ today, programs: [program()], workouts, sets: done, exercises, owned: ["dumbbell"] });
    const skipped = out.find((p) => p.kind === "skipped")!;
    expect(skipped.exercise).toBe("Leg Press");
    expect(skipped.evidence).toEqual([{ key: "skipped", values: { count: 2, of: 3 } }]);
    // The same muscles, owned equipment first, nothing already in the day.
    expect(skipped.change).toEqual({ type: "replace", programId: 7, day: 0, from: "Leg Press", to: "Goblet Squat" });
    // Never one the athlete has no equipment for: with bands only, nothing for the legs but removal.
    const bands = coachProposals({ today, programs: [program()], workouts, sets: done, exercises, owned: ["bands"] });
    expect(bands.find((p) => p.kind === "skipped")!.change.type).toBe("remove");
    // Nothing to stand in when every option is to avoid: it is removed instead.
    const none = coachProposals({ today, programs: [program()], workouts, sets: done, exercises, avoid: () => true });
    expect(none.find((p) => p.kind === "skipped")!.change).toEqual({ type: "remove", programId: 7, day: 0, exercise: "Leg Press" });
  });

  it("adds a set to an exercise done every time at the top of its range", () => {
    const done = [1, 2, 3].flatMap((w) => [...sets(w, 1, [10, 10, 11]), ...sets(w, 2, [11, 12, 12]), ...sets(w, 4, [30, 30, 30])]);
    const out = coachProposals({ today, programs: [program()], workouts, sets: done, exercises });
    expect(out.map((p) => `${p.kind}:${p.exercise}`)).toEqual(["progress:Back Squat", "progress:Plank"]);
  });

  it("lightens a session cut short every time, and needs three sessions to say anything", () => {
    const done = [1, 2, 3].flatMap((w) => [...sets(w, 1, [8, 8]), ...sets(w, 2, [10, 10]), ...sets(w, 4, [30])]);
    const out = coachProposals({ today, programs: [program()], workouts, sets: done, exercises });
    expect(out.map((p) => p.kind)).toEqual(["shortened"]);
    expect(out[0].evidence[0].values).toEqual({ percent: 56, count: 3 });
    expect(coachProposals({ today, programs: [program()], workouts: workouts.slice(1), sets: done, exercises })).toEqual([]);
  });

  it("moves a weekday missed twice to another training day", () => {
    const p = program({ weekdays: [1, 4] });
    const schedule = [
      { date: "2026-11-02", status: "missed" as const, program: p },
      { date: "2026-11-09", status: "missed" as const, program: p },
      { date: "2026-11-05", status: "done" as const, program: p },
    ];
    const out = coachProposals({ today, programs: [p], workouts: [], sets: [], exercises, schedule, trainingDays: [1, 3, 4] });
    expect(out).toHaveLength(1);
    expect(out[0].change).toEqual({ type: "moveWeekday", programId: 7, from: 1, to: 3 });
    expect(out[0].evidence[0].values).toEqual({ weekday: 1, count: 2 });
  });
});

describe("applyChange", () => {
  it("makes each change on a copy, the program itself untouched", () => {
    const p = program({ weekdays: [1, 4] });
    const replaced = applyChange(p, { type: "replace", programId: 7, day: 0, from: "Leg Press", to: "Goblet Squat" }).structure![0];
    expect(replaced.exercises.map((e) => e.exerciseName)).toEqual(["Back Squat", "Goblet Squat", "Plank"]);
    expect(p.structure[0].exercises[1].exerciseName).toBe("Leg Press");
    expect(applyChange(p, { type: "remove", programId: 7, day: 0, exercise: "Plank" }).structure![0].exercises).toHaveLength(2);
    expect(applyChange(p, { type: "addSet", programId: 7, day: 0, exercise: "Back Squat" }).structure![0].exercises[0].targetSets).toBe(4);
    expect(applyChange(p, { type: "trimDay", programId: 7, day: 0 }).structure![0].exercises.map((e) => e.targetSets)).toEqual([2, 2, 2]);
    expect(applyChange(p, { type: "moveWeekday", programId: 7, from: 1, to: 3 }).weekdays).toEqual([3, 4]);
  });
});
