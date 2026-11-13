import { describe, expect, it } from "vitest";
import type { Program } from "@/db";
import { programKind, programProgress } from "./programCards";

const program = (name: string, structure: object[], id = 1) => ({ id, name, structure }) as unknown as Program;
const catalogue = [{ name: "Sec et fort", goal: "fat_loss" as const }, { name: "Marathon en 16 semaines", goal: "endurance" as const }];

describe("program cards", () => {
  it("take the goal of the ready-made program, else guess from the days", () => {
    expect(programKind(program("Sec et fort", [{ name: "A", exercises: [] }]), catalogue)).toEqual({ kind: "fat_loss", sport: undefined });
    const run = [{ name: "W1 · Easy", exercises: [], cardio: { sport: "run" } }, { name: "W1 · Swim", exercises: [], cardio: { sport: "swim" } }, { name: "W1 · Long", exercises: [], cardio: { sport: "run" } }];
    expect(programKind(program("Marathon en 16 semaines", run), catalogue)).toEqual({ kind: "endurance", sport: "run" });
    expect(programKind(program("Mon tri", run), catalogue)).toEqual({ kind: "endurance", sport: "run" });
    expect(programKind(program("Mon split", [{ name: "Push", exercises: [] }]), catalogue)).toEqual({ kind: "strength" });
  });

  it("give a plan its share done, and a rotation its session count", () => {
    const plan = program("5 km", [1, 1, 2, 2, 3].map((week, i) => ({ name: `S${i}`, week, exercises: [] })));
    const did = (programDayIndex: number) => ({ title: "", programId: 1, programDayIndex });
    expect(programProgress(plan, [did(0), did(1), did(1)])).toEqual({ sessions: 3, share: 2 / 5 });
    const rotation = program("Full Body", [{ name: "A", exercises: [] }, { name: "B", exercises: [] }]);
    expect(programProgress(rotation, [did(0), did(1), did(0)])).toEqual({ sessions: 3, share: null });
  });
});
