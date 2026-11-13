import { describe, expect, it } from "vitest";
import { formatPercents, parsePercents, percentWeights, referenceMax } from "./percent";

describe("percentages of the 1RM", () => {
  it("read one percentage or one per set", () => {
    expect(parsePercents("75")).toEqual([75]);
    expect(parsePercents("70/75/80")).toEqual([70, 75, 80]);
    expect(parsePercents("70 %, 75 %")).toEqual([70, 75]);
    expect(parsePercents("")).toBeUndefined();
    expect(parsePercents("750")).toBeUndefined();
    expect(formatPercents([70, 75])).toBe("70/75");
  });

  it("weigh each set to the nearest plate step, holding the last percentage", () => {
    expect(percentWeights([70, 75, 80], 3, 100)).toEqual([70, 75, 80]);
    expect(percentWeights([75], 3, 113)).toEqual([85, 85, 85]);
    expect(percentWeights([70, 80], 3, 31, "dumbbell")).toEqual([22, 24, 24]);
  });

  it("take the best 1RM of the last three months, or the best ever", () => {
    const history = [{ date: "2026-03-01", oneRepMax: 120 }, { date: "2026-10-01", oneRepMax: 105 }, { date: "2026-11-01", oneRepMax: 108 }];
    expect(referenceMax(history, "2026-11-13")).toBe(108);
    expect(referenceMax([{ date: "2026-03-01", oneRepMax: 120 }], "2026-11-13")).toBe(120);
    expect(referenceMax([], "2026-11-13")).toBeNull();
  });
});
