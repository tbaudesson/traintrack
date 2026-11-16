import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PROGRAM_TEMPLATES } from "./programTemplates";
import { adaptToEquipment, alternativesOf, exerciseNeeds, missingEquipment } from "./programEquipment";

const library = ["006_seed_exercises", "024_endurance", "038_interval_sessions", "040_vaulting", "053_more_timed_exercises"]
  .map((f) => readFileSync(`supabase/migrations/${f}.sql`, "utf8"))
  .join("\n");

describe("the equipment of the ready-made programs", () => {
  it("is known for every exercise the library files under equipment", () => {
    const names = [...new Set(PROGRAM_TEMPLATES.flatMap((t) => t.structure.flatMap((d) => d.exercises.map((e) => e.exerciseName))))];
    const unknown = names.filter((n) => {
      const row = library.slice(library.indexOf(`('${n}'`)).split("\n")[0];
      const equipment = row.match(/^\('[^']+',\s*'[^']*',\s*'([^']*)'/)?.[1];
      return equipment && equipment !== "bodyweight" && !exerciseNeeds(n);
    });
    expect(unknown).toEqual([]);
  });

  it("names what a program needs and the athlete lacks", () => {
    const day = { exercises: [{ exerciseName: "Pull-up" }, { exerciseName: "Push-up" }, { exerciseName: "Goblet Squat" }] };
    expect(missingEquipment([day], ["bodyweight"]).sort()).toEqual(["dumbbell", "pullup_bar"]);
    expect(missingEquipment([day], ["dumbbell", "pullup_bar"])).toEqual([]);
  });

  it("offers alternatives that exist in the library", () => {
    const names = [...new Set(PROGRAM_TEMPLATES.flatMap((t) => t.structure.flatMap((d) => d.exercises.flatMap((e) => alternativesOf(e.exerciseName)))))];
    expect(names.filter((n) => !library.includes(`('${n}'`))).toEqual([]);
  });
});

describe("a program made for the athlete's equipment", () => {
  const day = (...names: string[]) => ({ name: "A", exercises: names.map((exerciseName) => ({ exerciseName, targetSets: 3, targetReps: "8-10", restSec: 90 })) });

  it("replaces a pull-up without a bar: by a dumbbell row, else with the body alone", () => {
    expect(adaptToEquipment([day("Pull-up", "Push-up")], ["dumbbell", "bodyweight"]).structure[0].exercises.map((e) => e.exerciseName)).toEqual(["Dumbbell Row", "Push-up"]);
    expect(adaptToEquipment([day("Pull-up", "Push-up")], ["bodyweight"]).structure[0].exercises.map((e) => e.exerciseName)).toEqual(["Superman Hold", "Push-up"]);
    expect(adaptToEquipment([day("Pull-up", "Push-up")], ["bodyweight", "pullup_bar"]).swapped).toBe(0);
  });

  it("keeps the sets, reps and rest, and changes nothing when the equipment is not known", () => {
    const out = adaptToEquipment([day("Back Squat", "Plank")], ["kettlebell"]).structure[0].exercises[0];
    expect(out).toMatchObject({ exerciseName: "Goblet Squat", targetSets: 3, targetReps: "8-10", restSec: 90 });
    expect(adaptToEquipment([day("Back Squat")], []).swapped).toBe(0);
  });

  it("does not repeat an exercise of the day, nor pick one to avoid for an injury", () => {
    expect(adaptToEquipment([day("Lat Pulldown", "Dumbbell Row", "Plank")], ["dumbbell"]).structure[0].exercises.map((e) => e.exerciseName)).toEqual(["Superman Hold", "Dumbbell Row", "Plank"]);
    expect(adaptToEquipment([day("Barbell Bench Press", "Crunch")], ["bodyweight"], ["shoulder"]).structure[0].exercises.map((e) => e.exerciseName)).toEqual(["Barbell Bench Press", "Crunch"]);
    // Push-up is to be avoided with an injured shoulder: with nothing else possible the bench press stays, to be swapped in the session.
  });

  it("leaves none of the home suggestions hung from a bar", () => {
    for (const t of PROGRAM_TEMPLATES) {
      const { structure } = adaptToEquipment(t.structure, ["dumbbell", "bodyweight"]);
      expect({ id: t.id, missing: missingEquipment(structure, ["dumbbell", "bodyweight"]).filter((n) => n === "pullup_bar" || n === "barbell") }).toEqual({ id: t.id, missing: [] });
    }
  });
});
