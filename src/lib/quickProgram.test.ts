import { describe, expect, it } from "vitest";
import { quickProgramDays } from "./quickProgram";

describe("quickProgramDays", () => {
  it("gives one empty strength day per training day", () => {
    expect(quickProgramDays("strength", 3, "Jour")).toEqual([
      { name: "Jour 1", exercises: [] },
      { name: "Jour 2", exercises: [] },
      { name: "Jour 3", exercises: [] },
    ]);
  });

  it("gives sessions of the sport chosen", () => {
    const days = quickProgramDays("swim", 2, "Jour");
    expect(days.map((d) => d.cardio)).toEqual([{ sport: "swim" }, { sport: "swim" }]);
  });

  it("keeps between 1 and 7 days", () => {
    expect(quickProgramDays("strength", 0, "J")).toHaveLength(1);
    expect(quickProgramDays("run", 12, "J")).toHaveLength(7);
  });
});
