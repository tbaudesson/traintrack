import { describe, expect, it } from "vitest";
import { INJURY_RULES, bySafety, declareInjury, injuryState, injuryWarning, isAvoided, returnAdjust, toggleInjury } from "./injuries";
import { NAMES } from "./exerciseNames";
import { injuryGuidanceFromMigrations } from "./injuryGuidanceFromMigrations";

const g = injuryGuidanceFromMigrations();
import { INTERVAL_EXERCISES, buildIntervalSession, injuryPool } from "./intervals";

describe("injuryWarning", () => {
  it("advises against what loads the injured area most", () => {
    const shoulder = [{ area: "shoulder" as const }];
    expect(injuryWarning("Deadlift", shoulder)).toEqual({ level: "avoid", areas: ["shoulder"] });
    expect(injuryWarning("Burpee", shoulder)?.level).toBe("avoid");
    expect(injuryWarning("Barbell Bench Press", shoulder)?.level).toBe("caution");
    expect(injuryWarning("Leg Curl", shoulder)).toBeNull();
  });

  it("keeps the strongest warning across several injuries", () => {
    const w = injuryWarning("Back Squat", [{ area: "shoulder" }, { area: "knee" }, { area: "lower_back" }]);
    expect(w).toEqual({ level: "avoid", areas: ["knee", "lower_back"] });
  });

  it("says nothing without injury, or for a custom exercise", () => {
    expect(injuryWarning("Deadlift", [])).toBeNull();
    expect(injuryWarning("My cable thing", [{ area: "shoulder" }])).toBeNull();
  });
});

describe("bySafety", () => {
  it("puts the safe replacements first", () => {
    const list = [{ name: "Overhead Press" }, { name: "Lateral Raise" }, { name: "Face Pull" }, { name: "External Shoulder Rotation" }];
    expect(bySafety(list, [{ area: "shoulder" }]).map((e) => e.name)).toEqual(["External Shoulder Rotation", "Lateral Raise", "Face Pull", "Overhead Press"]);
  });
});

describe("toggleInjury", () => {
  it("moves an area on: injured, then healed, then done", () => {
    const injured = toggleInjury(g, [], "knee", "2026-11-01");
    expect(injured).toEqual([{ area: "knee", since: "2026-11-01" }]);
    const healed = toggleInjury(g, injured, "knee", "2026-11-14");
    expect(healed).toEqual([{ area: "knee", since: "2026-11-01", healedOn: "2026-11-14" }]);
    expect(injuryState(g, healed, "knee", "2026-11-20")).toBe("returning");
    expect(toggleInjury(g, healed, "knee", "2026-11-20")).toEqual([]);
  });

  it("treats an area healed long ago as not injured", () => {
    const old = [{ area: "knee" as const, since: "2026-01-01", healedOn: "2026-02-01" }];
    expect(injuryState(g, old, "knee", "2026-11-14")).toBe("none");
    expect(toggleInjury(g, old, "knee", "2026-11-14")).toEqual([{ area: "knee", since: "2026-11-14" }]);
  });
});

describe("return after an injury", () => {
  const healed = [{ area: "shoulder" as const, since: "2026-10-01", healedOn: "2026-11-02" }];

  it("lifts the bans once healed", () => {
    expect(injuryWarning("Deadlift", healed)).toBeNull();
    expect(isAvoided("Burpee", healed)).toBe(false);
  });

  it("brings the load back over three weeks on the exercises that load the area", () => {
    expect(returnAdjust(g, "Overhead Press", healed, "2026-11-05")).toMatchObject({ week: 1, load: 0.7, until: "2026-11-22" });
    expect(returnAdjust(g, "Overhead Press", healed, "2026-11-12")).toMatchObject({ week: 2, load: 0.85 });
    expect(returnAdjust(g, "Overhead Press", healed, "2026-11-20")).toMatchObject({ week: 3, load: 1 });
    expect(returnAdjust(g, "Overhead Press", healed, "2026-11-23")).toBeNull();
    expect(returnAdjust(g, "Leg Curl", healed, "2026-11-05")).toBeNull();
  });

  it("starts over when the area is injured again", () => {
    expect(declareInjury(healed, "shoulder", "2026-11-14")).toEqual([{ area: "shoulder", since: "2026-11-14" }]);
  });
});

it("knows only exercises of the library", () => {
  for (const name of Object.keys(INJURY_RULES)) expect(NAMES[name], name).toBeDefined();
});

it("leaves the exercises to avoid out of the timed sessions", () => {
  const injuries = [{ area: "shoulder" as const }];
  const pool = INTERVAL_EXERCISES.filter((e) => !isAvoided(e.name, injuries));
  const s = buildIntervalSession({ focus: "full", dumbbells: true, pattern: "45-15", minutes: 45, seed: 3 }, pool);
  expect(s.rounds.flat().some((e) => isAvoided(e.name, injuries))).toBe(false);
});

describe("timed sessions with an injury", () => {
  const shoulder = [{ area: "shoulder" as const }];
  it("leave out what loads the shoulder, even lightly", () => {
    for (const focus of ["full", "abs", "lower"] as const)
      for (const dumbbells of [false, true]) {
        const plan = { focus, dumbbells, pattern: "45-15" as const, minutes: 45, seed: 7 };
        const { pool, cautious } = injuryPool(plan, shoulder);
        const names = buildIntervalSession(plan, pool).rounds.flat().map((e) => e.name);
        for (const banned of ["Push-up", "Plank", "Jumping Jack", "Burpee", "Mountain Climber", "Knee Push-up", "Bear Crawl"]) expect(names).not.toContain(banned);
        expect(cautious, `${focus} ${dumbbells}`).toEqual([]);
        // Enough left for full rounds.
        expect(new Set(names).size).toBeGreaterThanOrEqual(8);
      }
  });

  it("keep a few cautious ones only when the focus runs short, never those to avoid", () => {
    const knees = [{ area: "knee" as const }, { area: "hip" as const }, { area: "ankle" as const }];
    const plan = { focus: "lower" as const, dumbbells: false, minutes: 45 };
    const { pool, cautious } = injuryPool(plan, knees);
    expect(cautious.length).toBeGreaterThan(0);
    expect(pool.some((e) => isAvoided(e.name, knees))).toBe(false);
  });
});
