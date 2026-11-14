import { describe, expect, it } from "vitest";
import { weekStreak } from "./weekStreak";

const today = "2026-11-12"; // a Thursday
const sessions = (...dates: string[]) => dates.map((date) => ({ date }));

describe("weekStreak", () => {
  it("counts the weeks in a row that reached the target", () => {
    const w = sessions("2026-10-26", "2026-10-28", "2026-11-02", "2026-11-04", "2026-11-09");
    expect(weekStreak({ today, workouts: w, target: 2 })).toEqual({ weeks: 2, thisWeek: 1, target: 2 });
  });

  it("adds the week in progress once its sessions are done", () => {
    const w = sessions("2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11");
    expect(weekStreak({ today, workouts: w, target: 2 }).weeks).toBe(2);
  });

  it("stops at a week short of sessions", () => {
    const w = sessions("2026-10-19", "2026-10-21", "2026-10-26", "2026-11-02", "2026-11-04");
    expect(weekStreak({ today, workouts: w, target: 2 }).weeks).toBe(1);
  });

  it("asks for one session a week at least, and ignores sessions ahead", () => {
    expect(weekStreak({ today, workouts: sessions("2026-11-05", "2026-11-20"), target: 0 })).toEqual({ weeks: 1, thisWeek: 0, target: 1 });
  });
});
