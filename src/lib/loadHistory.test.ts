import { describe, expect, it } from "vitest";
import { disciplineOf, loadSplit, weeklyLoads } from "./loadHistory";

describe("weeklyLoads", () => {
  // 2026-11-20 is a Friday; its week starts on Monday the 16th.
  const today = "2026-11-20";
  const workouts = [
    { id: 1, date: "2026-11-16", kind: "strength" as const, durationMin: 60, sessionRpe: 7 },
    { id: 2, date: "2026-11-18", kind: "cardio" as const, sport: "run" as const, durationSec: 1800, distanceM: 6000, sessionRpe: 6 },
    { id: 3, date: "2026-11-10", kind: "cardio" as const, sport: "swim" as const, durationSec: 2400, distanceM: 2000 },
    { id: 4, date: "2026-11-19", kind: "strength" as const, durationMin: 40, cancelledAt: "2026-11-19" },
    { id: 5, date: "2026-11-01", kind: "cardio" as const, sport: "bike" as const, durationSec: 3600, distanceM: 30000 },
  ];
  const sets = [{ workoutId: 1, completed: true }];
  const weeks = weeklyLoads({ today, workouts, sets, weeks: 3 });

  it("lays the calendar weeks from Monday, the oldest first, this one last", () => {
    expect(weeks.map((w) => w.monday)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
  });

  it("weighs each session in minutes x effort, by discipline, and nothing called off or out of range", () => {
    expect(weeks[2].by.strength).toBe(420);
    expect(weeks[2].by.run).toBe(180);
    expect(weeks[2].total).toBe(600);
    // No RPE given: the usual effort of an outing (6).
    expect(weeks[1].by.swim).toBe(240);
    expect(weeks[0].total).toBe(0);
  });

  it("splits the load between disciplines, in shares of the whole", () => {
    expect(loadSplit(weeks)).toEqual([
      { discipline: "strength", load: 420, share: 50 },
      { discipline: "swim", load: 240, share: 29 },
      { discipline: "run", load: 180, share: 21 },
    ]);
    expect(loadSplit([])).toEqual([]);
  });
});

it("names the discipline of a session", () => {
  expect(disciplineOf({ kind: "interval" })).toBe("timed");
  expect(disciplineOf({ kind: "cardio" as const, sport: "row" })).toBe("other");
  expect(disciplineOf({})).toBe("strength");
});
