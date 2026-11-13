import { describe, expect, it } from "vitest";
import { nextLoad } from "./progression";

const set = (weightKg: number, reps: number, rpe?: number) => ({ weightKg, reps, rpe });
const plan = { targetSets: 3, targetReps: "8-10", equipment: "barbell" as const };

describe("next load from the RPE", () => {
  it("jump two steps when it was easy", () => {
    expect(nextLoad({ ...plan, sessions: [[set(60, 9, 6), set(60, 9, 6), set(60, 8, 6)]] })).toMatchObject({ kind: "jump", weightKg: 65 });
  });

  it("go up one step once the target is reached at a reasonable effort", () => {
    expect(nextLoad({ ...plan, sessions: [[set(60, 10, 7), set(60, 10, 8), set(60, 10, 8)]] })).toMatchObject({ kind: "up", weightKg: 62.5 });
  });

  it("hold the weight for more reps when the range is not reached yet", () => {
    expect(nextLoad({ ...plan, sessions: [[set(60, 9, 7), set(60, 8, 8), set(60, 8, 8)]] })).toMatchObject({ kind: "moreReps", weightKg: 60 });
  });

  it("hold when it was very hard, even at the top of the range", () => {
    expect(nextLoad({ ...plan, sessions: [[set(60, 10, 8), set(60, 10, 9), set(60, 10, 10)]] })).toMatchObject({ kind: "hold", weightKg: 60, rpe: 10 });
  });

  it("ease off after two hard sessions with missed reps", () => {
    const hard = [set(60, 7, 9.5), set(60, 6, 10), set(60, 5, 10)];
    expect(nextLoad({ ...plan, sessions: [hard, hard] })).toMatchObject({ kind: "deload", weightKg: 52.5 });
  });

  it("keep the old rule when no RPE was noted", () => {
    expect(nextLoad({ ...plan, sessions: [[set(60, 10), set(60, 10), set(60, 10)]] })).toMatchObject({ kind: "up", weightKg: 62.5 });
    expect(nextLoad({ ...plan, sessions: [[set(60, 9), set(60, 10), set(60, 10)]] })).toBeNull();
    expect(nextLoad({ ...plan, sessions: [[set(60, 10)]] })).toBeNull();
  });

  it("use dumbbell steps, and stay quiet for timed holds or no history", () => {
    expect(nextLoad({ ...plan, equipment: "dumbbell", sessions: [[set(20, 10, 8), set(20, 10, 8), set(20, 10, 8)]] })?.weightKg).toBe(22);
    expect(nextLoad({ targetReps: "30-45s", sessions: [[set(10, 40, 6)]] })).toBeNull();
    expect(nextLoad({ ...plan, sessions: [] })).toBeNull();
  });
});
