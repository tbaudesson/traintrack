import { describe, expect, it } from "vitest";
import {
  INTERVAL_FOCUSES,
  buildIntervalSession,
  defaultPattern,
  exercisesPerRound,
  intervalCounts,
  roundsDone,
  parseTimed,
  patternSeconds,
  type CircuitPlan,
} from "./intervals";
import { libraryFromMigrations } from "./libraryFromMigrations";
import { timedFromMigrations } from "./injuryGuidanceFromMigrations";

const G = timedFromMigrations();

const LIBRARY = new Map(libraryFromMigrations().map((r) => [r.name, r]));


const plan = (over: Partial<CircuitPlan> = {}): CircuitPlan => ({ focus: "full", dumbbells: false, pattern: "45-15", minutes: 20, seed: 7, ...over });

describe("buildIntervalSession", () => {
  it("lasts the minutes asked, the last rest dropped", () => {
    for (const minutes of G.minutes)
      for (const pattern of G.patterns) {
        const s = buildIntervalSession(G, plan({ minutes, pattern }));
        expect(s.totalSec).toBe(minutes * 60 - patternSeconds(pattern).rest);
        expect(s.steps[s.steps.length - 1].type).toBe("work");
      }
  });

  it("puts a minute of recovery between rounds", () => {
    const s = buildIntervalSession(G, plan({ minutes: 10 }));
    expect(s.rounds.map((r) => r.length)).toEqual([5, 4]);
    expect(s.steps.filter((x) => x.type === "rest" && x.recovery)).toHaveLength(1);
  });

  it("keeps to the focus and the equipment", () => {
    for (const focus of INTERVAL_FOCUSES) {
      const bare = buildIntervalSession(G, plan({ focus, minutes: 45 }));
      for (const r of bare.rounds) for (const e of r) {
        expect(e.focus).toContain(focus);
        expect(e.equipment).toBe("bodyweight");
      }
      const weighted = buildIntervalSession(G, plan({ focus, dumbbells: true, minutes: 30 }));
      expect(weighted.rounds.flat().some((e) => e.equipment === "dumbbell")).toBe(true);
    }
  });

  it("never repeats an exercise inside a round", () => {
    for (const focus of INTERVAL_FOCUSES)
      for (const seed of [1, 2, 3, 4, 5]) {
        const s = buildIntervalSession(G, plan({ focus, seed, minutes: 45 }));
        for (const r of s.rounds) expect(new Set(r.map((e) => e.name)).size).toBe(r.length);
      }
  });

  it("alternates two circuits in long sessions", () => {
    const s = buildIntervalSession(G, plan({ minutes: 45 }));
    expect(s.rounds[0].map((e) => e.name)).not.toEqual(s.rounds[1].map((e) => e.name));
    expect(s.rounds[0].map((e) => e.name)).toEqual(s.rounds[2].map((e) => e.name));
  });

  it("keeps the second circuit apart from the first, and dumbbells to about half", () => {
    for (const focus of INTERVAL_FOCUSES)
      for (const dumbbells of [false, true])
        for (const seed of [1, 2, 3, 4, 5, 6]) {
          const [a, b] = buildIntervalSession(G, plan({ focus, dumbbells, seed, minutes: 45 })).rounds;
          const shared = b.filter((e) => a.some((x) => x.name === e.name)).length;
          // Some repeat when the area has few exercises: no more than needed, or half.
          const pool = G.exercises.filter((e) => e.focus.includes(focus) && (dumbbells || e.equipment === "bodyweight")).length;
          expect(shared, `${focus} ${dumbbells} ${seed}`).toBeLessThanOrEqual(Math.max(Math.ceil(a.length / 2), 2 * a.length - pool));
          if (dumbbells) expect(a.filter((e) => e.equipment === "dumbbell").length).toBeLessThanOrEqual(Math.ceil(a.length / 2));
        }
  });

  it("gives the same session for the same seed, another for another", () => {
    const names = (seed: number) => buildIntervalSession(G, plan({ seed })).rounds[0].map((e) => e.name);
    expect(names(3)).toEqual(names(3));
    expect([4, 5, 6, 8].some((seed) => names(seed).join() !== names(3).join())).toBe(true);
  });
});

describe("intervalCounts", () => {
  it("counts the intervals done of each exercise", () => {
    const s = buildIntervalSession(G, plan({ minutes: 10 }));
    const counts = intervalCounts(s.steps, 6);
    expect(counts.reduce((n, c) => n + c.count, 0)).toBe(6);
    expect(counts[0].count).toBe(2);
    expect(counts[0].seconds).toBe(90);
  });
});

describe("defaultPattern", () => {
  it("goes harder with the level", () => {
    expect(defaultPattern(G, "beginner")).toBe("30-30");
    expect(defaultPattern(G, "intermediate")).toBe("45-15");
    expect(defaultPattern(G, "advanced")).toBe("50-10");
    expect(defaultPattern(G, undefined)).toBe("30-30");
  });
});

describe("the exercises", () => {
  it("are all in the library, translated", () => {
    for (const e of G.exercises) expect(LIBRARY.get(e.name)?.nameFr, e.name).toBeTruthy();
  });
});

describe("the timed-session reference", () => {
  const broken = (change: (g: typeof G) => void) => {
    const copy = structuredClone(G);
    change(copy);
    return parseTimed(JSON.stringify(copy));
  };
  it("is taken whole from migration 065", () => {
    expect(parseTimed(JSON.stringify(G))).not.toBeNull();
    expect(exercisesPerRound(G, 10)).toBe(5);
    expect(exercisesPerRound(G, 30)).toBe(6);
    expect(exercisesPerRound(G, 45)).toBe(8);
  });
  it("refuses what does not hold together", () => {
    expect(parseTimed("[")).toBeNull();
    expect(broken((g) => (g.patterns = ["45"]))).toBeNull();
    expect(broken((g) => (g.patternForLevel.advanced = "40-20"))).toBeNull();
    expect(broken((g) => (g.perRound = [{ upToMinutes: 15, count: 5 }]))).toBeNull();
    expect(broken((g) => (g.rhythm.abs = []))).toBeNull();
    expect(broken((g) => (g.exercises[1].name = g.exercises[0].name))).toBeNull();
    expect(broken((g) => (g.exercises[0].equipment = "kettlebell" as never))).toBeNull();
    expect(broken((g) => (g.exercises = g.exercises.filter((e) => !e.focus.includes("abs") || e.equipment !== "bodyweight")))).toBeNull();
  });
});

describe("roundsDone", () => {
  it("counts the rounds whose every effort was done", () => {
    const s = buildIntervalSession(G, plan({ minutes: 15 }));
    const works = s.steps.map((x, i) => (x.type === "work" ? i : -1)).filter((i) => i >= 0);
    expect(roundsDone(s.steps, works)).toBe(s.rounds.length);
    expect(roundsDone(s.steps, works.slice(0, s.rounds[0].length))).toBe(1);
    expect(roundsDone(s.steps, works.slice(1))).toBe(s.rounds.length - 1);
    expect(roundsDone(s.steps, [])).toBe(0);
  });
});
