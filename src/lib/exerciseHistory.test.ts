import { describe, expect, it } from "vitest";
import { exerciseHistory } from "./exerciseHistory";

const workouts = [
  { id: 1, date: "2026-10-01", title: "A" },
  { id: 2, date: "2026-10-08", title: "A" },
  { id: 3, date: "2026-10-15", title: "B" },
];
const set = (workoutId: number, setNumber: number, weightKg: number | undefined, reps: number, extra = {}) => ({
  workoutId, exerciseId: 7, setNumber, weightKg, reps, completed: true, ...extra,
});

describe("exerciseHistory", () => {
  const sets = [
    set(1, 1, 60, 10), set(1, 2, 60, 8),
    set(2, 0, 20, 10, { isWarmup: true }), set(2, 1, 65, 8), set(2, 2, 65, 8, { rpe: 9 }),
    set(3, 1, 70, 5), set(3, 2, 70, 3),
    { ...set(3, 3, 100, 1), exerciseId: 8 },
    { ...set(3, 4, 90, 5), completed: false },
  ];
  const h = exerciseHistory(7, workouts, sets);

  it("lists the sessions, most recent first, without warm-ups or unfinished sets", () => {
    expect(h.sessions.map((s) => s.date)).toEqual(["2026-10-15", "2026-10-08", "2026-10-01"]);
    expect(h.sessions[1].sets).toEqual([{ weightKg: 65, reps: 8, rpe: undefined }, { weightKg: 65, reps: 8, rpe: 9 }]);
    expect(h.sessions[0].sets).toHaveLength(2);
  });

  it("sums each session", () => {
    expect(h.sessions[2]).toMatchObject({ topKg: 60, volume: 1080, bestReps: 10 });
    expect(h.sessions[0].oneRepMax).toBeCloseTo(81.7, 1);
  });

  it("keeps the records, and when they were set", () => {
    expect(h.records.heaviest).toMatchObject({ value: { kg: 70, reps: 5 }, date: "2026-10-15" });
    expect(h.records.volume).toMatchObject({ value: 1080, date: "2026-10-01" });
    expect(h.records.reps).toMatchObject({ value: 10, date: "2026-10-01" });
    // 65 kg × 8 (82.3) beats 70 kg × 5 (81.7).
    expect(h.records.oneRepMax?.date).toBe("2026-10-08");
  });

  it("works for bodyweight and timed exercises", () => {
    const plank = exerciseHistory(7, workouts, [set(1, 1, undefined, 30), set(2, 1, undefined, 45)]);
    expect(plank.records.heaviest).toBeNull();
    expect(plank.records.reps).toMatchObject({ value: 45, date: "2026-10-08" });
    expect(plank.sessions[0].topKg).toBeNull();
  });
});
