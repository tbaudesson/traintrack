import { describe, expect, it } from "vitest";
import {
  INTERVAL_EXERCISES,
  INTERVAL_FOCUSES,
  INTERVAL_MINUTES,
  INTERVAL_PATTERNS,
  NEW_INTERVAL_EXERCISES,
  buildIntervalSession,
  defaultPattern,
  intervalCounts,
  patternSeconds,
  type IntervalPlan,
} from "./intervals";
import { NAMES, DESCRIPTIONS } from "./exerciseNames";

const plan = (over: Partial<IntervalPlan> = {}): IntervalPlan => ({ focus: "full", dumbbells: false, pattern: "45-15", minutes: 20, seed: 7, ...over });

describe("buildIntervalSession", () => {
  it("lasts the minutes asked, the last rest dropped", () => {
    for (const minutes of INTERVAL_MINUTES)
      for (const pattern of INTERVAL_PATTERNS) {
        const s = buildIntervalSession(plan({ minutes, pattern }));
        expect(s.totalSec).toBe(minutes * 60 - patternSeconds(pattern).rest);
        expect(s.steps[s.steps.length - 1].type).toBe("work");
      }
  });

  it("puts a minute of recovery between rounds", () => {
    const s = buildIntervalSession(plan({ minutes: 10 }));
    expect(s.rounds.map((r) => r.length)).toEqual([5, 4]);
    expect(s.steps.filter((x) => x.type === "rest" && x.recovery)).toHaveLength(1);
  });

  it("keeps to the focus and the equipment", () => {
    for (const focus of INTERVAL_FOCUSES) {
      const bare = buildIntervalSession(plan({ focus, minutes: 45 }));
      for (const r of bare.rounds) for (const e of r) {
        expect(e.focus).toContain(focus);
        expect(e.equipment).toBe("bodyweight");
      }
      const weighted = buildIntervalSession(plan({ focus, dumbbells: true, minutes: 30 }));
      expect(weighted.rounds.flat().some((e) => e.equipment === "dumbbell")).toBe(true);
    }
  });

  it("never repeats an exercise inside a round", () => {
    for (const focus of INTERVAL_FOCUSES)
      for (const seed of [1, 2, 3, 4, 5]) {
        const s = buildIntervalSession(plan({ focus, seed, minutes: 45 }));
        for (const r of s.rounds) expect(new Set(r.map((e) => e.name)).size).toBe(r.length);
      }
  });

  it("alternates two circuits in long sessions", () => {
    const s = buildIntervalSession(plan({ minutes: 45 }));
    expect(s.rounds[0].map((e) => e.name)).not.toEqual(s.rounds[1].map((e) => e.name));
    expect(s.rounds[0].map((e) => e.name)).toEqual(s.rounds[2].map((e) => e.name));
  });

  it("keeps the second circuit apart from the first, and dumbbells to about half", () => {
    for (const focus of INTERVAL_FOCUSES)
      for (const dumbbells of [false, true])
        for (const seed of [1, 2, 3, 4, 5, 6]) {
          const [a, b] = buildIntervalSession(plan({ focus, dumbbells, seed, minutes: 45 })).rounds;
          const shared = b.filter((e) => a.some((x) => x.name === e.name)).length;
          // Some repeat when the area has few exercises: no more than needed, or half.
          const pool = INTERVAL_EXERCISES.filter((e) => e.focus.includes(focus) && (dumbbells || e.equipment === "bodyweight")).length;
          expect(shared, `${focus} ${dumbbells} ${seed}`).toBeLessThanOrEqual(Math.max(Math.ceil(a.length / 2), 2 * a.length - pool));
          if (dumbbells) expect(a.filter((e) => e.equipment === "dumbbell").length).toBeLessThanOrEqual(Math.ceil(a.length / 2));
        }
  });

  it("gives the same session for the same seed, another for another", () => {
    const names = (seed: number) => buildIntervalSession(plan({ seed })).rounds[0].map((e) => e.name);
    expect(names(3)).toEqual(names(3));
    expect([4, 5, 6, 8].some((seed) => names(seed).join() !== names(3).join())).toBe(true);
  });
});

describe("intervalCounts", () => {
  it("counts the intervals done of each exercise", () => {
    const s = buildIntervalSession(plan({ minutes: 10 }));
    const counts = intervalCounts(s.steps, 6);
    expect(counts.reduce((n, c) => n + c.count, 0)).toBe(6);
    expect(counts[0].count).toBe(2);
    expect(counts[0].seconds).toBe(90);
  });
});

describe("defaultPattern", () => {
  it("goes harder with the level", () => {
    expect(defaultPattern("beginner")).toBe("30-30");
    expect(defaultPattern("intermediate")).toBe("45-15");
    expect(defaultPattern("advanced")).toBe("50-10");
    expect(defaultPattern(undefined)).toBe("30-30");
  });
});

describe("the exercises", () => {
  it("are all translated, with a description for the new ones", () => {
    for (const e of INTERVAL_EXERCISES) expect(NAMES[e.name], e.name).toBeDefined();
    for (const e of NEW_INTERVAL_EXERCISES) expect(DESCRIPTIONS[e.name], e.name).toBeDefined();
  });
});
