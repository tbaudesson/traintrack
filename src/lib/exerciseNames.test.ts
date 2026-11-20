import { describe, expect, it } from "vitest";
import { exerciseDescription, exerciseLabel } from "./exerciseNames";
import { libraryFromMigrations } from "./libraryFromMigrations";

// The library as the migrations leave it: names and descriptions are its data, not the app's.
const library = libraryFromMigrations();
const row = (name: string) => library.find((e) => e.name === name)!;

describe("exercise names", () => {
  it("translate every exercise of the library, in French and German", () => {
    expect(library.length).toBeGreaterThanOrEqual(130);
    for (const locale of ["fr", "de"]) {
      expect(library.filter((e) => !(locale === "fr" ? e.nameFr : e.nameDe)).map((e) => e.name), locale).toEqual([]);
    }
  });

  it("read the library's translation, keep English and custom names as they are", () => {
    expect(exerciseLabel("Back Squat", "en", row("Back Squat"))).toBe("Back Squat");
    expect(exerciseLabel("Back Squat", "fr", row("Back Squat"))).toBe("Squat arrière");
    expect(exerciseLabel("Back Squat", "de", row("Back Squat"))).toBe("Kniebeuge");
    expect(exerciseLabel("Mon exercice", "fr")).toBe("Mon exercice");
    expect(exerciseLabel(undefined, "fr")).toBe("?");
  });

  it("translate the descriptions the library has", () => {
    expect(exerciseDescription(row("Side Plank"), "de")).toMatch(/^Auf einem Unterarm/);
    expect(exerciseDescription({ name: "Mon exercice", description: "Ma description" }, "fr")).toBe("Ma description");
  });

  it("follow an admin's change", () => {
    expect(exerciseLabel("Back Squat", "fr", { ...row("Back Squat"), nameFr: "Squat barre haute" })).toBe("Squat barre haute");
    expect(exerciseDescription({ ...row("Side Plank"), descriptionFr: "Ma version" }, "fr")).toBe("Ma version");
  });
});
