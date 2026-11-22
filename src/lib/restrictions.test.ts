import { describe, expect, it } from "vitest";
import type { Restriction } from "@/db";
import { injuryWarning, bySafety } from "./injuries";
import { activeRestrictions, mergeRules, parseRestrictionKey, restrictionInjuries, restrictionRules } from "./restrictions";

const ex = (name: string, extra: object = {}) => ({ name, uuid: `u-${name}`, muscleGroup: "shoulders" as const, isCustom: false, ...extra });
const library = [
  ex("Overhead Press", { movements: ["push_vertical", "overhead"] }),
  ex("Lateral Raise", { movements: ["isolation"] }),
  ex("Barbell Bench Press", { muscleGroup: "chest", movements: ["push_horizontal"], secondaryMuscles: ["shoulders"] }),
  ex("Back Squat", { muscleGroup: "legs", movements: ["squat"] }),
];

describe("the athlete's restrictions", () => {
  const noOverhead: Restriction = { kind: "movement", value: "overhead", level: "avoid" };

  it("flag every exercise of a movement ruled out, through the usual warnings", () => {
    const rules = restrictionRules([noOverhead], library);
    const injuries = restrictionInjuries([noOverhead], "2026-11-22");
    expect(injuryWarning(rules, "Overhead Press", injuries)).toEqual({ level: "avoid", areas: ["x:movement:overhead"] });
    expect(injuryWarning(rules, "Lateral Raise", injuries)).toBeNull();
    expect(bySafety(rules, library, injuries).at(-1)?.name).toBe("Overhead Press");
  });

  it("put a muscle group's main exercises at their level, those working it secondarily with caution", () => {
    const rules = restrictionRules([{ kind: "muscle", value: "shoulders", level: "avoid" }], library);
    expect(rules["Overhead Press"]).toEqual({ "x:muscle:shoulders": "avoid" });
    expect(rules["Barbell Bench Press"]).toEqual({ "x:muscle:shoulders": "caution" });
    expect(rules["Back Squat"]).toBeUndefined();
  });

  it("rule out one exercise by its id", () => {
    const rules = restrictionRules([{ kind: "exercise", value: "u-Back Squat", level: "avoid" }], library);
    expect(Object.keys(rules)).toEqual(["Back Squat"]);
  });

  it("join the library's own rules without losing them", () => {
    const merged = mergeRules({ "Overhead Press": { shoulder: "caution" } }, restrictionRules([noOverhead], library));
    expect(merged["Overhead Press"]).toEqual({ shoulder: "caution", "x:movement:overhead": "avoid" });
  });

  it("end on their date", () => {
    const list: Restriction[] = [noOverhead, { kind: "muscle", value: "legs", level: "caution", until: "2026-11-01" }];
    expect(activeRestrictions(list, "2026-11-22")).toEqual([noOverhead]);
  });

  it("say which restriction a warning comes from", () => {
    expect(parseRestrictionKey("x:exercise:u-1:2")).toEqual({ kind: "exercise", value: "u-1:2" });
    expect(parseRestrictionKey("knee")).toBeNull();
  });
});
