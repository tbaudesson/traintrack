import { describe, expect, it } from "vitest";
import { Encoder, Profile } from "@garmin/fitsdk";
import { parseFit } from "./fit";

/** A FIT file as a watch writes it, built with Garmin's own encoder. */
function fitFile(session: Record<string, unknown>, lengths: Record<string, unknown>[] = []): Uint8Array {
  const e = new Encoder();
  const start = new Date("2026-11-20T08:00:00Z");
  e.onMesg(Profile.MesgNum.FILE_ID, { type: "activity", manufacturer: "garmin", product: 0, timeCreated: start, serialNumber: 1 } as never);
  for (const l of lengths) e.onMesg(Profile.MesgNum.LENGTH, { timestamp: start, startTime: start, lengthType: "active", ...l } as never);
  e.onMesg(Profile.MesgNum.SESSION, { startTime: start, timestamp: new Date("2026-11-20T09:00:00Z"), ...session } as never);
  return e.close();
}

describe("parseFit", () => {
  it("reads a ride: distance, time moving, climb, heart rate, cadence and power", () => {
    const ride = parseFit(fitFile({ sport: "cycling", totalTimerTime: 3600, totalElapsedTime: 3900, totalDistance: 30000, totalAscent: 420, avgHeartRate: 140, maxHeartRate: 171, avgCadence: 88, avgPower: 205, maxPower: 610 }));
    expect(ride).toMatchObject({ sport: "bike", distanceM: 30000, durationSec: 3600, elevationGainM: 420, avgHr: 140, maxHr: 171, avgCadence: 88, avgPowerW: 205, maxPowerW: 610 });
    expect(ride?.start?.toISOString()).toBe("2026-11-20T08:00:00.000Z");
  });

  it("doubles a running cadence written for one foot", () => {
    expect(parseFit(fitFile({ sport: "running", totalTimerTime: 1800, totalDistance: 6000, avgCadence: 84, avgFractionalCadence: 0.5 }))?.avgCadence).toBe(169);
  });

  it("reads a pool swim: pool, main stroke, strokes per length; open water has no pool", () => {
    const pool = parseFit(fitFile({ sport: "swimming", subSport: "lapSwimming", totalTimerTime: 1500, totalDistance: 1500, poolLength: 25, avgStrokeCount: 16.4 }, [{ swimStroke: "freestyle" }, { swimStroke: "freestyle" }, { swimStroke: "breaststroke" }]));
    expect(pool).toMatchObject({ sport: "swim", distanceM: 1500, poolLengthM: 25, swimStroke: "free", strokesPerLength: 16 });
    expect(pool?.avgCadence).toBeUndefined();
    const open = parseFit(fitFile({ sport: "swimming", subSport: "openWater", totalTimerTime: 2400, totalDistance: 2000 }));
    expect(open).toMatchObject({ poolLengthM: 0, strokesPerLength: undefined });
  });

  it("refuses what is not a FIT file, or holds nothing measured", () => {
    expect(parseFit(new TextEncoder().encode("<gpx></gpx>"))).toBeNull();
    expect(parseFit(fitFile({ sport: "running", totalTimerTime: 5, totalDistance: 0 }))).toBeNull();
  });
});
