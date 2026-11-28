import { describe, expect, it } from "vitest";
import type { Exercise } from "@/db";
import { readFileSync } from "node:fs";
import { libraryFromMigrations } from "./libraryFromMigrations";
import { matchExercises as match, muscleLoad as load, musclesOf as of, muscleName, musclesByGroup, nextChoice, parseBodyMuscles } from "./muscleMap";
import { parseMuscleGroups } from "./muscles";
import { settingFromMigrations } from "./settingsFromMigrations";
import { SHAPES } from "./bodyShapes";

// The muscles as migration 089 puts them in the app settings.
const sql = readFileSync("supabase/migrations/089_tennis_teams_and_references.sql", "utf8");
const MUSCLES = parseBodyMuscles(sql.match(/VALUES \('body_muscles', '([\s\S]*?)'\) ON CONFLICT/)![1].replace(/''/g, "'"))!;
// The groups as migration 091 puts them.
const GROUPS = parseMuscleGroups(settingFromMigrations("091_muscle_groups.sql", "muscle_groups"))!;
const REF = { muscles: MUSCLES, groups: GROUPS };
const MUSCLE_IDS = MUSCLES.map((m) => m.id);
const groupOf = (m: string) => MUSCLES.find((d) => d.id === m)!.group;
const musclesOf = (e: Parameters<typeof of>[0]) => of(e, REF);
const matchExercises = <T extends Parameters<typeof of>[0]>(exs: T[], s: Parameters<typeof match>[1]) => match(exs, s, REF);
const muscleLoad = (entries: Parameters<typeof load>[0]) => load(entries, REF);

describe("the muscles of the body map (migration 089)", () => {
  it("are 17, each in a group, named in three languages, each drawn", () => {
    expect(MUSCLES.length).toBe(17);
    expect(muscleName(MUSCLES, "hamstrings", "fr")).toBe("Ischio-jambiers");
    expect(muscleName(MUSCLES, "gone", "fr")).toBe("gone");
    const drawn = new Set([...SHAPES.front, ...SHAPES.back].map((s) => s.muscle));
    for (const m of MUSCLES) expect(drawn.has(m.id), m.id).toBe(true);
    expect(musclesByGroup(REF).flatMap((g) => g.muscles).length).toBe(17);
  });

  it("refuses a list that does not hold together", () => {
    const bad = (list: Record<string, string>[]) => parseBodyMuscles(JSON.stringify(list));
    expect(bad([{ id: "Chest", group: "chest", fr: "a", en: "b", de: "c" }])).toBeNull();
    expect(bad([{ id: "chest", group: "Nowhere!", fr: "a", en: "b", de: "c" }])).toBeNull();
    expect(bad([{ id: "chest", group: "chest", fr: "", en: "b", de: "c" }])).toBeNull();
    expect(bad([])).toBeNull();
  });
});

type Ex = Pick<Exercise, "name" | "muscleGroup" | "secondaryMuscles" | "targetMuscles" | "assistMuscles">;
const ex = (name: string, e: Partial<Ex>): Ex => ({ name, muscleGroup: "other", ...e });

describe("the library's muscles (migration 086)", () => {
  const library = libraryFromMigrations();

  it("gives every exercise of the library its main muscles, all known, none both main and secondary", () => {
    expect(library.length).toBeGreaterThan(140);
    for (const e of library) {
      expect(e.targetMuscles?.length, e.name).toBeGreaterThan(0);
      for (const m of [...(e.targetMuscles ?? []), ...(e.assistMuscles ?? [])]) expect(MUSCLE_IDS, e.name).toContain(m);
      expect((e.assistMuscles ?? []).filter((m) => e.targetMuscles!.includes(m)), e.name).toEqual([]);
    }
  });

  it("keeps each exercise's group among its main muscles (a full-body one aside)", () => {
    for (const e of library.filter((x) => x.muscleGroup !== "full_body")) {
      expect(e.targetMuscles!.map(groupOf), e.name).toContain(e.muscleGroup);
    }
  });

  it("has an exercise for every muscle of the map", () => {
    for (const m of MUSCLE_IDS) expect(library.some((e) => e.targetMuscles!.includes(m)), m).toBe(true);
  });

  it("finds the hamstrings' exercises, the leg curl among them, not the leg extension", () => {
    const names = matchExercises(library, { hamstrings: "in" }).filter((r) => r.role === "target").map((r) => r.exercise.name);
    expect(names).toContain("Leg Curl");
    expect(names).toContain("Romanian Deadlift");
    expect(names).not.toContain("Leg Extension");
  });
});

