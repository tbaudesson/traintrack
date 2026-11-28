import { describe, expect, it } from "vitest";
import { groupLabel, noRecoveryIds, parseMuscleGroups, specificGroups, unsortedIds, wholeBodyIds } from "./muscles";
import { settingFromMigrations } from "./settingsFromMigrations";
import { libraryFromMigrations } from "./libraryFromMigrations";
import { mobilityFromMigrations, timedFromMigrations } from "./injuryGuidanceFromMigrations";
import { parseBodyMuscles } from "./muscleMap";

// The groups as migration 091 puts them in the app settings.
const GROUPS = parseMuscleGroups(settingFromMigrations("091_muscle_groups.sql", "muscle_groups"))!;
const IDS = GROUPS.map((g) => g.id);

describe("the muscle groups (migration 091)", () => {
  it("are named in three languages, with one whole body, one unsorted, and their roles", () => {
    expect(IDS).toEqual(["chest", "back", "legs", "shoulders", "arms", "core", "full_body", "other"]);
    expect(groupLabel(GROUPS, "legs", "fr")).toBe("Jambes");
    expect(groupLabel(GROUPS, "gone", "fr")).toBe("gone");
    expect(wholeBodyIds(GROUPS)).toEqual(["full_body"]);
    expect(unsortedIds(GROUPS)).toEqual(["other"]);
    expect(noRecoveryIds(GROUPS)).toEqual(["core", "full_body", "other"]);
    expect(GROUPS.filter((g) => g.endurance).map((g) => g.id)).toEqual(["legs", "core"]);
    expect(specificGroups(GROUPS).map((g) => g.id)).toEqual(["chest", "back", "legs", "shoulders", "arms", "core"]);
  });

  it("cover every group the references and the library use", () => {
    for (const e of libraryFromMigrations()) {
      expect(IDS, e.name).toContain(e.muscleGroup);
    }
    for (const e of timedFromMigrations().exercises) expect(IDS, e.name).toContain(e.muscleGroup);
    const mobility = mobilityFromMigrations();
    for (const m of mobility.moves) for (const g of m.muscles) expect(IDS, m.key).toContain(g);
    for (const list of Object.values(mobility.targets)) for (const g of list) expect(IDS).toContain(g);
    const muscles = parseBodyMuscles(settingFromMigrations("089_tennis_teams_and_references.sql", "body_muscles"))!;
    for (const m of muscles) expect(specificGroups(GROUPS).map((g) => g.id), m.id).toContain(m.group);
  });

  it("refuse a list without exactly one unsorted group, or with two whole-body ones", () => {
    const text = (change: (g: typeof GROUPS) => void) => {
      const copy = structuredClone(GROUPS);
      change(copy);
      return parseMuscleGroups(JSON.stringify(copy));
    };
    expect(text(() => {})).not.toBeNull();
    expect(text((g) => (g[7].unspecified = false))).toBeNull();
    expect(text((g) => (g[0].unspecified = true))).toBeNull();
    expect(text((g) => (g[0].wholeBody = true))).toBeNull();
    expect(text((g) => (g[1].id = "chest"))).toBeNull();
    expect(text((g) => (g[1].de = ""))).toBeNull();
  });
});
