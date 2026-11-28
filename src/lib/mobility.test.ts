import { describe, expect, it } from "vitest";
import {
  buildMobilitySession,
  modesOf,
  parseMobility,
  mobilityWarning,
  pickMobility,
  sessionMuscles,
} from "./mobility";
import { injuryGuidanceFromMigrations, mobilityFromMigrations } from "./injuryGuidanceFromMigrations";
import { parseMuscleGroups, unsortedIds } from "./muscles";
import { settingFromMigrations } from "./settingsFromMigrations";

const GROUPS = parseMuscleGroups(settingFromMigrations("091_muscle_groups.sql", "muscle_groups"));

const MOBILITY_INJURY_RULES = injuryGuidanceFromMigrations().mobility;
const G = mobilityFromMigrations();

describe("buildMobilitySession", () => {
  it("fits in the minutes asked, and fills most of them", () => {
    for (const mode of ["warmup", "stretch"] as const)
      for (const minutes of G.minutes[mode])
        for (const muscles of Object.values(G.targets)) {
          const { totalSec } = buildMobilitySession(G, mode, minutes, muscles, "fr");
          expect(totalSec, `${mode} ${minutes} ${muscles}`).toBeLessThanOrEqual(minutes * 60);
          expect(totalSec, `${mode} ${minutes} ${muscles}`).toBeGreaterThan(minutes * 60 * 0.7);
        }
  });

  it("plays each side in turn, with a pause between moves", () => {
    const { steps } = buildMobilitySession(G, "stretch", 10, ["legs"], "fr");
    const quad = steps.filter((s) => s.type === "work" && s.exercise.key === "quad");
    expect(quad.map((s) => s.type === "work" && s.side)).toEqual(["left", "right"]);
    steps.forEach((s, i) => i > 0 && expect(s.type === "rest").toBe(steps[i - 1].type === "work"));
    expect(steps[0].type).toBe("work");
  });

  it("writes the moves in the app's language", () => {
    const fr = buildMobilitySession(G, "stretch", 5, ["legs"], "fr").steps.find((s) => s.type === "work");
    const de = buildMobilitySession(G, "stretch", 5, ["legs"], "de").steps.find((s) => s.type === "work");
    expect(fr?.type === "work" && fr.exercise.name).not.toBe(de?.type === "work" && de.exercise.name);
  });
});

describe("pickMobility", () => {
  it("aims at the muscles of the session", () => {
    const legs = pickMobility(G, "stretch", 5, ["legs"]);
    expect(legs.every((e) => e.muscles.includes("legs"))).toBe(true);
    const upper = pickMobility(G, "stretch", 5, ["chest", "shoulders", "arms"]).map((e) => e.key);
    expect(upper).toContain("chest-doorway");
    expect(upper).not.toContain("quad");
  });

  it("starts a warm-up by raising the heart rate", () => {
    for (const muscles of Object.values(G.targets)) expect(pickMobility(G, "warmup", 5, muscles)[0].key).toBe("jumping-jack");
  });
});

describe("injuries", () => {
  it("leaves out the moves that load an injured area too much", () => {
    const shoulder = [{ area: "shoulder" as const }];
    const keys = pickMobility(G, "stretch", 15, ["chest", "shoulders", "arms"], shoulder, MOBILITY_INJURY_RULES).map((e) => e.key);
    expect(keys).not.toContain("chest-doorway");
    expect(keys).not.toContain("cross-shoulder");
    expect(mobilityWarning(MOBILITY_INJURY_RULES, "arm-circles", shoulder)?.level).toBe("caution");
    const knee = pickMobility(G, "stretch", 15, ["legs"], [{ area: "knee" }], MOBILITY_INJURY_RULES).map((e) => e.key);
    expect(knee).not.toContain("pigeon");
    expect(knee).not.toContain("quad");
  });

  it("knows every move", () => {
    for (const key of Object.keys(MOBILITY_INJURY_RULES)) expect(G.moves.some((e) => e.key === key), key).toBe(true);
  });
});

describe("sessionMuscles", () => {
  it("keeps each muscle once and leaves out the unknown", () => {
    expect(sessionMuscles(["legs", "legs", "other", undefined, "core"], unsortedIds(GROUPS))).toEqual(["legs", "core"]);
  });
});

it("translates every move", () => {
  for (const e of G.moves) for (const text of [e.name, e.cue]) expect(Object.values(text).every(Boolean)).toBe(true);
});

describe("parseMobility", () => {
  const raw = JSON.stringify(G);
  const broken = (change: (g: typeof G) => void) => {
    const copy = structuredClone(G);
    change(copy);
    return parseMobility(JSON.stringify(copy));
  };
  it("takes the reference of migration 065 whole", () => {
    expect(parseMobility(raw)).not.toBeNull();
  });
  it("refuses what does not hold together", () => {
    expect(parseMobility("{")).toBeNull();
    expect(broken((g) => (g.timing.warmup.hold = 0))).toBeNull();
    expect(broken((g) => (g.moves[1].key = g.moves[0].key))).toBeNull();
    expect(broken((g) => (g.moves[0].name.de = ""))).toBeNull();
    expect(broken((g) => (g.moves[0].video = "http://example.com"))).toBeNull();
    expect(broken((g) => (g.moves = g.moves.filter((m) => m.mode !== "warmup")))).toBeNull();
    expect(broken((g) => (g.targets.full = ["Toes!" as never]))).toBeNull();
  });
});

