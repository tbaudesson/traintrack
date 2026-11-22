import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/syncEngine", () => ({ schedulePush: () => {} }));

const { default: db, refreshCachedUserId } = await import("@/db");
const { startWorkoutFromDay } = await import("@/lib/startWorkout");

const now = "2026-11-22T08:00:00Z";
const program = {
  id: 1,
  uuid: "p",
  name: "Force",
  structure: [{ key: "d1", name: "Jour A", exercises: [
    { exerciseName: "Back Squat", targetSets: 3, targetReps: "5" },
    { exerciseName: "Développé couché", targetSets: 3, targetReps: "8" },
  ] }],
  _dirty: 0,
  createdAt: now,
  updatedAt: now,
};

describe("starting a session while the screen's library is still loading", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.authMeta.put({ key: "currentUser", userId: "me" });
    await refreshCachedUserId();
    await db.exercises.bulkAdd([
      { name: "Back Squat", muscleGroup: "legs", isCustom: false, uuid: "sq", userId: null, _dirty: 0, createdAt: now, updatedAt: now },
      { name: "Barbell Bench Press", nameFr: "Développé couché", muscleGroup: "chest", isCustom: false, uuid: "bp", userId: null, _dirty: 0, createdAt: now, updatedAt: now },
    ] as never);
  });

  it("uses the library on the device: no copy of an exercise it has", async () => {
    // The screen's list, still empty: what made a copy of every exercise.
    const id = await startWorkoutFromDay(program as never, 0, [], "2026-11-22");
    expect(await db.exercises.filter((e) => e.isCustom).count()).toBe(0);
    const sets = await db.workoutSets.where("workoutId").equals(id).toArray();
    const lib = new Map((await db.exercises.toArray()).map((e) => [e.id, e.uuid]));
    expect(new Set(sets.map((s) => lib.get(s.exerciseId)))).toEqual(new Set(["sq", "bp"]));
  });

  it("still makes one for an exercise nobody has", async () => {
    const odd = { ...program, structure: [{ key: "d1", name: "Jour A", exercises: [{ exerciseName: "Zercher Squat", targetSets: 3, targetReps: "5" }] }] };
    await startWorkoutFromDay(odd as never, 0, [], "2026-11-22");
    expect((await db.exercises.filter((e) => e.isCustom).toArray()).map((e) => e.name)).toEqual(["Zercher Squat"]);
  });
});
