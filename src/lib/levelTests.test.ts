import { describe, expect, it } from "vitest";
import type { Program } from "@/db";
import { isTestProgram, testsDue, testStructure } from "./levelTests";

const program = (structure: Program["structure"]): Program => ({
  id: 7,
  uuid: "t",
  _dirty: 0,
  name: "Tests",
  structure,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

describe("level tests", () => {
  it("are recognised in any language, and only them", () => {
    expect(isTestProgram(program(testStructure({ strength: "Force", bodyweight: "Poids du corps" })))).toBe(true);
    expect(isTestProgram(program(testStructure({ strength: "Strength", bodyweight: "Bodyweight" })))).toBe(true);
    const changed = testStructure({ strength: "Force", bodyweight: "PDC" });
    changed[0].exercises[0].targetSets = 4;
    expect(isTestProgram(program(changed))).toBe(false);
  });

  it("are due six weeks after the last one", () => {
    const p = program(testStructure({ strength: "Force", bodyweight: "PDC" }));
    const workouts = [
      { date: "2026-09-01", programId: 7, programDayIndex: 0 },
      { date: "2026-09-03", programId: 7, programDayIndex: 1 },
      { date: "2026-09-10", programId: 2, programDayIndex: 0 },
    ];
    expect(testsDue({ program: p, workouts, today: "2026-10-01" })).toEqual({ last: "2026-09-03", next: "2026-10-15", due: false });
    expect(testsDue({ program: p, workouts, today: "2026-10-15" })?.due).toBe(true);
    expect(testsDue({ program: p, workouts: [], today: "2026-10-15" })).toBeNull();
  });
});
