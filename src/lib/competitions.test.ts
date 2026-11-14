import { describe, expect, it } from "vitest";
import { competitionSummary, finalScore, parseScore } from "./competitions";

describe("finalScore", () => {
  it("averages the tests that were judged", () => {
    expect(finalScore({ compulsory: 6.5, freestyle: 7.25 })).toBe(6.875);
    expect(finalScore({ compulsory: 6, technical: 7, freestyle: 8 })).toBe(7);
    expect(finalScore({})).toBeNull();
  });
});

describe("parseScore", () => {
  it("reads a comma or a dot, between 0 and 10", () => {
    expect(parseScore("7,25")).toBe(7.25);
    expect(parseScore("6.5")).toBe(6.5);
    expect(parseScore("")).toBeNull();
    expect(parseScore("11")).toBeNull();
    expect(parseScore("abc")).toBeNull();
  });
});

describe("competitionSummary", () => {
  it("keeps the bests and the progress since the first", () => {
    const s = competitionSummary([
      { date: "2026-06-01", compulsory: 6, freestyle: 6.5 },
      { date: "2026-03-01", compulsory: 5.5, freestyle: 6 },
      { date: "2026-09-01", compulsory: 6.8, freestyle: 7 },
    ]);
    expect(s.best).toEqual({ compulsory: 6.8, technical: null, freestyle: 7, final: 6.9 });
    expect(s.progress).toBe(1.15);
  });
});
