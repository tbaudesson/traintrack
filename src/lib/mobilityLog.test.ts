import { describe, expect, it } from "vitest";
import { mobilityStats } from "./mobilityLog";

const m = (date: string, mode: "warmup" | "stretch", rating: number | null, moves: string[], durationSec = 600) => ({
  date,
  kind: "mobility" as const,
  durationSec,
  mobility: { mode, minutes: durationSec / 60, target: "full" as const, moves, rating },
});

describe("mobilityStats", () => {
  const today = "2026-11-21";
  const workouts = [
    m("2026-10-01", "stretch", 2, ["quad"]),
    m("2026-10-10", "stretch", 2, ["quad", "pigeon"]),
    m("2026-11-01", "stretch", 3, ["quad", "pigeon"]),
    m("2026-11-15", "warmup", null, ["jumping-jack"], 300),
    m("2026-11-20", "stretch", 4, ["pigeon", "quad", "pigeon"]),
    { date: "2026-11-20", kind: "strength" as const, durationSec: 3600 },
    { ...m("2026-11-19", "stretch", 1, ["quad"]), cancelledAt: "2026-11-19" },
  ];
  const s = mobilityStats(workouts, today);

  it("counts the last four weeks, a session called off or another kind left out", () => {
    expect([s.sessions, s.minutes, s.stretches, s.warmups]).toEqual([3, 25, 2, 1]);
  });

  it("follows the suppleness felt, and compares it once there are two ratings on each side", () => {
    expect(s.ratings.map((r) => r.rating)).toEqual([2, 2, 3, 4]);
    expect([s.now, s.before]).toEqual([3.5, 2]);
    expect(mobilityStats(workouts.slice(2), today).now).toBeNull();
  });

  it("names the moves done most, each once a session", () => {
    expect(s.topMoves).toEqual([{ key: "pigeon", count: 2 }, { key: "quad", count: 2 }, { key: "jumping-jack", count: 1 }]);
  });
});
