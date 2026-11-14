import { describe, expect, it } from "vitest";
import { lighterReason } from "./readinessAdjust";

describe("lighterReason", () => {
  it("lightens a deload week, whatever the form", () => {
    expect(lighterReason({ deloadWeek: true, readiness: 90, keptNormal: true })).toBe("deload");
  });
  it("lightens a day of low form, unless kept normal", () => {
    expect(lighterReason({ deloadWeek: false, readiness: 40, keptNormal: false })).toBe("readiness");
    expect(lighterReason({ deloadWeek: false, readiness: 40, keptNormal: true })).toBeNull();
  });
  it("leaves a good day, or a day without check-in, as it is", () => {
    expect(lighterReason({ deloadWeek: false, readiness: 50, keptNormal: false })).toBeNull();
    expect(lighterReason({ deloadWeek: false, readiness: null, keptNormal: false })).toBeNull();
  });
});
