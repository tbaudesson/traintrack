import { describe, expect, it } from "vitest";
import { hardGroups as hard, sessionConflicts as conflicts } from "./conflicts";
import { noRecoveryIds, parseMuscleGroups } from "./muscles";
import { settingFromMigrations } from "./settingsFromMigrations";

// The groups the admin keeps (migration 091): the core, the whole body and the unsorted need no recovery.
const SKIP = noRecoveryIds(parseMuscleGroups(settingFromMigrations("091_muscle_groups.sql", "muscle_groups")));
const hardGroups = (day: Parameters<typeof hard>[0], lib: Parameters<typeof hard>[1]) => hard(day, lib, SKIP);
const sessionConflicts = (s: Parameters<typeof conflicts>[0], lib: Parameters<typeof conflicts>[1]) => conflicts(s, lib, SKIP);

const lib = [
  { name: "Back Squat", uuid: "sq", isCustom: false, muscleGroup: "legs" as const },
  { name: "Leg Press", uuid: "lp", isCustom: false, muscleGroup: "legs" as const },
  { name: "Barbell Bench Press", uuid: "bp", isCustom: false, muscleGroup: "chest" as const },
  { name: "Plank", uuid: "pl", isCustom: false, muscleGroup: "core" as const },
];
const legs = { exercises: [{ exerciseName: "Back Squat", targetSets: 4, targetReps: "5" }, { exerciseName: "Leg Press", targetSets: 3, targetReps: "10" }] };
const chest = { exercises: [{ exerciseName: "Barbell Bench Press", targetSets: 5, targetReps: "5" }, { exerciseName: "Plank", targetSets: 6, targetReps: "30s" }] };

describe("sessions too close for the same muscles", () => {
  it("count the hard groups of a day, the core aside", () => {
    expect(hardGroups(legs, lib)).toEqual(["legs"]);
    expect(hardGroups(chest, lib)).toEqual([]);
    expect(hardGroups({ exercises: [], cardio: { sport: "run" } }, lib)).toEqual([]);
  });

  it("are two legs days on consecutive days, not two days apart", () => {
    const sessions = [
      { date: "2026-11-23", label: "Jambes A", day: legs },
      { date: "2026-11-24", label: "Jambes B", day: legs },
      { date: "2026-11-26", label: "Jambes C", day: legs },
    ];
    const c = sessionConflicts(sessions, lib);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ first: { label: "Jambes A" }, second: { label: "Jambes B" }, groups: ["legs"] });
  });
});
