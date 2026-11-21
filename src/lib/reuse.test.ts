import { describe, expect, it } from "vitest";
import { appendDay, byUse, copyName, dayFromWorkout, lastUsed } from "./reuse";

describe("copyName", () => {
  it("finds a name not taken yet, and never stacks the word", () => {
    expect(copyName("PPL", ["PPL"], "copie")).toBe("PPL (copie)");
    expect(copyName("PPL", ["PPL", "PPL (copie)"], "copie")).toBe("PPL (copie 2)");
    expect(copyName("PPL (copie)", ["PPL", "PPL (copie)"], "copie")).toBe("PPL (copie 2)");
  });
});

describe("dayFromWorkout", () => {
  const exercises = [{ id: 1, name: "Back Squat", uuid: "a" }, { id: 2, name: "Push-up" }, { id: 3, name: "Plank" }];
  it("keeps the exercises in order, the sets done, their reps and rest, no warm-up", () => {
    const sets = [
      { workoutId: 9, exerciseId: 1, isWarmup: true, reps: 10, completed: true },
      { workoutId: 9, exerciseId: 1, reps: 8, restSec: 120, completed: true },
      { workoutId: 9, exerciseId: 1, reps: 6, restSec: 120, completed: true },
      { workoutId: 9, exerciseId: 2, reps: 15, restSec: 60, completed: true },
      { workoutId: 9, exerciseId: 2, reps: 12, completed: false },
      { workoutId: 8, exerciseId: 3, reps: 1, completed: true },
    ];
    expect(dayFromWorkout("Jambes", 9, sets, exercises)).toEqual({
      name: "Jambes",
      exercises: [
        { exerciseName: "Back Squat", exerciseUuid: "a", targetSets: 2, targetReps: "6-8", restSec: 120 },
        { exerciseName: "Push-up", exerciseUuid: undefined, targetSets: 1, targetReps: "15", restSec: 60 },
      ],
    });
  });

  it("keeps a superset, and gives nothing for an empty session", () => {
    const sets = [
      { workoutId: 1, exerciseId: 2, reps: 10, completed: true, supersetGroup: 4 },
      { workoutId: 1, exerciseId: 3, reps: 30, completed: true, supersetGroup: 4 },
    ];
    expect(dayFromWorkout("A", 1, sets, exercises)?.exercises.map((e) => !!e.supersetWithNext)).toEqual([true, false]);
    expect(dayFromWorkout("A", 2, sets, exercises)).toBeNull();
  });
});

describe("byUse", () => {
  it("puts favourites first, then the last used, then the newest", () => {
    const programs = [
      { id: 1, createdAt: "2026-01-01" },
      { id: 2, createdAt: "2026-02-01" },
      { id: 3, createdAt: "2026-03-01", favorite: true },
      { id: 4, createdAt: "2026-04-01" },
    ];
    const used = lastUsed([{ programId: 1, date: "2026-11-20" }, { programId: 2, date: "2026-11-01" }, { programId: 1, date: "2026-10-01" }]);
    expect(byUse(programs, used).map((p) => p.id)).toEqual([3, 1, 2, 4]);
  });
});

describe("appendDay", () => {
  it("puts the day in the last week of a plan", () => {
    expect(appendDay([{ name: "A", exercises: [], week: 3 }], { name: "B", exercises: [] })[1].week).toBe(3);
    expect(appendDay([], { name: "B", exercises: [] })).toEqual([{ name: "B", exercises: [] }]);
  });
});
