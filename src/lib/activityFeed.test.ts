import { describe, it, expect } from "vitest";
import type { Workout, WorkoutSet } from "@/db";
import { buildActivity } from "./activityFeed";

const workout = (id: number, userId: string, date: string) => ({ id, userId, date }) as Workout;
const set = (workoutId: number, userId: string, weightKg: number, completed = true) =>
  ({ workoutId, userId, exerciseId: 1, setNumber: 1, weightKg, reps: 5, completed }) as WorkoutSet;
const base = { exerciseName: () => "Squat", today: "2026-11-10" };
const lea = { userId: "lea", displayName: "Léa" };

describe("buildActivity", () => {
  it("reports a session and the record it set, newest first", () => {
    const { events } = buildActivity({
      ...base, clients: [lea],
      workouts: [workout(1, "lea", "2026-11-01"), workout(2, "lea", "2026-11-09")],
      sets: [set(1, "lea", 60), set(2, "lea", 70)],
    });
    expect(events.map((e) => e.kind)).toEqual(["record", "session", "session"]);
  });

  it("flags a client who has gone quiet, and one who never started", () => {
    const { inactive } = buildActivity({
      ...base, clients: [lea, { userId: "tom", displayName: "Tom" }],
      workouts: [workout(1, "lea", "2026-11-01")], sets: [set(1, "lea", 60)],
    });
    expect(inactive).toEqual([
      { userId: "tom", name: "Tom", days: null },
      { userId: "lea", name: "Léa", days: 9 },
    ]);
  });

  it("does not flag a client who trained recently", () => {
    const { inactive } = buildActivity({
      ...base, clients: [lea], workouts: [workout(1, "lea", "2026-11-09")], sets: [set(1, "lea", 60)],
    });
    expect(inactive).toEqual([]);
  });

  it("ignores a workout opened but never trained", () => {
    const { events, inactive } = buildActivity({
      ...base, clients: [lea], workouts: [workout(1, "lea", "2026-11-09")], sets: [set(1, "lea", 60, false)],
    });
    expect(events).toEqual([]);
    expect(inactive).toHaveLength(1);
  });

  it("lists a client in two teams once", () => {
    const { inactive } = buildActivity({ ...base, clients: [lea, lea], workouts: [], sets: [] });
    expect(inactive).toHaveLength(1);
  });

  it("keeps other people's data out", () => {
    const { events } = buildActivity({
      ...base, clients: [lea], workouts: [workout(1, "me", "2026-11-09")], sets: [set(1, "me", 60)],
    });
    expect(events).toEqual([]);
  });
});
