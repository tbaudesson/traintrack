import { describe, expect, it } from "vitest";
import { sanitizeStructure } from "./programSanitize";
import { PROGRAM_TEMPLATES } from "./programTemplates";

describe("sanitizeStructure", () => {
  it("keeps every ready-made program as it is", () => {
    for (const t of PROGRAM_TEMPLATES) expect(sanitizeStructure(JSON.parse(JSON.stringify(t.structure))), t.id).toEqual(t.structure);
  });

  it("drops what is not a program, and bounds the rest", () => {
    const out = sanitizeStructure([
      { evil: 1 },
      "text",
      { name: "x".repeat(500), exercises: [{ exerciseName: "Squat", targetSets: 9999, targetReps: 8, restSec: -5, extra: "<script>" }] },
      { name: "Run", cardio: { sport: "teleport" } },
      { name: "Bike", cardio: { sport: "bike", durationMin: 99999, blocks: [{ kind: "sprint", sec: 20, rpm: [110, 120], resistance: 50 }, { kind: "fly" }] } },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].name).toHaveLength(80);
    expect(out[0].exercises[0]).toEqual({ exerciseName: "Squat", targetSets: 20, targetReps: "8-12", restSec: 0 });
    expect(out[1].cardio).toEqual({ sport: "bike", durationMin: 600, blocks: [{ kind: "sprint", sec: 20, rpm: [110, 120], resistance: 10 }] });
  });

  it("returns nothing for something that is not a list", () => {
    expect(sanitizeStructure({ name: "x" })).toEqual([]);
    expect(sanitizeStructure(null)).toEqual([]);
  });
});
