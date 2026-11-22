import { describe, expect, it } from "vitest";
import { formatClock, parseClock } from "./clock";

describe("a time to beat", () => {
  it("is shown as a watch shows it", () => {
    expect(formatClock(3000)).toBe("50:00");
    expect(formatClock(12600)).toBe("3:30:00");
    expect(formatClock(65)).toBe("1:05");
  });

  it("is read in the ways people type it", () => {
    expect(parseClock("50")).toBe(3000);
    expect(parseClock("49:30")).toBe(2970);
    expect(parseClock("3:30:00")).toBe(12600);
    expect(parseClock("3h30")).toBe(12600);
    expect(parseClock("vite")).toBeNull();
  });
});
