import { describe, expect, it } from "vitest";
import { INJURY_RULES, bySafety, injuryWarning, isAvoided, toggleInjury } from "./injuries";
import { NAMES } from "./exerciseNames";
import { INTERVAL_EXERCISES, buildIntervalSession } from "./intervals";

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
  it("adds an area dated today, or removes it", () => {
    const one = toggleInjury([], "knee", "2026-11-14");
    expect(one).toEqual([{ area: "knee", since: "2026-11-14" }]);
    expect(toggleInjury(one, "knee", "2026-11-15")).toEqual([]);
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
