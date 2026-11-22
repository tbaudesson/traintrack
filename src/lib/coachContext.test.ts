import { describe, expect, it } from "vitest";
import type { AthleteProfile, Program, Workout, WorkoutSet } from "@/db";
import { coachContext } from "./coachContext";

describe("coachContext", () => {
  const today = "2026-11-22";
  const text = coachContext({
    today,
    profile: { fitnessLevel: "intermediate", goals: ["strength"], equipment: ["barbell"], trainingDays: [1, 3, 5], displayName: "Thomas", email: "x@y.z" } as unknown as AthleteProfile,
    programs: [{ id: 1, name: "5x5", weekdays: [1, 3, 5], structure: [{ name: "A", exercises: [{ exerciseName: "Back Squat", targetSets: 5, targetReps: "5" }] }] } as unknown as Program],
    workouts: [
      { id: 1, date: "2026-10-05", title: "5x5 — A", kind: "strength", durationMin: 60, sessionRpe: 7 },
      { id: 2, date: "2026-11-20", title: "5x5 — A", kind: "strength", durationMin: 55, sessionRpe: 8, feeling: 4, notes: "private note" },
      { id: 3, date: "2026-11-18", title: "Run", kind: "cardio", sport: "run", distanceM: 8000, durationSec: 2700 },
      { id: 4, date: "2026-11-19", title: "Called off", kind: "strength", cancelledAt: "x" },
    ] as unknown as Workout[],
    sets: [
      { workoutId: 1, exerciseId: 9, weightKg: 100, reps: 5, completed: true },
      { workoutId: 2, exerciseId: 9, weightKg: 110, reps: 5, completed: true },
    ] as unknown as WorkoutSet[],
    exercises: [{ id: 9, name: "Back Squat" }],
    injuries: [{ area: "knee", since: "2026-11-01" }],
    pains: [{ date: "2026-11-15", area: "knee", level: 4 }],
    readiness: [{ date: "2026-11-20", score: 70 }],
    proposals: [],
  });

  it("tells the profile, injuries, programs and sessions, newest first, a session called off left out", () => {
    expect(text).toContain("level intermediate");
    expect(text).toContain("knee since 2026-11-01");
    expect(text).toContain("5x5, planned on days 1,3,5: A (Back Squat 5x5)");
    expect(text.indexOf("2026-11-20")).toBeLessThan(text.indexOf("2026-11-18"));
    expect(text).toContain("run 8 km");
    expect(text).toContain("effort 8/10, felt 4/5");
    expect(text).not.toContain("Called off");
  });

  it("follows the main lifts from the first weeks to the last", () => {
    expect(text).toMatch(/Back Squat: 116\.7 → 128\.3 kg/);
  });

  it("never carries the athlete's name, email or notes", () => {
    expect(text).not.toContain("Thomas");
    expect(text).not.toContain("x@y.z");
    expect(text).not.toContain("private note");
  });
});
