import { describe, expect, it } from "vitest";
import {
  MOBILITY_EXERCISES,
  MOBILITY_INJURY_RULES,
  MOBILITY_MINUTES,
  TARGET_MUSCLES,
  buildMobilitySession,
  mobilityWarning,
  pickMobility,
  sessionMuscles,
} from "./mobility";

describe("buildMobilitySession", () => {
  it("fits in the minutes asked, and fills most of them", () => {
    for (const mode of ["warmup", "stretch"] as const)
      for (const minutes of MOBILITY_MINUTES[mode])
        for (const muscles of Object.values(TARGET_MUSCLES)) {
          const { totalSec } = buildMobilitySession(mode, minutes, muscles, "fr");
          expect(totalSec, `${mode} ${minutes} ${muscles}`).toBeLessThanOrEqual(minutes * 60);
          expect(totalSec, `${mode} ${minutes} ${muscles}`).toBeGreaterThan(minutes * 60 * 0.7);
        }
  });

  it("plays each side in turn, with a pause between moves", () => {
    const { steps } = buildMobilitySession("stretch", 10, ["legs"], "fr");
    const quad = steps.filter((s) => s.type === "work" && s.exercise.key === "quad");
    expect(quad.map((s) => s.type === "work" && s.side)).toEqual(["left", "right"]);
    steps.forEach((s, i) => i > 0 && expect(s.type === "rest").toBe(steps[i - 1].type === "work"));
    expect(steps[0].type).toBe("work");
  });

  it("writes the moves in the app's language", () => {
    const fr = buildMobilitySession("stretch", 5, ["legs"], "fr").steps.find((s) => s.type === "work");
    const de = buildMobilitySession("stretch", 5, ["legs"], "de").steps.find((s) => s.type === "work");
    expect(fr?.type === "work" && fr.exercise.name).not.toBe(de?.type === "work" && de.exercise.name);
  });
});

describe("pickMobility", () => {
  it("aims at the muscles of the session", () => {
    const legs = pickMobility("stretch", 5, ["legs"]);
    expect(legs.every((e) => e.muscles.includes("legs"))).toBe(true);
    const upper = pickMobility("stretch", 5, ["chest", "shoulders", "arms"]).map((e) => e.key);
    expect(upper).toContain("chest-doorway");
    expect(upper).not.toContain("quad");
  });

  it("starts a warm-up by raising the heart rate", () => {
    for (const muscles of Object.values(TARGET_MUSCLES)) expect(pickMobility("warmup", 5, muscles)[0].key).toBe("jumping-jack");
  });
});

describe("injuries", () => {
  it("leaves out the moves that load an injured area too much", () => {
    const shoulder = [{ area: "shoulder" as const }];
    const keys = pickMobility("stretch", 15, ["chest", "shoulders", "arms"], shoulder).map((e) => e.key);
    expect(keys).not.toContain("chest-doorway");
    expect(keys).not.toContain("cross-shoulder");
    expect(mobilityWarning("arm-circles", shoulder)?.level).toBe("caution");
    const knee = pickMobility("stretch", 15, ["legs"], [{ area: "knee" }]).map((e) => e.key);
    expect(knee).not.toContain("pigeon");
    expect(knee).not.toContain("quad");
  });

  it("knows every move", () => {
    for (const key of Object.keys(MOBILITY_INJURY_RULES)) expect(MOBILITY_EXERCISES.some((e) => e.key === key), key).toBe(true);
  });
});

describe("sessionMuscles", () => {
  it("keeps each muscle once and leaves out the unknown", () => {
    expect(sessionMuscles(["legs", "legs", "other", undefined, "core"])).toEqual(["legs", "core"]);
  });
});

it("translates every move", () => {
  for (const e of MOBILITY_EXERCISES) for (const text of [e.name, e.cue]) expect(Object.values(text).every(Boolean)).toBe(true);
});
