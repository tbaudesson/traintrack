import { describe, expect, it } from "vitest";
import { calendarDays, yearSummary } from "./planCalendar";

const program = { name: "PPL" } as never;

describe("calendarDays", () => {
  it("puts on each day what was done, what is planned and what was missed", () => {
    const days = calendarDays(
      [{ date: "2026-11-02" }, { date: "2026-11-02" }, { date: "2026-11-03", cancelledAt: "x" }],
      [
        { date: "2026-11-04", status: "missed", label: "PPL", program },
        { date: "2026-11-24", status: "planned", label: "Push", program },
        { date: "2026-11-02", status: "done", label: "Pull", program },
      ]
    );
    expect(days.get("2026-11-02")).toEqual({ done: 2, planned: [], missed: [] });
    expect(days.get("2026-11-03")).toBeUndefined();
    expect(days.get("2026-11-04")?.missed).toEqual(["PPL"]);
    expect(days.get("2026-11-24")?.planned).toEqual(["PPL — Push"]);
  });
});

describe("yearSummary", () => {
  it("sums each month: done and its time, missed, still planned", () => {
    const year = yearSummary(
      2026,
      [{ date: "2026-01-05", durationMin: 60 }, { date: "2026-01-20", durationSec: 1800 }, { date: "2026-11-02", durationMin: 45 }],
      [{ date: "2026-01-07", status: "missed" }, { date: "2026-12-01", status: "planned" }, { date: "2026-12-03", status: "planned" }]
    );
    expect(year).toHaveLength(12);
    expect(year[0]).toEqual({ month: "2026-01", done: 2, minutes: 90, missed: 1, planned: 0 });
    expect(year[11]).toMatchObject({ done: 0, planned: 2 });
  });
});
