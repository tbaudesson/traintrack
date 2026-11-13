import { describe, expect, it } from "vitest";
import { deloadAdvice, deloadSets } from "./deload";

// Today: Wednesday 11 November 2026; this week starts Monday 9.
const today = "2026-11-11";

/** One session a week on the given Mondays, each with three sets. */
function history(mondays: string[], options: { kg?: (i: number) => number; rpe?: number } = {}) {
  const workouts = mondays.map((date, i) => ({ id: i + 1, date, kind: "strength" }));
  const sets = workouts.flatMap((w, i) =>
    [1, 2, 3].map(() => ({ workoutId: w.id, completed: true, weightKg: options.kg?.(i) ?? 100, reps: 5, rpe: options.rpe ?? 7 }))
  );
  return { workouts, sets };
}

const fiveWeeks = ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"];

describe("deload week", () => {
  it("come after five training weeks in a row", () => {
    expect(deloadAdvice({ today, ...history(fiveWeeks) })).toMatchObject({ reason: "weeks", weeks: 5 });
    expect(deloadAdvice({ today, ...history(fiveWeeks.slice(1)) })).toBeNull();
  });

  it("count a week off or a light week as rest", () => {
    const withGap = ["2026-09-21", "2026-09-28", "2026-10-05", "2026-10-19", "2026-10-26", "2026-11-02"];
    expect(deloadAdvice({ today, ...history(withGap) })).toBeNull();
    const light = history(["2026-09-28", ...fiveWeeks], { kg: (i) => (i === 3 ? 40 : 100) });
    expect(deloadAdvice({ today, ...light })).toBeNull();
  });

  it("come sooner when the RPE or the readiness says tired", () => {
    const recent = ["2026-10-26", "2026-11-02", "2026-11-04"];
    expect(deloadAdvice({ today, ...history(recent, { rpe: 9.5 }) })).toMatchObject({ reason: "rpe", rpe: 9.5 });
    const readiness = ["2026-11-06", "2026-11-08", "2026-11-10"].map((date) => ({ date, score: 40 }));
    expect(deloadAdvice({ today, ...history(recent), readiness })).toMatchObject({ reason: "readiness", readiness: 40 });
  });

  it("stay quiet once the week is chosen as a deload, and after one", () => {
    expect(deloadAdvice({ today, ...history(fiveWeeks), deloadWeek: "2026-11-09" })).toBeNull();
    expect(deloadAdvice({ today, ...history(fiveWeeks), deloadWeek: "2026-10-19" })).toBeNull();
  });

  it("keep about 60 % of the sets", () => {
    expect([1, 2, 3, 4, 5].map(deloadSets)).toEqual([1, 1, 2, 2, 3]);
  });
});
