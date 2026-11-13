import { describe, expect, it } from "vitest";
import { mondayOfDate, upcomingSessions, weekPlan } from "./weekPlan";
import { trainingCalendar } from "./ics";
import type { Program } from "@/db";

const program = (names: string[], weeks = false) =>
  ({ name: "P", structure: names.map((name, i) => ({ name, exercises: [], week: weeks ? i + 1 : undefined })) }) as unknown as Program;

describe("week plan", () => {
  // Monday 9 to Sunday 15 November 2026, today Wednesday 11.
  const base = { monday: "2026-11-09", today: "2026-11-11", trainingDays: [1, 3, 5] };

  it("show what was done, what was missed and what is coming", () => {
    const plan = weekPlan({ ...base, workouts: [{ date: "2026-11-10", title: "Day A" }], upcoming: ["Day B", "Day C"] });
    expect(plan.map((d) => [d.weekday, d.status, d.label ?? ""])).toEqual([
      [1, "missed", ""],
      [2, "done", "Day A"],
      [3, "planned", "Day B"],
      [4, "rest", ""],
      [5, "planned", "Day C"],
      [6, "rest", ""],
      [7, "rest", ""],
    ]);
    expect(plan[2].today).toBe(true);
  });

  it("count today as done once trained", () => {
    const plan = weekPlan({ ...base, workouts: [{ date: "2026-11-11", title: "Day A" }], upcoming: ["Day B"] });
    expect(plan[2]).toMatchObject({ status: "done", label: "Day A" });
    expect(plan[4]).toMatchObject({ status: "planned", label: "Day B" });
  });

  it("cycle a rotation and stop a plan at its end", () => {
    expect(upcomingSessions(program(["A", "B", "C"]), 2, 3)).toEqual(["C", "A", "B"]);
    expect(upcomingSessions(program(["W1", "W2"], true), 1, 3)).toEqual(["W2"]);
  });
});

describe("training calendar", () => {
  const ics = trainingCalendar({
    days: [5, 1, 3],
    time: "18:30",
    title: "Séance TrainTrack",
    description: "Ouvrez l'app, la séance vous attend",
    from: "2026-11-11",
    uid: "plan-1@traintrack",
    now: new Date("2026-11-11T10:00:00Z"),
  });

  it("repeat every week on the training days, from the next one", () => {
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(ics).toContain("DTSTART:20261111T183000");
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("DESCRIPTION:Ouvrez l'app\\, la séance vous attend");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });

  it("start on the first training day after the start date", () => {
    expect(trainingCalendar({ days: [1], time: "07:00", title: "T", description: "", from: "2026-11-11", uid: "u", now: new Date() }))
      .toContain("DTSTART:20261116T070000");
  });
});

describe("monday of a date", () => {
  it("find the Monday, Sunday included", () => {
    expect(mondayOfDate("2026-11-11")).toBe("2026-11-09");
    expect(mondayOfDate("2026-11-15")).toBe("2026-11-09");
    expect(mondayOfDate("2026-11-09")).toBe("2026-11-09");
  });
});

describe("the session to repeat", () => {
  it("is the latest strength session with work done, before today", async () => {
    const { lastRepeatable } = await import("./startWorkout");
    const workouts = [
      { id: 1, date: "2026-11-09", kind: "strength" as const },
      { id: 2, date: "2026-11-10", kind: "cardio" as const },
      { id: 3, date: "2026-11-10", kind: "strength" as const },
      { id: 4, date: "2026-11-11", kind: "strength" as const },
    ];
    const sets = [
      { workoutId: 1, completed: true },
      { workoutId: 2, completed: true },
      { workoutId: 3, completed: true, isWarmup: true },
      { workoutId: 4, completed: true },
    ];
    expect(lastRepeatable(workouts, sets, "2026-11-11")?.id).toBe(1);
  });
});
