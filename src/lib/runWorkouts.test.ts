import { describe, expect, it } from "vitest";
import { RUN_WORKOUTS, runTotals, runWorkout, timedBlocks } from "./runWorkouts";

describe("runWorkouts", () => {
  it("open with a warm-up and end with a cool-down, at every level", () => {
    for (const w of RUN_WORKOUTS) {
      for (const level of ["beginner", "intermediate", "advanced"] as const) {
        const blocks = w.blocks(level);
        expect(blocks[0].kind, w.id).toBe("warmup");
        expect(blocks.at(-1)?.kind, w.id).toBe("cooldown");
        expect(blocks.some((b) => b.kind === "work"), w.id).toBe(true);
        expect(blocks.every((b) => (b.sec ?? 0) > 0 || (b.meters ?? 0) > 0), w.id).toBe(true);
      }
    }
  });

  it("ask more of an advanced runner", () => {
    const efforts = (level: "beginner" | "advanced") => runWorkout("400")!.blocks(level).filter((b) => b.kind === "work").length;
    expect(efforts("beginner")).toBe(6);
    expect(efforts("advanced")).toBe(10);
  });

  it("leave no recovery after the last effort", () => {
    const blocks = runWorkout("800")!.blocks("intermediate");
    expect(blocks.at(-2)?.kind).toBe("work");
  });

  it("work out time and distance from the VMA", () => {
    const blocks = timedBlocks(runWorkout("400")!.blocks("beginner"), 15);
    const totals = runTotals(blocks);
    expect(blocks[1]).toMatchObject({ kind: "work", meters: 400, sec: 96, byDistance: true });
    expect(totals.efforts).toBe(6);
    expect(totals.sec).toBe(12 * 60 + 6 * 96 + 5 * 90 + 10 * 60);
    expect(totals.meters).toBeGreaterThan(5000);
  });

  it("the half-Cooper is six minutes flat out", () => {
    const main = runWorkout("half-cooper")!.blocks("intermediate").filter((b) => b.kind === "work");
    expect(main).toEqual([{ kind: "work", zone: "vma", sec: 360 }]);
  });
});
