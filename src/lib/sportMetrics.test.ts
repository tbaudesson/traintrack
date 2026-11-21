import { describe, expect, it } from "vitest";
import { cadenceUnit, lengthsOf, powerLoad, powerZone, powerZones, swolf } from "./sportMetrics";

describe("swim", () => {
  it("works SWOLF out of the pool, the time and the strokes, nothing without them", () => {
    // 1000 m in a 25 m pool = 40 lengths, 20 min = 30 s a length, + 16 strokes.
    expect(swolf({ distanceM: 1000, durationSec: 1200, poolLengthM: 25, strokesPerLength: 16 })).toBe(46);
    expect(swolf({ distanceM: 1000, durationSec: 1200, poolLengthM: 25 })).toBeNull();
    expect(swolf({ distanceM: 1000, durationSec: 1200, strokesPerLength: 16 })).toBeNull();
    expect(lengthsOf(1500, 50)).toBe(30);
  });
});

describe("power", () => {
  it("places a power in its zone of the FTP", () => {
    expect([100, 160, 200, 240, 280, 330, 500].map((w) => powerZone(w, 250))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(powerZone(200, null)).toBeNull();
    expect(powerZones(200)[0]).toEqual({ zone: 1, from: 0, to: 109 });
    expect(powerZones(200)[6]).toEqual({ zone: 7, from: 300, to: null });
  });

  it("estimates the intensity factor and the TSS from the average power", () => {
    // One hour at FTP: IF 1, TSS 100.
    expect(powerLoad(3600, 250, 250)).toEqual({ intensity: 1, tss: 100 });
    expect(powerLoad(5400, 180, 250)).toEqual({ intensity: 0.72, tss: 78 });
    expect(powerLoad(3600, 200, undefined)).toBeNull();
  });
});

it("counts cadence in steps on foot, turns on a bike", () => {
  expect([cadenceUnit("run"), cadenceUnit("bike"), cadenceUnit("swim")]).toEqual(["spm", "rpm", null]);
});
