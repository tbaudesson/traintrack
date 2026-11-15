import { describe, expect, it } from "vitest";
import { doneSessions } from "./doneSessions";
import { weekSummary } from "./weekSummary";
import { weekGoal } from "./weekGoal";
import { insights } from "./insights";
import type { Program } from "@/db";

const today = "2026-11-15";
const monday = "2026-11-09";

// One session of each kind, this week; done or not.
const workouts = [
  { id: 1, date: "2026-11-09", title: "Force, une série faite", kind: "strength" as const },
  { id: 2, date: "2026-11-09", title: "Force, échauffement seul", kind: "strength" as const },
  { id: 3, date: "2026-11-10", title: "Force, rien de coché", kind: "strength" as const },
  { id: 4, date: "2026-11-10", title: "Séance libre ouverte puis laissée" },
  { id: 5, date: "2026-11-11", title: "Course avec distance", kind: "cardio" as const, sport: "run" as const, distanceM: 5000 },
  { id: 6, date: "2026-11-11", title: "Vélo avec durée seule", kind: "cardio" as const, sport: "bike" as const, durationSec: 1800 },
  { id: 7, date: "2026-11-12", title: "Sortie ouverte, rien saisi", kind: "cardio" as const, sport: "run" as const },
  { id: 8, date: "2026-11-12", title: "Séance minutée", kind: "interval" as const, durationMin: 20 },
  { id: 9, date: "2026-11-13", title: "Voltige, temps saisi", kind: "cardio" as const, sport: "vaulting" as const, durationSec: 2700 },
  { id: 10, date: "2026-11-13", title: "Séance minutée vide", kind: "interval" as const },
];
const sets = [
  { workoutId: 1, exerciseId: 1, setNumber: 1, completed: true, isWarmup: false, weightKg: 60, reps: 8 },
  { workoutId: 1, exerciseId: 1, setNumber: 2, completed: false, isWarmup: false, weightKg: 60 },
  { workoutId: 2, exerciseId: 1, setNumber: 1, completed: true, isWarmup: true, weightKg: 30, reps: 10 },
  { workoutId: 3, exerciseId: 1, setNumber: 1, completed: false, isWarmup: false, weightKg: 60, reps: 8 },
];
const DONE = [1, 5, 6, 8, 9];

describe("a session done", () => {
  it("is one with a working set ticked, a distance or a time, whatever its kind", () => {
    expect(doneSessions(workouts, sets).map((w) => w.id)).toEqual(DONE);
  });

  it("leaves out a session opened then left, a warm-up alone, and sets not ticked", () => {
    const left = workouts.filter((w) => !DONE.includes(w.id)).map((w) => w.title);
    expect(left).toEqual(["Force, échauffement seul", "Force, rien de coché", "Séance libre ouverte puis laissée", "Sortie ouverte, rien saisi", "Séance minutée vide"]);
  });

  it("is the same set of sessions for the week's goal, the week's line and the insights", () => {
    const program = { id: 99, name: "Programme", structure: [{ name: "A", exercises: [] }] } as unknown as Program;
    const goal = weekGoal({ program, day: program.structure[0], monday, today, workouts, sets });
    expect(goal.done + goal.others).toBe(DONE.length);
    // The week's line: kilos here (a loaded set was done), so count with no loaded sets at all.
    const unloaded = sets.map((s) => ({ ...s, weightKg: undefined }));
    expect(weekSummary({ monday, today, workouts, sets: unloaded })).toEqual({ kind: "activities", count: DONE.length });
    const steady = insights({ today, workouts, sets: unloaded }).insights.find((i) => i.kind === "steady");
    expect(steady?.values.sessions).toBe(DONE.length);
  });
});

describe("the weeks kept in a row", () => {
  it("count only sessions done: a week of sessions opened then left breaks the streak", async () => {
    const { weekStreak } = await import("./weekStreak");
    // Two sessions a week planned; last week's two were opened and left.
    const weeks = [
      { id: 101, date: "2026-11-02" }, { id: 102, date: "2026-11-04" }, // last week, empty
      { id: 103, date: "2026-10-26" }, { id: 104, date: "2026-10-28" }, // done
      { id: 105, date: "2026-10-19" }, { id: 106, date: "2026-10-21" }, // done
    ];
    const ticked = [103, 104, 105, 106].map((workoutId) => ({ workoutId, completed: true, isWarmup: false }));
    const all = weekStreak({ today, workouts: weeks, target: 2 });
    const done = weekStreak({ today, workouts: doneSessions(weeks, ticked), target: 2 });
    expect(all?.weeks).toBeGreaterThan(done?.weeks ?? 0);
    expect(done?.weeks ?? 0).toBe(0);
  });
});
