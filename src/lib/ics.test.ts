import { describe, expect, it } from "vitest";
import { planCalendar, trainingCalendar } from "./ics";
import { plannedSessions } from "./weekPlan";

const now = new Date("2026-11-14T10:00:00Z");

describe("plannedSessions", () => {
  it("places the next sessions on the training days ahead, skipping a day trained", () => {
    // 2026-11-14 is a Saturday; training on Monday, Wednesday and Saturday.
    const out = plannedSessions({ today: "2026-11-14", trainingDays: [1, 3, 6], workouts: [{ date: "2026-11-14" }], upcoming: ["A", "B", "C", "D"], weeks: 2 });
    expect(out).toEqual([
      { date: "2026-11-16", label: "A" },
      { date: "2026-11-18", label: "B" },
      { date: "2026-11-21", label: "C" },
      { date: "2026-11-23", label: "D" },
    ]);
  });

  it("stops at the end of the weeks asked for", () => {
    const out = plannedSessions({ today: "2026-11-14", trainingDays: [6], workouts: [], upcoming: Array(20).fill("A"), weeks: 2 });
    expect(out.map((s) => s.date)).toEqual(["2026-11-14", "2026-11-21"]);
  });
});

describe("planCalendar", () => {
  const ics = planCalendar({
    sessions: [{ date: "2026-11-16", title: "Push; day", description: "Program, week 1" }],
    competitions: [{ date: "2026-12-05", title: "CVI Lyon" }],
    time: "18:30",
    owner: "u1",
    calendarName: "TrainTrack",
    now,
  });

  it("puts a session at the training time, with an alarm", () => {
    expect(ics).toContain("UID:session-2026-11-16-u1@traintrack");
    expect(ics).toContain("DTSTART:20261116T183000");
    expect(ics).toContain(String.raw`SUMMARY:Push\; day`);
    expect(ics).toContain("DESCRIPTION:Program\\, week 1");
    expect(ics).toContain("TRIGGER:-PT30M");
  });

  it("puts a competition over its whole day", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20261205");
    expect(ics).toContain("DTEND;VALUE=DATE:20261206");
    expect(ics.split("BEGIN:VALARM").length).toBe(2);
  });

  it("makes whole-day sessions without a training time", () => {
    const allDay = planCalendar({ sessions: [{ date: "2026-12-31", title: "Run" }], competitions: [], time: null, owner: "u1", calendarName: "T", now });
    expect(allDay).toContain("DTEND;VALUE=DATE:20270101");
    expect(allDay).not.toContain("VALARM");
    expect(allDay.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

it("keeps the weekly reminder of the training days", () => {
  const ics = trainingCalendar({ days: [1, 4], time: "07:00", title: "Training", description: "", from: "2026-11-14", uid: "x", now });
  expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,TH");
  expect(ics).toContain("DTSTART:20261116T070000");
});
