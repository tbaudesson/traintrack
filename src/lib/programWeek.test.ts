import { describe, expect, it } from "vitest";
import type { Program } from "@/db";
import { nextMonday, programWeek } from "./programWeek";
import { daysToOffer, nextDayIndex } from "./startWorkout";

const plan = (startDate?: string) =>
  ({
    name: "Plan",
    startDate,
    structure: [1, 1, 2, 2, 3, 3].map((week, i) => ({ name: `W${week} · ${i % 2 ? "B" : "A"}`, week, exercises: [] })),
  }) as unknown as Program;
const rotation = { name: "Rot", startDate: "2026-11-02", structure: ["A", "B", "C"].map((name) => ({ name, exercises: [] })) } as unknown as Program;
const did = (date: string, programDayIndex: number) => ({ date, title: "", programId: undefined, programDayIndex });

describe("program calendar", () => {
  it("count the weeks from the start date, within the plan", () => {
    expect(programWeek(plan("2026-11-02"), "2026-11-01")).toMatchObject({ started: false, week: 1 });
    expect(programWeek(plan("2026-11-02"), "2026-11-11")).toMatchObject({ started: true, week: 2, total: 3, finished: false });
    expect(programWeek(plan("2026-11-02"), "2026-12-01")).toMatchObject({ week: 3, finished: true });
    expect(programWeek(rotation, "2026-11-20")).toMatchObject({ week: 3, total: null });
    expect(programWeek(plan(), "2026-11-11")).toBeNull();
  });

  it("offer the calendar week, even to a late athlete", () => {
    expect(daysToOffer(plan("2026-11-02"), [], "2026-11-18").map((d) => d.index)).toEqual([4, 5]);
    expect(daysToOffer(plan(), [], "2026-11-18").map((d) => d.index)).toEqual([0, 1]);
  });

  it("pick the first session not done this week, then next week's", () => {
    const p = { ...plan("2026-11-02"), id: 1 } as Program;
    const linked = (date: string, index: number) => ({ ...did(date, index), programId: 1 });
    expect(nextDayIndex(p, [], "2026-11-11")).toBe(2);
    expect(nextDayIndex(p, [linked("2026-11-10", 2)], "2026-11-11")).toBe(3);
    expect(nextDayIndex(p, [linked("2026-11-10", 2), linked("2026-11-11", 3)], "2026-11-12")).toBe(4);
  });

  it("go round a rotation from the last session done", () => {
    const r = { ...rotation, id: 2 } as Program;
    expect(nextDayIndex(r, [{ ...did("2026-11-09", 2), programId: 2 }], "2026-11-11")).toBe(0);
    expect(nextDayIndex(r, [], "2026-11-11")).toBe(0);
  });

  it("find the next Monday", () => {
    expect(nextMonday("2026-11-11")).toBe("2026-11-16");
    expect(nextMonday("2026-11-16")).toBe("2026-11-16");
    expect(nextMonday("2026-11-15")).toBe("2026-11-16");
  });
});
