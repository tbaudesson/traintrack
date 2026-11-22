import { describe, expect, it } from "vitest";
import { findExercise } from "./exerciseMatch";

const lib = [
  { name: "Back Squat", uuid: "own", isCustom: true },
  { name: "Back Squat", uuid: "lib", isCustom: false, nameFr: "Squat arrière" },
  { name: "Barbell Bench Press", uuid: "bench", isCustom: false, nameFr: "Développé couché", nameDe: "Bankdrücken" },
];

describe("the exercise a program line points to", () => {
  it("is found by its id first", () => {
    expect(findExercise(lib, "Back Squat", "own")?.uuid).toBe("own");
  });

  it("is the library's before one's own copy of the same name", () => {
    expect(findExercise(lib, "back squat")?.uuid).toBe("lib");
  });

  it("is found by its name in any language, accents and capitals aside", () => {
    expect(findExercise(lib, "developpe couche")?.uuid).toBe("bench");
    expect(findExercise(lib, "BANKDRÜCKEN")?.uuid).toBe("bench");
  });

  it("is none when nothing has that name", () => {
    expect(findExercise(lib, "Zercher Squat")).toBeUndefined();
  });
});
