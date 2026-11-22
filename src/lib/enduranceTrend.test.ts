import { describe, expect, it } from "vitest";
import { enduranceTrend, trendSports } from "./enduranceTrend";

const run = (date: string, km: number, min: number) => ({ date, kind: "cardio" as const, sport: "run" as const, distanceM: km * 1000, durationSec: min * 60 });

describe("the curves of an endurance sport", () => {
  const ws = [run("2026-10-01", 10, 55), run("2026-10-15", 10, 52), run("2026-11-01", 0.5, 3), run("2026-11-10", 8, 40)];

  it("give the pace of each session long enough to mean something", () => {
    expect(enduranceTrend(ws, "run", "2026-09-01", "2026-11-22").map((p) => p.pace)).toEqual([330, 312, 300]);
  });

  it("prefer the normalized power to the average", () => {
    const ride = { date: "2026-11-02", kind: "cardio" as const, sport: "bike" as const, distanceM: 40000, durationSec: 4800, avgPowerW: 180, normalizedPowerW: 205 };
    expect(enduranceTrend([ride], "bike", "2026-11-01", "2026-11-22")[0].power).toBe(205);
  });

  it("offer the sports with three sessions or more", () => {
    expect(trendSports(ws, "2026-09-01", "2026-11-22")).toEqual(["run"]);
  });
});
