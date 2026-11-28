import { describe, expect, it } from "vitest";
import { LEVELS, levelItem, levelName, levelOf, parseLevels, startingLoad } from "./levels";
import { levelsForTests } from "./levelsForTests";
import { defaultSetValues } from "./setDefaults";

const ref = levelsForTests();
const text = JSON.stringify(ref);

describe("levels reference", () => {
  it("holds the three levels in order, named in the three languages", () => {
    expect(ref.levels.map((l) => l.id)).toEqual([...LEVELS]);
    expect(levelName(ref, "advanced", "fr")).toBe("Avancé");
    expect(levelName(ref, "beginner", "de")).toBe("Anfänger");
    expect(levelName(ref, "intermediate", "en")).toBe("Intermediate");
  });

  it("names a level by its id while the reference is not read", () => {
    expect(levelName(null, "advanced", "fr")).toBe("advanced");
    expect(levelName(ref, null, "fr")).toBe("");
  });

  it("refuses levels missing, added, out of order or out of range", () => {
    const v = JSON.parse(text);
    expect(parseLevels(JSON.stringify({ ...v, levels: v.levels.slice(0, 2) }))).toBeNull();
    expect(parseLevels(JSON.stringify({ ...v, levels: [...v.levels, { ...v.levels[2], id: "expert" }] }))).toBeNull();
    expect(parseLevels(JSON.stringify({ ...v, levels: [v.levels[1], v.levels[0], v.levels[2]] }))).toBeNull();
    expect(parseLevels(JSON.stringify({ ...v, levels: [{ ...v.levels[0], rpe: 11 }, v.levels[1], v.levels[2]] }))).toBeNull();
    expect(parseLevels(JSON.stringify({ ...v, levels: [{ ...v.levels[0], fr: " " }, v.levels[1], v.levels[2]] }))).toBeNull();
    expect(parseLevels(JSON.stringify({ ...v, startKg: [...v.startKg, v.startKg[0]] }))).toBeNull();
    expect(parseLevels(JSON.stringify({ ...v, startKg: [{ ...v.startKg[0], kg: { beginner: 10 } }] }))).toBeNull();
    expect(parseLevels("not json")).toBeNull();
    expect(parseLevels(text)).toEqual(ref);
  });

  it("reads an unknown level as beginner", () => {
    expect(levelOf("expert")).toBe("beginner");
    expect(levelItem(ref, undefined)?.id).toBe("beginner");
  });

  it("takes the muscle group's first load, else the equipment's own, none without either", () => {
    expect(startingLoad(ref, { equipment: "barbell", muscleGroup: "legs" }, "intermediate")).toBe(60);
    expect(startingLoad(ref, { equipment: "barbell", muscleGroup: "core" }, "intermediate")).toBe(50);
    expect(startingLoad(ref, { equipment: "kettlebell", muscleGroup: "legs" }, "advanced")).toBe(16);
    expect(startingLoad(ref, { equipment: "band", muscleGroup: "legs" }, "advanced")).toBeUndefined();
    expect(startingLoad(null, { equipment: "barbell", muscleGroup: "legs" }, "advanced")).toBeUndefined();
  });

  it("prefills from the program alone while the levels are not read", () => {
    const set = { setNumber: 1, completed: false };
    expect(defaultSetValues({ levels: null, set, totalSets: 3, level: "beginner", exercise: { equipment: "barbell", muscleGroup: "chest" }, targetReps: "8-10", previous: [], suggestion: null })).toEqual({ reps: 8 });
  });
});
