import { describe, expect, it } from "vitest";
import { weekGoal } from "./weekGoal";
import type { Program } from "@/db";

const program = {
  id: 1,
  name: "Full Body",
  structure: [
    { name: "Day A", exercises: [] },
    { name: "Day B", exercises: [] },
    { name: "Day C", exercises: [] },
  ],
} as unknown as Program;

const monday = "2026-11-09";
const today = "2026-11-15";
let next = 1;
const session = (date: string, extra: Record<string, unknown> = {}) => ({ id: next++, date, title: "Séance", ...extra });
const done = (id: number) => ({ workoutId: id, completed: true, isWarmup: false });

describe("the week's goal of the program in progress", () => {
  it("counts only the program's sessions done this week, and the rest apart", () => {
    const a = session("2026-11-10", { programId: 1, programDayIndex: 0 });
    const b = session("2026-11-12", { title: "Full Body — Day B" });
    const free = session("2026-11-13");
    const run = session("2026-11-14", { kind: "cardio", distanceM: 5000 });
    const lastWeek = session("2026-11-05", { programId: 1, programDayIndex: 2 });
    const goal = weekGoal({ program, day: program.structure[0], monday, today, workouts: [a, b, free, run, lastWeek], sets: [done(a.id), done(b.id), done(free.id), done(lastWeek.id)] });
    expect(goal).toEqual({ target: 3, done: 2, beyond: 0, others: 2 });
  });

  it("leaves out a session opened and left with nothing done", () => {
    const empty = session("2026-11-11", { programId: 1, programDayIndex: 1 });
    const outing = session("2026-11-11", { kind: "cardio" });
    expect(weekGoal({ program, day: undefined, monday, today, workouts: [empty, outing], sets: [] })).toEqual({ target: 3, done: 0, beyond: 0, others: 0 });
  });

  it("says by how much the goal is passed, instead of showing more done than asked", () => {
    const days = ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"].map((d, i) => session(d, { programId: 1, programDayIndex: i % 3 }));
    const goal = weekGoal({ program, day: undefined, monday, today, workouts: days, sets: days.map((w) => done(w.id)) });
    expect(goal).toEqual({ target: 3, done: 4, beyond: 1, others: 0 });
  });

  it("takes the week of a plan made of weeks", () => {
    const plan = { ...program, structure: [{ name: "S1 A", week: 1, exercises: [] }, { name: "S1 B", week: 1, exercises: [] }, { name: "S2 A", week: 2, exercises: [] }] } as unknown as Program;
    expect(weekGoal({ program: plan, day: plan.structure[2], monday, today, workouts: [], sets: [] }).target).toBe(1);
  });
});
