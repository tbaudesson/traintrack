import { describe, expect, it } from "vitest";
import { formatShortDay, formatDay, formatNumber } from "./format";

describe("formatting by language", () => {
  it("write numbers the local way", () => {
    expect(formatNumber(56623, "fr").replace(/\s/g, " ")).toBe("56 623");
    expect(formatNumber(67.5, "fr")).toBe("67,5");
    expect(formatNumber(56623, "en")).toBe("56,623");
    expect(formatNumber(56623, "de")).toBe("56.623");
  });

  it("write dates the local way", () => {
    expect(formatDay("2026-11-13", "fr")).toBe("13/11/2026");
    expect(formatDay("2026-11-13", "de")).toBe("13.11.2026");
  });
});

describe("formatShortDay", () => {
  it("writes the day and month in the app's order", () => {
    expect(formatShortDay("2026-11-03", "fr")).toBe("03/11");
    expect(formatShortDay("2026-11-03", "en")).toBe("11/03");
    expect(formatShortDay("2026-11-03", "de")).toBe("03.11.");
  });
});
