import { describe, expect, it } from "vitest";
import type { Program } from "@/db";
import { exerciseSeries, programReview } from "./programReview";

const program: Program = {
  id: 1,
  uuid: "p1",
  _dirty: 0,
  name: "Force",
  startDate: "2026-09-07",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  structure: [
    { name: "A", week: 1, exercises: [{ exerciseName: "Back Squat", targetSets: 3, targetReps: "5" }, { exerciseName: "Pull-up", targetSets: 3, targetReps: "max" }] },
    { name: "B", week: 2, exercises: [{ exerciseName: "Back Squat", targetSets: 3, targetReps: "5" }, { exerciseName: "Plank", targetSets: 2, targetReps: "45s" }] },
  ],
};
const exercises = [
  { id: 1, name: "Back Squat" },
  { id: 2, name: "Pull-up" },
  { id: 3, name: "Plank" },
];
const workouts = [
  { id: 10, date: "2026-09-07", programId: 1, programDayIndex: 0 },
  { id: 11, date: "2026-09-14", programId: 1, programDayIndex: 1 },
  { id: 12, date: "2026-09-21", programId: 1, programDayIndex: 0 },
  { id: 13, date: "2026-09-22", title: "Footing" },
];
const set = (workoutId: number, exerciseId: number, weightKg: number | null, reps: number, extra = {}) => ({ workoutId, exerciseId, weightKg, reps, completed: true, ...extra });
const sets = [
  set(10, 1, 100, 5),
  set(10, 1, 60, 5, { isWarmup: true }),
  set(10, 2, null, 6),
  set(11, 1, 105, 5),
  set(11, 3, null, 40),
  set(11, 3, null, 50),
  set(12, 1, 110, 5),
  set(12, 1, 120, 2, { completed: false }),
  set(12, 2, null, 9),
  set(13, 1, 200, 5),
];

describe("exerciseSeries", () => {
  it("measures each exercise its own way, session by session", () => {
    const series = exerciseSeries({ program, workouts, sets, exercises });
    expect(series.map((x) => [x.name, x.kind, x.points.map((p) => Math.round(p.value))])).toEqual([
      ["Back Squat", "load", [117, 123, 128]],
      ["Pull-up", "reps", [6, 9]],
      ["Plank", "seconds", [50]],
    ]);
  });
});

describe("programReview", () => {
  const review = programReview({ program, workouts, sets, exercises, today: "2026-10-01" });

  it("counts the sessions and kilos of the program only", () => {
    expect(review).toMatchObject({ sessions: 3, planned: 2, first: "2026-09-07", last: "2026-09-21", volume: 1575, finished: true });
  });

  it("ranks the exercises by their gain", () => {
    expect(review.progress.map((p) => [p.name, Math.round(p.from), Math.round(p.best), p.change])).toEqual([
      ["Pull-up", 6, 9, 50],
      ["Back Squat", 117, 128, 10],
    ]);
  });
});

describe("nextPrograms", () => {
  it("offers the same kind of program, a level up first, never a lower one", async () => {
    const PROGRAM_TEMPLATES = (await import("./templatesForTests")).templatesForTests();
    const { programCategory } = await import("./programCategories");
    const { nextPrograms } = await import("./programReview");
    const beginner = PROGRAM_TEMPLATES.find((t) => t.level === "beginner" && PROGRAM_TEMPLATES.some((o) => o.level === "intermediate" && programCategory(o) === programCategory(t)))!;
    const next = nextPrograms(beginner, PROGRAM_TEMPLATES);
    expect(next.length).toBeGreaterThan(0);
    expect(next.length).toBeLessThanOrEqual(3);
    expect(next.every((t) => t.name !== beginner.name && programCategory(t) === programCategory(beginner))).toBe(true);
    expect(next[0].level).toBe("intermediate");
  });
});
