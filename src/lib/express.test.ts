import { describe, expect, it } from "vitest";
import type { ProgramDay } from "@/db";
import { dayMinutes, expressDay } from "./express";

const ex = (exerciseName: string, targetSets: number, targetReps = "8-10", restSec = 90) => ({ exerciseName, targetSets, targetReps, restSec });
const day: ProgramDay = {
  name: "Haut du corps",
  exercises: [ex("Barbell Bench Press", 4, "5", 180), ex("Barbell Row", 4, "6-8", 120), ex("Overhead Press", 3), ex("Lat Pulldown", 3), ex("Lateral Raise", 3, "12-15", 60), ex("Hammer Curl", 3, "10-12", 60)],
};

describe("dayMinutes", () => {
  it("counts sets, rests and the warm-up", () => {
    expect(dayMinutes(day)).toBe(53);
    expect(dayMinutes({ exercises: [ex("Plank", 3, "45s", 30)] })).toBe(9);
  });

  it("leaves no rest inside a superset", () => {
    expect(dayMinutes({ exercises: [{ ...ex("A", 2), supersetWithNext: true }, ex("B", 2)] })).toBe(5 + Math.round((2 * 40 + 2 * 130) / 60));
  });
});

describe("expressDay", () => {
  it("keeps a day that already fits", () => {
    expect(expressDay(day, 60)).toEqual({ day, dropped: [] });
  });

  it("keeps the main lifts and pairs the others in supersets", () => {
    const { day: short, dropped } = expressDay(day, 30);
    expect(dayMinutes(short)).toBeLessThanOrEqual(30);
    expect(short.name).toBe("Haut du corps");
    expect(short.exercises.slice(0, 2).map((e) => [e.exerciseName, e.targetSets])).toEqual([["Barbell Bench Press", 3], ["Barbell Row", 3]]);
    expect(short.exercises[2]).toMatchObject({ exerciseName: "Overhead Press", targetSets: 2, restSec: 60, supersetWithNext: true });
    expect(short.exercises.at(-1)?.supersetWithNext).toBe(false);
    expect(dropped.length + short.exercises.length).toBe(6);
  });

  it("goes down to one main lift when time is very short", () => {
    const { day: short, dropped } = expressDay(day, 10);
    expect(short.exercises.map((e) => e.exerciseName)).toEqual(["Barbell Bench Press"]);
    expect(dropped).toContain("Barbell Row");
  });
});
