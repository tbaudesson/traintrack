import { describe, expect, it } from "vitest";
import { between, parseGpx } from "./gpx";

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