describe("musclesOf", () => {
  it("reads an exercise without muscles from its groups", () => {
    const m = musclesOf(ex("My curl", { muscleGroup: "arms", secondaryMuscles: ["shoulders"] }));
    expect(m.get("biceps")).toBe("target");
    expect(m.get("triceps")).toBe("target");
    expect(m.get("front_delts")).toBe("assist");
    expect(m.has("quads")).toBe(false);
  });

  it("reads a full-body one as working everything a little", () => {
    const m = musclesOf(ex("My circuit", { muscleGroup: "full_body" }));
    expect(m.size).toBe(MUSCLES.length);
    expect([...m.values()].every((r) => r === "assist")).toBe(true);
  });

  it("keeps a main muscle main even when also listed as secondary", () => {
    const m = musclesOf(ex("x", { targetMuscles: ["quads"], assistMuscles: ["quads", "glutes"] }));
    expect(m.get("quads")).toBe("target");
    expect(m.get("glutes")).toBe("assist");
  });
});

describe("matchExercises", () => {
  const squat = ex("Squat", { muscleGroup: "legs", targetMuscles: ["quads", "glutes"], assistMuscles: ["lower_back"] });
  const deadlift = ex("Deadlift", { muscleGroup: "back", targetMuscles: ["hamstrings", "glutes", "lower_back"] });
  const curl = ex("Curl", { muscleGroup: "arms", targetMuscles: ["biceps"] });

  it("lists everything when nothing is chosen", () => {
    expect(matchExercises([squat, deadlift, curl], {}).length).toBe(3);
  });

  it("puts what mainly works the muscles wanted first, then what works them too", () => {
    const rows = matchExercises([squat, curl, deadlift], { lower_back: "in" });
    expect(rows.map((r) => [r.exercise.name, r.role])).toEqual([["Deadlift", "target"], ["Squat", "assist"]]);
  });

  it("ranks an exercise working several of the muscles wanted higher", () => {
    expect(matchExercises([squat, deadlift], { glutes: "in", hamstrings: "in" })[0].exercise.name).toBe("Deadlift");
  });

  it("drops what mainly works a muscle ruled out, keeps what only helps with it", () => {
    expect(matchExercises([squat, deadlift, curl], { lower_back: "out" }).map((r) => r.exercise.name)).toEqual(["Squat", "Curl"]);
    expect(matchExercises([squat, deadlift], { glutes: "in", hamstrings: "out" }).map((r) => r.exercise.name)).toEqual(["Squat"]);
  });

  it("cycles a tap: wanted, ruled out, left as it is", () => {
    expect(nextChoice(undefined)).toBe("in");
    expect(nextChoice("in")).toBe("out");
    expect(nextChoice("out")).toBeUndefined();
  });
});

describe("muscleLoad", () => {
  it("counts main muscles whole and the others half, the most worked as 1", () => {
    const load = muscleLoad([
      { exercise: ex("Squat", { targetMuscles: ["quads"], assistMuscles: ["glutes"] }), amount: 4 },
      { exercise: ex("Curl", { targetMuscles: ["biceps"] }), amount: 2 },
      { exercise: ex("Nothing", { targetMuscles: ["calves"] }), amount: 0 },
    ]);
    expect(load.get("quads")).toBe(1);
    expect(load.get("glutes")).toBe(0.5);
    expect(load.get("biceps")).toBe(0.5);
    expect(load.has("calves")).toBe(false);
  });

  it("is empty for an empty session", () => {
    expect(muscleLoad([]).size).toBe(0);
  });
});
