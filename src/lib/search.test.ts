import { describe, expect, it } from "vitest";
import { fold, recentExerciseIds, search } from "./search";

const items = [
  { en: "Dumbbell Bench Press", fr: "Développé couché aux haltères", d: "Lie on a bench" },
  { en: "Push-up", fr: "Pompes", d: "Hands under the shoulders, chest to the floor" },
  { en: "Barbell Bench Press", fr: "Développé couché à la barre", d: "" },
  { en: "Plank", fr: "Gainage (planche)", d: "Forearms on the floor, body straight" },
];
const find = (q: string) => search(items, q, (x) => ({ names: [x.en, x.fr], others: [x.d] })).map((x) => x.en);

describe("search", () => {
  it("ignores accents and case, in any language", () => {
    expect(fold("Développé COUCHÉ")).toBe("developpe couche");
    expect(find("pompes")).toEqual(["Push-up"]);
    expect(find("push")).toEqual(["Push-up"]);
    expect(find("developpe")).toEqual(["Dumbbell Bench Press", "Barbell Bench Press"]);
  });

  it("needs every word, in any order, even cut short", () => {
    expect(find("couch barre")).toEqual(["Barbell Bench Press"]);
    expect(find("halt dev")).toEqual(["Dumbbell Bench Press"]);
    expect(find("couché kettlebell")).toEqual([]);
  });

  it("puts names before descriptions", () => {
    expect(find("floor")).toEqual(["Push-up", "Plank"]);
    expect(find("planche")).toEqual(["Plank"]);
    expect(find("bench")[0]).toBe("Dumbbell Bench Press");
    expect(find("barbell")).toEqual(["Barbell Bench Press"]);
  });

  it("gives everything back for an empty query", () => {
    expect(find("  ")).toHaveLength(4);
  });
});

describe("recentExerciseIds", () => {
  it("lists the last exercises used, most recent session first, each once", () => {
    const workouts = [{ id: 1, date: "2026-11-01" }, { id: 2, date: "2026-11-10" }, { id: 3, date: "2026-11-05" }];
    const sets = [
      { workoutId: 1, exerciseId: 10 },
      { workoutId: 2, exerciseId: 20 },
      { workoutId: 2, exerciseId: 20 },
      { workoutId: 3, exerciseId: 10 },
      { workoutId: 3, exerciseId: 30 },
    ];
    expect(recentExerciseIds(sets, workouts)).toEqual([20, 10, 30]);
    expect(recentExerciseIds(sets, workouts, 2)).toEqual([20, 10]);
  });
});
