import { describe, expect, it } from "vitest";
import { weekSummary } from "./weekSummary";

const monday = "2026-11-09";
const today = "2026-11-12"; // Thursday: compared with last Monday to Thursday.
let next = 1;
const w = (date: string, extra: Record<string, unknown> = {}) => ({ id: next++, date, title: "Séance", ...extra });
const set = (workoutId: number, weightKg: number | undefined, reps: number, completed = true) => ({ workoutId, weightKg, reps, completed, isWarmup: false });

describe("the week in one line", () => {
  it("shows the loaded volume of a weight training week, and its change", () => {
    const now = w("2026-11-10");
    const before = w("2026-11-03");
    const later = w("2026-11-07"); // last Saturday: after the same days, left out.
    const summary = weekSummary({ monday, today, workouts: [now, before, later], sets: [set(now.id, 100, 10), set(now.id, 50, 4), set(before.id, 100, 10), set(later.id, 200, 10)] });
    expect(summary).toEqual({ kind: "volume", kg: 1200, change: 20 });
  });

  it("counts activities, never kilos, in a week of runs and bodyweight work", () => {
    const run = w("2026-11-09", { kind: "cardio", sport: "run", distanceM: 5000 });
    const pushUps = w("2026-11-10");
    const timed = w("2026-11-11", { kind: "interval", durationMin: 20 });
    const left = w("2026-11-12"); // opened, nothing done.
    const lastWeek = w("2026-11-03");
    const summary = weekSummary({ monday, today, workouts: [run, pushUps, timed, left, lastWeek], sets: [set(pushUps.id, undefined, 20), set(pushUps.id, 0, 15), set(lastWeek.id, 80, 10)] });
    expect(summary).toEqual({ kind: "activities", count: 3 });
  });

  it("says nothing was done in an empty week, rather than 0 kg and -100 %", () => {
    const lastWeek = w("2026-11-04");
    expect(weekSummary({ monday, today, workouts: [lastWeek], sets: [set(lastWeek.id, 100, 10)] })).toEqual({ kind: "activities", count: 0 });
  });

  it("gives no change when last week had no loaded sets to compare with", () => {
    const now = w("2026-11-10");
    const lastRun = w("2026-11-03", { kind: "cardio", distanceM: 8000 });
    expect(weekSummary({ monday, today, workouts: [now], sets: [set(now.id, 60, 5)] })).toEqual({ kind: "volume", kg: 300, change: null });
    expect(weekSummary({ monday, today, workouts: [now, lastRun], sets: [set(now.id, 60, 5)] })).toEqual({ kind: "volume", kg: 300, change: null });
  });

  it("leaves out sets not done and warm-up sets", () => {
    const now = w("2026-11-10");
    const summary = weekSummary({ monday, today, workouts: [now], sets: [set(now.id, 100, 10, false), { ...set(now.id, 40, 10), isWarmup: true }] });
    expect(summary).toEqual({ kind: "activities", count: 0 });
  });
});
