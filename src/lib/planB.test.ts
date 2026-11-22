import { describe, expect, it } from "vitest";
import { planBHref, readPlanB } from "./planB";

describe("one's plan B", () => {
  it("is read back only when it is one the app knows", () => {
    expect(readPlanB({ kind: "timed", focus: "full", minutes: 15 })).toEqual({ kind: "timed", focus: "full", minutes: 15 });
    expect(readPlanB({ kind: "cardio", sport: "run", minutes: 30 })).toEqual({ kind: "cardio", sport: "run", minutes: 30 });
    expect(readPlanB({ kind: "program", programUuid: "p1", dayIndex: 2 })).toEqual({ kind: "program", programUuid: "p1", dayIndex: 2 });
    expect(readPlanB({ kind: "timed", focus: "arms", minutes: 15 })).toBeNull();
    expect(readPlanB({ kind: "cardio", sport: "curling", minutes: 30 })).toBeNull();
    expect(readPlanB({ kind: "mobility", mode: "stretch", minutes: 1.5 })).toBeNull();
    expect(readPlanB("HIIT")).toBeNull();
  });

  it("opens a timed session or a routine ready to start", () => {
    expect(planBHref({ kind: "timed", focus: "abs", minutes: 10 })).toBe("/intervals?focus=abs&minutes=10");
    expect(planBHref({ kind: "mobility", mode: "yoga", minutes: 20 })).toBe("/mobility?mode=yoga&minutes=20");
    expect(planBHref({ kind: "cardio", sport: "run", minutes: 20 })).toBeNull();
  });
});

describe("the plan B kept with the profile", async () => {
  const { reconcilePlanB, storePlanB } = await import("./planB");
  const hiit = { kind: "timed" as const, focus: "full" as const, minutes: 15 };

  it("comes from the profile once chosen anywhere, none included", () => {
    expect(reconcilePlanB(null, hiit)).toEqual({ kind: "useProfile", planB: hiit });
    expect(reconcilePlanB(hiit, { kind: "none" })).toEqual({ kind: "useProfile", planB: null });
    expect(reconcilePlanB(hiit, hiit)).toBeNull();
  });

  it("is handed to a profile that has none yet", () => {
    expect(reconcilePlanB(hiit, null)).toEqual({ kind: "saveToProfile", stored: hiit });
    expect(reconcilePlanB(null, null)).toBeNull();
    expect(storePlanB(null)).toEqual({ kind: "none" });
  });
});
