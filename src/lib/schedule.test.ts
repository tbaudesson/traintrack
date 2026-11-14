import { describe, expect, it } from "vitest";
import type { Program } from "@/db";
import { plannedPrograms, scheduleSessions, scheduleWeek, sessionsPerWeek, suggestDays, weekdayOf } from "./schedule";

const program = (p: Partial<Program> & { id: number; name: string }): Program => ({
  uuid: `u${p.id}`,
  _dirty: 0,
  structure: [],
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
  ...p,
});

// A plan in weeks: two sessions a week, for two weeks.
const plan = program({
  id: 1,
  name: "Calisthenics",
  startDate: "2026-11-09", // a Monday
  weekdays: [1, 3, 5],
  structure: [
    { name: "C1", week: 1, exercises: [] },
    { name: "C2", week: 1, exercises: [] },
    { name: "C3", week: 2, exercises: [] },
    { name: "C4", week: 2, exercises: [] },
  ],
});
// A rotation, on Tuesdays and Saturdays.
const rotation = program({
  id: 2,
  name: "Full Body",
  weekdays: [2, 6],
  structure: [
    { name: "A", exercises: [] },
    { name: "B", exercises: [] },
    { name: "C", exercises: [] },
  ],
});

const today = "2026-11-12"; // Thursday of week 1
const planned = plannedPrograms({ programs: [plan, rotation, program({ id: 3, name: "Unplanned", structure: [{ name: "X", exercises: [] }] })], me: "me", trainingDays: [], from: "2026-11-09" });
const workouts = [
  { id: 10, date: "2026-11-09", title: "Calisthenics — C1", programId: 1, programDayIndex: 0 },
  { id: 11, date: "2026-11-10", title: "Full Body — A", programId: 2, programDayIndex: 0 },
  { id: 12, date: "2026-11-11", title: "Footing", programId: null, programDayIndex: null },
];

describe("scheduleSessions", () => {
  const sessions = scheduleSessions({ planned, workouts, from: "2026-11-09", to: "2026-11-22", today });
  const on = (date: string) => sessions.filter((s) => s.date === date).map((s) => `${s.program.name}:${s.label}:${s.status}`);

  it("leaves out a program without days", () => {
    expect(planned.map((p) => p.program.name)).toEqual(["Calisthenics", "Full Body"]);
  });

  it("marks what was done, and a planned day missed while its week has sessions left", () => {
    expect(on("2026-11-09")).toEqual(["Calisthenics:C1:done"]);
    expect(on("2026-11-10")).toEqual(["Full Body:A:done"]);
    expect(on("2026-11-11")).toEqual(["Calisthenics:Calisthenics:missed"]);
  });

  it("moves the session of a missed day to the next planned day of the week", () => {
    expect(on("2026-11-12")).toEqual([]); // Thursday: no program on it
    expect(on("2026-11-13")).toEqual(["Calisthenics:C2:planned"]);
  });

  it("gives each week of a plan its own sessions, and goes on with a rotation", () => {
    expect(on("2026-11-14")).toEqual(["Full Body:B:planned"]);
    expect(on("2026-11-16")).toEqual(["Calisthenics:C3:planned"]);
    expect(on("2026-11-17")).toEqual(["Full Body:C:planned"]);
    expect(on("2026-11-18")).toEqual(["Calisthenics:C4:planned"]);
    expect(on("2026-11-20")).toEqual([]); // week 2 has no third session
    expect(on("2026-11-21")).toEqual(["Full Body:A:planned"]);
  });

  it("stops a plan at its end", () => {
    const later = scheduleSessions({ planned, workouts, from: "2026-11-23", to: "2026-11-29", today });
    expect(later.every((s) => s.program.name === "Full Body")).toBe(true);
    expect(plannedPrograms({ programs: [plan], me: "me", trainingDays: [], from: "2026-11-23" })).toEqual([]);
  });

  it("lays a later window from today, without skipping what comes before it", () => {
    const next = scheduleSessions({ planned, workouts, from: "2026-11-16", to: "2026-11-17", today });
    expect(next.map((s) => s.label)).toEqual(["C3", "C"]);
  });
});

describe("scheduleWeek", () => {
  const sessions = scheduleSessions({ planned, workouts, from: "2026-11-09", to: "2026-11-15", today });
  const week = scheduleWeek({ monday: "2026-11-09", today, planned, sessions, workouts });

  it("gives each day its status and keeps what was done outside the programs", () => {
    expect(week.map((d) => d.status)).toEqual(["done", "done", "missed", "rest", "planned", "planned", "rest"]);
    expect(week[2].others).toEqual(["Footing"]);
    expect(week[3].today).toBe(true);
  });
});

describe("a coach's program", () => {
  const coach = program({ id: 4, name: "From coach", startDate: "2026-11-09", ownerUserId: "coach", assignedToUserId: "me", structure: [{ name: "K", exercises: [] }] });

  it("is planned on the athlete's training days once the coach dates it", () => {
    const [p] = plannedPrograms({ programs: [coach], me: "me", trainingDays: [4], from: "2026-11-09" });
    expect(p.days).toEqual([4]);
    expect(plannedPrograms({ programs: [{ ...coach, startDate: null }], me: "me", trainingDays: [4], from: "2026-11-09" })).toEqual([]);
  });
});

describe("days", () => {
  it("counts the sessions a week of a program", () => {
    expect(sessionsPerWeek(plan)).toBe(2);
    expect(sessionsPerWeek(rotation)).toBe(3);
  });

  it("suggests the training days first, then days spread over the week", () => {
    expect(suggestDays(3, [2, 4, 6, 7])).toEqual([2, 4, 6]);
    expect(suggestDays(3, [])).toEqual([1, 3, 5]);
    expect(suggestDays(3, [6])).toEqual([1, 3, 6]);
  });

  it("knows the day of the week", () => {
    expect(["2026-11-09", "2026-11-15"].map(weekdayOf)).toEqual([1, 7]);
  });
});
