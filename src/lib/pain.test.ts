import { describe, expect, it } from "vitest";
import { painReports, recentPainOn, worstRecentPain } from "./pain";

const workouts = [{ id: 1, date: "2026-11-02" }, { id: 2, date: "2026-11-10" }, { id: 3, date: "2026-10-01" }];
const notes = [
  { workoutId: 1, userId: "a", painArea: "knee", painLevel: 4, exerciseUuid: "squat", exerciseName: "Back Squat", body: "" },
  { workoutId: 2, userId: "a", painArea: "shoulder", painLevel: 8, exerciseUuid: "bench", exerciseName: "Bench", body: "Sharp" },
  { workoutId: 2, userId: "coach", body: "Nice work" },
  { workoutId: 3, userId: "a", painArea: "knee", painLevel: 6, exerciseUuid: "squat", exerciseName: "Back Squat", body: "" },
  { workoutId: 2, userId: "a", painArea: "hip", painLevel: 3, deletedAt: "2026-11-10T10:00:00Z" },
];

describe("pain reports", () => {
  const reports = painReports(notes, workouts, "a");

  it("keep the notes carrying a pain, latest first", () => {
    expect(reports.map((r) => [r.date, r.area, r.level])).toEqual([
      ["2026-11-10", "shoulder", 8],
      ["2026-11-02", "knee", 4],
      ["2026-10-01", "knee", 6],
    ]);
  });

  it("warn on an exercise for two weeks", () => {
    expect(recentPainOn(reports, { uuid: "squat" }, "2026-11-13")?.level).toBe(4);
    expect(recentPainOn(reports, { uuid: "squat" }, "2026-11-20")).toBeUndefined();
    expect(recentPainOn(reports, { name: "Bench" }, "2026-11-13")?.note).toBe("Sharp");
  });

  it("give the coach the worst pain of the week", () => {
    expect(worstRecentPain(reports, "2026-11-13")).toMatchObject({ area: "shoulder", level: 8 });
    expect(worstRecentPain(reports, "2026-11-30")).toBeUndefined();
  });
});
