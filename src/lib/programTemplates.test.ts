import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { PROGRAM_TEMPLATES } from "./programTemplates";
import { planWeeks, programCategory } from "./programCategories";

// A name missing from the library would create a stray custom exercise for
// every user who starts the program.
const library =
  readFileSync("supabase/migrations/006_seed_exercises.sql", "utf8") +
  readFileSync("supabase/migrations/024_endurance.sql", "utf8") +
  readFileSync("supabase/migrations/038_interval_sessions.sql", "utf8") +
  readFileSync("supabase/migrations/040_vaulting.sql", "utf8").split("program_templates")[0];

describe("built-in programs", () => {
  it("only use exercises from the seeded library", () => {
    const missing = PROGRAM_TEMPLATES.flatMap((t) => t.structure.flatMap((d) => d.exercises.map((e) => e.exerciseName)))
      .filter((name) => !library.includes(`'${name}'`));
    expect([...new Set(missing)]).toEqual([]);
  });
});

describe("strength programs in every language", () => {
  const strength = PROGRAM_TEMPLATES.filter((t) => t.goal !== "endurance" && !t.id.startsWith("vagues-force") && !t.id.startsWith("callisthenics-"));
  const byLocale = (locale: string) => strength.filter((t) => t.locale === locale);

  it("offer all fourteen in French, English and German", () => {
    for (const locale of ["fr", "en", "de"]) expect(byLocale(locale)).toHaveLength(14);
  });

  it("keep the same exercises, with a name for every day", () => {
    const exercises = (locale: string) => byLocale(locale).map((t) => t.structure.map((d) => d.exercises));
    expect(exercises("en")).toEqual(exercises("fr"));
    expect(exercises("de")).toEqual(exercises("fr"));
    expect(strength.flatMap((t) => t.structure).filter((d) => !d.name)).toEqual([]);
  });

  it("give every program a different name within a language", () => {
    for (const locale of ["fr", "en", "de"]) {
      const names = PROGRAM_TEMPLATES.filter((t) => t.locale === locale).map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("circuits", () => {
  it("chain every exercise of a circuit day, in every language", () => {
    const circuits = PROGRAM_TEMPLATES.filter((t) => t.id.startsWith("fatloss-fullbody-3") || t.id.startsWith("seche-4"));
    expect(circuits).toHaveLength(6);
    for (const t of circuits) {
      const linked = t.structure.filter((d) => d.exercises.slice(0, -1).every((e) => e.supersetWithNext) && !d.exercises.at(-1)?.supersetWithNext);
      expect(linked).toHaveLength(2);
    }
  });
});

describe("strength waves", () => {
  it("load the main lifts in percentages, rising then easing off", () => {
    const waves = PROGRAM_TEMPLATES.filter((t) => t.id.startsWith("vagues-force"));
    expect(waves.map((t) => t.locale)).toEqual(["fr", "en", "de"]);
    const squat = waves[0].structure.filter((d) => d.exercises[0].exerciseName === "Back Squat").map((d) => d.exercises[0].percents);
    expect(squat).toEqual([[70, 75, 80], [75, 80, 85], [80, 85, 90], [60]]);
  });
});

describe("callisthenics programs", () => {
  const plans = PROGRAM_TEMPLATES.filter((t) => t.id.startsWith("callisthenics-"));

  it("come in three levels and three languages, filed on their shelf", () => {
    expect(plans).toHaveLength(9);
    for (const t of plans) expect(programCategory(t), t.name).toBe("callisthenics");
    expect(new Set(plans.filter((t) => t.locale === "fr").map((t) => t.level))).toEqual(new Set(["beginner", "intermediate", "advanced"]));
  });

  it("run eight weeks for beginners and intermediates, with lighter weeks 4 and 8", () => {
    for (const id of ["callisthenics-debutant", "callisthenics-intermediaire"]) {
      const plan = plans.find((t) => t.id === id)!;
      expect(planWeeks(plan.structure), id).toBe(8);
      const volume = (week: number) => plan.structure.filter((d) => d.week === week).reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.targetSets, 0), 0);
      expect(volume(4), id).toBeLessThan(volume(3));
      expect(volume(8), id).toBeLessThan(volume(7));
    }
  });

  it("use bodyweight only", () => {
    const equipped = /Barbell|Dumbbell|Cable|Machine|Press$|Leg Press|Kettlebell/;
    expect(plans.flatMap((t) => t.structure.flatMap((d) => d.exercises.map((e) => e.exerciseName))).filter((n) => equipped.test(n))).toEqual([]);
  });

  it("move the bodyweight program to the callisthenics shelf", () => {
    const bodyweight = PROGRAM_TEMPLATES.filter((t) => t.id.startsWith("poids-du-corps-3"));
    expect(bodyweight.map((t) => programCategory(t))).toEqual(["callisthenics", "callisthenics", "callisthenics"]);
  });
});
