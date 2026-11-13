import { describe, expect, it } from "vitest";
import { nudgeFor } from "./nudge";
import type { Adherence } from "./adherence";

const base: Adherence = { weeks: [], rate: 0.9, daysSinceLast: 1, recentRpe: 7, status: "good" };

describe("nudges", () => {
  it("pick the most pressing reason", () => {
    expect(nudgeFor({ ...base, daysSinceLast: null })).toEqual({ kind: "never" });
    expect(nudgeFor({ ...base, daysSinceLast: 6, rate: 0.2 })).toEqual({ kind: "idle", days: 6 });
    expect(nudgeFor({ ...base, rate: 0.5 })).toEqual({ kind: "lowRate", percent: 50 });
    expect(nudgeFor({ ...base, recentRpe: 9.4 })).toEqual({ kind: "hard", rpe: 9.4 });
  });

  it("stay quiet when all is well", () => {
    expect(nudgeFor(base)).toBeNull();
    expect(nudgeFor(undefined)).toBeNull();
  });
});
