import { describe, expect, it } from "vitest";
import { recentWeeks, weekLoad } from "./horseLoad";

const s = (date: string, walkMin: number, trotMin: number, canterMin: number) => ({ date, walkMin, trotMin, canterMin });

describe("weekLoad", () => {
  // Week of Monday 9 November 2026; today Saturday 14.
  const sessions = [s("2026-11-09", 10, 5, 15), s("2026-11-10", 10, 5, 25), s("2026-11-12", 15, 10, 20), s("2026-11-02", 30, 0, 30)];

  it("adds the week's work against the limit", () => {
    const w = weekLoad(sessions, 120, "2026-11-09", "2026-11-14");
    expect(w).toMatchObject({ total: 115, canter: 60, limit: 120, status: "near", hardSessions: 1 });
    expect(w.share).toBeCloseTo(0.958, 2);
  });

  it("counts the rest days so far, and uses the default limit when none is set", () => {
    const w = weekLoad(sessions, null, "2026-11-09", "2026-11-14");
    expect(w.restDays).toBe(3);
    expect(w.limit).toBe(150);
    expect(w.status).toBe("ok");
  });

  it("says when the limit is passed", () => {
    expect(weekLoad(sessions, 100, "2026-11-09", "2026-11-14").status).toBe("over");
  });
});

describe("recentWeeks", () => {
  it("gives the last weeks, this one last", () => {
    const weeks = recentWeeks([s("2026-11-02", 30, 0, 30), s("2026-11-12", 20, 0, 10)], 150, "2026-11-14");
    expect(weeks.map((w) => [w.monday, w.total])).toEqual([["2026-10-19", 0], ["2026-10-26", 0], ["2026-11-02", 60], ["2026-11-09", 30]]);
  });
});
