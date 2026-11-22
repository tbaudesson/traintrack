import { describe, expect, it } from "vitest";
import { bodySignals, maxHrForAge, normalizedPower, trimp } from "./recovery";

const day = (n: number) => `2026-11-${String(n).padStart(2, "0")}`;

describe("the body's signals, against one's usual values", () => {
  const usual = [1, 3, 5, 7, 9, 11].map((n) => ({ date: day(n), restingHr: 52, hrv: 70 }));

  it("note a resting heart rate a few beats above usual", () => {
    const s = bodySignals([...usual, { date: day(21), restingHr: 58, hrv: 68 }], day(22));
    expect(s.restingHr).toMatchObject({ value: 58, baseline: 52, delta: 6, flagged: true });
    expect(s.hrv?.flagged).toBe(false);
  });

  it("note a variability well below usual", () => {
    const s = bodySignals([...usual, { date: day(22), restingHr: 53, hrv: 56 }], day(22));
    expect(s.hrv?.flagged).toBe(true);
    expect(s.hrv?.delta).toBeCloseTo(-0.2);
  });

  it("say nothing without a recent reading or a usual level known", () => {
    expect(bodySignals([...usual, { date: day(15), restingHr: 60 }], day(22)).restingHr).toBeNull();
    expect(bodySignals([{ date: day(21), restingHr: 50 }, { date: day(22), restingHr: 60 }], day(22)).restingHr).toBeNull();
  });
});

describe("the training impulse (TRIMP)", () => {
  it("weighs the minutes by the heart's effort", () => {
    // 60 min at 150 bpm, rest 50, max 190: ratio 0.714.
    expect(trimp({ minutes: 60, avgHr: 150, restHr: 50, maxHr: 190 })).toBe(108);
    expect(trimp({ minutes: 60, avgHr: 150, restHr: 50, maxHr: 190, sex: "female" })).toBe(121);
    expect(trimp({ minutes: 60, avgHr: 45, restHr: 50, maxHr: 190 })).toBeNull();
  });

  it("takes a maximum from the age when none is known", () => {
    expect(maxHrForAge(40)).toBe(180);
  });
});

describe("normalized power", () => {
  it("is the power of a steady ride, and costs more when it surges", () => {
    expect(normalizedPower(Array(1200).fill(200))).toBe(200);
    const surges = Array.from({ length: 1200 }, (_, i) => (Math.floor(i / 60) % 2 ? 300 : 100));
    expect(normalizedPower(surges)!).toBeGreaterThan(200);
    expect(normalizedPower(Array(300).fill(200))).toBeNull();
  });
});