describe("yoga", () => {
  it("is a third mode once migration 072 brings it, with its lengths and postures", () => {
    expect(modesOf(G)).toEqual(["warmup", "stretch", "yoga", "taichi"]);
    expect(G.moves.filter((m) => m.mode === "yoga").length).toBeGreaterThanOrEqual(15);
    // Without it, the reference still holds: warm-up and stretch only.
    const before = { ...G, minutes: { warmup: G.minutes.warmup, stretch: G.minutes.stretch }, timing: { warmup: G.timing.warmup, stretch: G.timing.stretch }, moves: G.moves.filter((m) => m.mode !== "yoga" && m.mode !== "taichi") };
    const parsed = parseMobility(JSON.stringify(before));
    expect(parsed && modesOf(parsed)).toEqual(["warmup", "stretch"]);
  });

  it("opens with the breathing and closes with the final relaxation, whatever the length", () => {
    for (const minutes of G.minutes.yoga) {
      const picked = pickMobility(G, "yoga", minutes, G.targets.full);
      expect(picked[0].key, `${minutes}`).toBe("yoga-breath");
      expect(picked[picked.length - 1].key, `${minutes}`).toBe("yoga-savasana");
      const { totalSec } = buildMobilitySession(G, "yoga", minutes, G.targets.full, "fr");
      expect(totalSec, `${minutes}`).toBeLessThanOrEqual(minutes * 60);
      expect(totalSec, `${minutes}`).toBeGreaterThan(minutes * 60 * 0.6);
    }
  });

  it("leaves out a posture to avoid for an injury, and every posture has its rules where they matter", () => {
    expect(MOBILITY_INJURY_RULES["yoga-down-dog"]).toMatchObject({ shoulder: "caution", wrist: "caution" });
    const knee = pickMobility(G, "yoga", 25, G.targets.full, [{ area: "knee" }], { ...MOBILITY_INJURY_RULES, "yoga-chair": { knee: "avoid" } }).map((e) => e.key);
    expect(knee).not.toContain("yoga-chair");
  });
});

describe("tai-chi", () => {
  const form = G.moves.filter((m) => m.mode === "taichi").map((m) => m.key);

  it("is a fourth mode once migration 084 brings it: the 24 movements of the Yang form, after standing and loosening", () => {
    expect(form.length).toBe(26);
    expect(form.slice(0, 3)).toEqual(["taichi-standing", "taichi-loosen", "taichi-commencing"]);
    expect(form[form.length - 1]).toBe("taichi-closing");
    // Without it, the reference still holds, yoga and all.
    const before = parseMobility(JSON.stringify({ ...G, minutes: { ...G.minutes, taichi: undefined }, timing: { ...G.timing, taichi: undefined }, moves: G.moves.filter((m) => m.mode !== "taichi") }));
    expect(before && modesOf(before)).toEqual(["warmup", "stretch", "yoga"]);
  });

  it("follows the form in its order, as far as the time goes, and always closes", () => {
    let previous = 0;
    for (const minutes of G.minutes.taichi) {
      const picked = pickMobility(G, "taichi", minutes, []).map((e) => e.key);
      expect(picked[picked.length - 1], `${minutes}`).toBe("taichi-closing");
      // The movements before the closing: the form from its start, none skipped.
      expect(picked.slice(0, -1), `${minutes}`).toEqual(form.slice(0, picked.length - 1));
      expect(picked.length, `${minutes}`).toBeGreaterThan(previous);
      previous = picked.length;
      const { totalSec } = buildMobilitySession(G, "taichi", minutes, [], "fr");
      expect(totalSec, `${minutes}`).toBeLessThanOrEqual(minutes * 60);
    }
    // The longest session: the whole form.
    expect(pickMobility(G, "taichi", Math.max(...G.minutes.taichi), [])).toHaveLength(form.length);
    // The shortest reaches the single whip, the end of the form's first part.
    expect(pickMobility(G, "taichi", Math.min(...G.minutes.taichi), []).map((e) => e.key)).toContain("taichi-single-whip");
  });

  it("asks for care with the knees in the low stances, and leaves out a movement to avoid", () => {
    expect(MOBILITY_INJURY_RULES["taichi-snake-left"]).toMatchObject({ knee: "caution" });
    expect(mobilityWarning(MOBILITY_INJURY_RULES, "taichi-wild-horse", [{ area: "knee" }])?.level).toBe("caution");
    const picked = pickMobility(G, "taichi", 25, [], [{ area: "knee" }], { ...MOBILITY_INJURY_RULES, "taichi-right-heel": { knee: "avoid" } }).map((e) => e.key);
    expect(picked).not.toContain("taichi-right-heel");
    expect(picked).toContain("taichi-left-heel");
  });
});
