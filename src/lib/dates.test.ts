import { describe, expect, it } from "vitest";
import { localDate, localDateIn } from "./dates";

describe("local dates", () => {
  it("follow the local day", () => {
    expect(localDate(new Date(2026, 10, 11, 0, 30))).toBe("2026-11-11");
    expect(localDate(new Date(2026, 10, 10, 23, 59))).toBe("2026-11-10");
  });

  it("count calendar days across months and a clock change", () => {
    expect(localDateIn(-7, new Date(2026, 10, 3, 12))).toBe("2026-10-27");
    expect(localDateIn(1, new Date(2026, 2, 28, 23, 30))).toBe("2026-03-29");
    expect(localDateIn(-30, new Date(2026, 10, 13))).toBe("2026-10-14");
  });
});
