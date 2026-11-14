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

describe("planRunBlocks", () => {
  const fr = (work: string, intensity = "Zone 5") => ({
    sport: "run",
    intensity,
    steps: ["Échauffement : 15 min de footing très facile, puis 4 gammes sur 20 m", work, "Retour au calme : 10 min de footing très lent, puis étirements doux"],
  });

  it("reads repeats in metres, with their recovery", async () => {
    const { planRunBlocks } = await import("./runWorkouts");
    const blocks = planRunBlocks(fr("8 × 400 m rapides, 1 min 30 de récupération en trottinant"))!;
    expect(blocks[0]).toEqual({ kind: "warmup", zone: "easy", sec: 900 });
    expect(blocks.filter((b) => b.kind === "work")).toHaveLength(8);
    expect(blocks[1]).toEqual({ kind: "work", zone: "vma", meters: 400 });
    expect(blocks[2]).toEqual({ kind: "recovery", zone: "recovery", sec: 90 });
    expect(blocks.at(-1)).toEqual({ kind: "cooldown", zone: "recovery", sec: 600 });
  });

  it("reads repeats in minutes, kilometres and seconds, in any language", async () => {
    const { planRunBlocks } = await import("./runWorkouts");
    expect(planRunBlocks(fr("3 × 10 min soutenu, 2 min de récupération", "Zone 4"))![1]).toEqual({ kind: "work", zone: "threshold", sec: 600 });
    expect(planRunBlocks(fr("3 × 1 km à allure marathon, 2 min de récupération", "allure marathon"))![1]).toEqual({ kind: "work", zone: "10k", meters: 1000 });
    const hills = planRunBlocks({ sport: "run", intensity: "Zone 4", steps: ["Warm-up: 15 min very easy jog", "6 × 45 s uphill at a strong effort, jog back down", "Cool-down: 10 min very slow jog"] })!;
    expect(hills[1]).toEqual({ kind: "work", zone: "5k", sec: 45 });
    expect(hills[2]).toEqual({ kind: "recovery", zone: "recovery", sec: 90 });
    const walkRun = planRunBlocks({ sport: "run", intensity: "Zone 2", steps: ["Échauffement : 5 min de marche rapide", "8 × (1 min de course, 2 min de marche)", "Retour au calme : 5 min de marche"] })!;
    expect(walkRun[1]).toEqual({ kind: "work", zone: "easy", sec: 60 });
    expect(walkRun[2]).toEqual({ kind: "recovery", zone: "recovery", sec: 120 });
    expect(walkRun[0].sec).toBe(300);
  });

  it("leaves a run without repeats, or another sport", async () => {
    const { planRunBlocks } = await import("./runWorkouts");
    expect(planRunBlocks({ sport: "run", intensity: "Zone 2", steps: ["10 min facile", "7 km en aisance", "Étirements"] })).toBeNull();
    expect(planRunBlocks({ sport: "bike", intensity: "Zone 4", steps: ["3 × 8 min en Zone 3-4, 4 min de récupération"] })).toBeNull();
  });
});
