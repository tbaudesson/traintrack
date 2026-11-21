import { describe, expect, it } from "vitest";
import { between, parseActivityFile, parseGpx, parseTcx } from "./gpx";

/** A straight run north, 10 s and about 33 m between points. */
function track(options: { type?: string; points?: number; pauseAt?: number; climb?: number[]; hr?: boolean } = {}) {
  const n = options.points ?? 31;
  const start = Date.parse("2026-11-12T06:30:00Z");
  let seconds = 0;
  const pts = Array.from({ length: n }, (_, i) => {
    if (i === options.pauseAt) seconds += 300;
    const time = new Date(start + seconds * 1000).toISOString();
    seconds += 10;
    const ele = options.climb?.[i] ?? 100;
    const hr = options.hr ? `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${140 + (i % 10)}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>` : "";
    return `<trkpt lat="${(49.6 + i * 0.0003).toFixed(6)}" lon="6.13"><ele>${ele}</ele><time>${time}</time>${hr}</trkpt>`;
  });
  return `<?xml version="1.0"?><gpx creator="Garmin"><trk><name>Morning Run &amp; coffee</name>${options.type ? `<type>${options.type}</type>` : ""}<trkseg>${pts.join("")}</trkseg></trk></gpx>`;
}

describe("GPX import", () => {
  it("measure the distance and the time of a run", () => {
    const run = parseGpx(track({ type: "running" }))!;
    expect(run.sport).toBe("run");
    expect(run.name).toBe("Morning Run & coffee");
    expect(run.distanceM).toBeGreaterThan(990);
    expect(run.distanceM).toBeLessThan(1010);
    expect(run.durationSec).toBe(300);
    expect(run.start?.toISOString()).toBe("2026-11-12T06:30:00.000Z");
  });

  it("leave a long stop out of the moving time", () => {
    expect(parseGpx(track({ pauseAt: 15 }))!.durationSec).toBe(290);
  });

  it("count the climbs, not the GPS noise", () => {
    const climb = Array.from({ length: 31 }, (_, i) => (i < 20 ? 100 + i * 2 : 140 + (i % 2)));
    expect(parseGpx(track({ climb }))!.elevationGainM).toBeGreaterThanOrEqual(36);
    expect(parseGpx(track({ climb }))!.elevationGainM).toBeLessThanOrEqual(40);
  });

  it("read the heart rate, and the sport codes of Strava", () => {
    const ride = parseGpx(track({ type: "1", hr: true }))!;
    expect(ride.sport).toBe("bike");
    expect(ride.avgHr).toBe(144);
    expect(ride.maxHr).toBe(149);
  });

  it("refuse a file without a track", () => {
    expect(parseGpx('<gpx><trk><name>Pool</name><trkseg></trkseg></trk></gpx>')).toBeNull();
    expect(parseGpx("not a gpx")).toBeNull();
  });

  it("measure a known distance", () => {
    // Luxembourg to Metz, about 54 km as the crow flies.
    expect(Math.round(between({ lat: 49.6116, lon: 6.1319 }, { lat: 49.1193, lon: 6.1757 }) / 1000)).toBe(55);
  });
});

describe("a hike from a GPS file", () => {
  it("is filed as a hike, a trail run stays a run", () => {
    for (const type of ["hiking", "Walking", "trekking", "11"]) expect(parseGpx(track({ type }))!.sport, type).toBe("hike");
    for (const type of ["running", "trail_running", "9"]) expect(parseGpx(track({ type }))!.sport, type).toBe("run");
  });
});

describe("cadence and power from a watch", () => {
  const point = (i: number, cad: number, power?: number) =>
    `<trkpt lat="45.${1000 + i * 10}" lon="6.1000"><ele>500</ele><time>2026-11-20T10:${String(i).padStart(2, "0")}:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>140</gpxtpx:hr><gpxtpx:cad>${cad}</gpxtpx:cad></gpxtpx:TrackPointExtension>${power !== undefined ? `<power>${power}</power>` : ""}</extensions></trkpt>`;
  it("doubles a running cadence written for one foot, and averages the power", () => {
    const run = `<gpx><trk><type>running</type><trkseg>${[0, 1, 2].map((i) => point(i, 85)).join("")}</trkseg></trk></gpx>`;
    expect(parseGpx(run)?.avgCadence).toBe(170);
    const ride = `<gpx><trk><type>cycling</type><trkseg>${[0, 1, 2].map((i) => point(i, 90, 200 + i * 20)).join("")}</trkseg></trk></gpx>`;
    expect(parseGpx(ride)).toMatchObject({ avgCadence: 90, avgPowerW: 220, maxPowerW: 240 });
  });
});

describe("parseTcx", () => {
  const lap = (sec: number, m: number, hr: number, max: number, points = "") =>
    `<Lap StartTime="x"><TotalTimeSeconds>${sec}</TotalTimeSeconds><DistanceMeters>${m}</DistanceMeters><AverageHeartRateBpm><Value>${hr}</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>${max}</Value></MaximumHeartRateBpm><Track>${points}</Track></Lap>`;
  const tp = (alt: number, watts: number, cad: number) =>
    `<Trackpoint><AltitudeMeters>${alt}</AltitudeMeters><Cadence>${cad}</Cadence><Extensions><ns3:TPX><ns3:Watts>${watts}</ns3:Watts></ns3:TPX></Extensions></Trackpoint>`;
  const file = (sport: string, laps: string) =>
    `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="${sport}"><Id>2026-11-20T08:00:00Z</Id>${laps}</Activity></Activities></TrainingCenterDatabase>`;

  it("reads a ride: laps for distance, time and heart rate, points for climb, cadence and power", () => {
    const ride = parseActivityFile(file("Biking", lap(1800, 15000, 140, 160, tp(100, 200, 88) + tp(110, 240, 92)) + lap(1800, 14000, 150, 172, tp(120, 220, 90))));
    expect(ride).toMatchObject({ sport: "bike", distanceM: 29000, durationSec: 3600, avgHr: 145, maxHr: 172, avgCadence: 90, avgPowerW: 220, maxPowerW: 240, elevationGainM: 20 });
    expect(ride?.start?.toISOString()).toBe("2026-11-20T08:00:00.000Z");
  });

  it("reads a pool swim, which has no GPS track, and refuses an empty file", () => {
    expect(parseTcx(file("Swimming", lap(1500, 1500, 130, 150)))).toMatchObject({ sport: "swim", distanceM: 1500, durationSec: 1500 });
    expect(parseTcx("<TrainingCenterDatabase></TrainingCenterDatabase>")).toBeNull();
  });
});
