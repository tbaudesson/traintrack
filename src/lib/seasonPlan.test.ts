import { describe, expect, it } from "vitest";
import { fitToEvent, upcomingCompetitions } from "./seasonPlan";

describe("fitToEvent", () => {
  it("ends the plan on the event's week", () => {
    // Saturday 20 March 2027, a 12-week plan: taper week 15–21 March, start Monday 28 December, 11 weeks before.
    expect(fitToEvent("2027-03-20", 12, "2026-11-14")).toEqual({ start: "2026-12-28", lastWeek: { from: "2027-03-15", to: "2027-03-21" }, missed: 0 });
  });

  it("counts the weeks already gone when it is late", () => {
    // Event Sunday 6 December 2026, 8 weeks: start 12 October; today Saturday 14 November is in week 5.
    expect(fitToEvent("2026-12-06", 8, "2026-11-14")).toMatchObject({ start: "2026-10-12", missed: 4 });
  });
});

describe("upcomingCompetitions", () => {
  it("keeps the dated, not yet scored ones, the nearest first", () => {
    const list = [
      { date: "2027-02-01", event: "B" },
      { date: "2026-12-01", event: "A" },
      { date: "2026-12-05", event: "Done", compulsory: 6 },
      { date: "2026-10-01", event: "Past" },
    ];
    expect(upcomingCompetitions(list, "2026-11-14").map((c) => c.event)).toEqual(["A", "B"]);
  });
});
