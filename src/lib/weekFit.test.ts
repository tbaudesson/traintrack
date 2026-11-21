import { describe, expect, it } from "vitest";
import type { Program } from "@/db";
import { fitWeek } from "./weekFit";
import { plannedPrograms, scheduleSessions } from "./schedule";

// 2026-11-23 is a Monday.
const today = "2026-11-23";
const program = {
  id: 1,
  uuid: "p1",
  name: "PPL",
  weekdays: [1, 3, 5],
  startDate: "2026-11-02",
  createdAt: "2026-11-01",
  updatedAt: "2026-11-01",
  structure: [
    { name: "Push", exercises: Array.from({ length: 6 }, (_, i) => ({ exerciseName: `E${i}`, targetSets: 4, targetReps: "8-10", restSec: 120 })) },
    { name: "Pull", exercises: [{ exerciseName: "Row", targetSets: 3, targetReps: "10", restSec: 60 }] },
    { name: "Legs", exercises: [{ exerciseName: "Squat", targetSets: 3, targetReps: "5", restSec: 120 }] },
  ],
} as unknown as Program;

function setup() {
  const planned = plannedPrograms({ programs: [program], me: "me", trainingDays: [1, 3, 5], from: today });
  const sessions = scheduleSessions({ planned, workouts: [], from: today, to: "2026-11-29", today });
  return { planned, sessions };
}

describe("fitWeek", () => {
  it("moves a session off a day without time, to the free day with the most minutes", () => {
    const { planned, sessions } = setup();
    const out = fitWeek({ today, planned, sessions, availability: { monday: today, days: [{ weekday: 1, minutes: 90 }, { weekday: 2, minutes: 30 }, { weekday: 4, minutes: 60 }, { weekday: 5, minutes: 60 }] } });
    // Wednesday (3) has no time: to Thursday (60 min) rather than Tuesday (30).
    expect(out.find((f) => f.type === "move")).toMatchObject({ program: "p1", from: "2026-11-25", to: "2026-11-26" });
  });

  it("skips what no free day can take, and shortens a session longer than the time there is", () => {
    const { planned, sessions } = setup();
    const out = fitWeek({ today, planned, sessions, availability: { monday: today, days: [{ weekday: 1, minutes: 45 }, { weekday: 5, minutes: 60 }] } });
    expect(out.map((f) => f.type)).toEqual(["shorten", "skip"]);
    const short = out[0];
    expect(short).toMatchObject({ type: "shorten", date: "2026-11-23", minutes: 45, label: "Push" });
    expect(short.type === "shorten" && short.planned > 45).toBe(true);
  });

  it("says nothing without availability, or for another week", () => {
    const { planned, sessions } = setup();
    expect(fitWeek({ today, planned, sessions, availability: null })).toEqual([]);
    expect(fitWeek({ today, planned, sessions, availability: { monday: "2026-11-09", days: [] } })).toEqual([]);
  });
});
