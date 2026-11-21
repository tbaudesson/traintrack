import type { Sport } from "@/db";

export interface GpxActivity {
  name?: string;
  sport?: Sport;
  start?: Date;
  distanceM: number;
  /** Time spent moving: pauses at a red light or a water stop are left out. */
  durationSec: number;
  elevationGainM: number;
  avgHr?: number;
  maxHr?: number;
  /** Steps a minute on foot, turns a minute on a bike. */
  avgCadence?: number;
  avgPowerW?: number;
  maxPowerW?: number;
  /** A swim, when the file knows it (FIT): the pool (0 in open water), the main stroke, the strokes per length. */
  poolLengthM?: number;
  swimStroke?: "free" | "breast" | "back" | "fly" | "mixed";
  strokesPerLength?: number;
}

interface Point {
  lat: number;
  lon: number;
  ele?: number;
  time?: number;
  hr?: number;
  cad?: number;
  power?: number;
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : undefined);

/**
 * Cadence and power from the points: zeros (stopped, coasting) left out of
 * the average cadence, kept in the average power as a power meter does.
 * Watches write the running cadence for one foot: doubled into steps.
 */
function cadenceAndPower(points: Pick<Point, "cad" | "power">[], sport: string | undefined) {
  const cads = points.map((p) => p.cad).filter((c): c is number => c !== undefined && c > 0 && c < 260);
  const powers = points.map((p) => p.power).filter((w): w is number => w !== undefined && w >= 0 && w < 2500);
  const cadence = mean(cads);
  const onFoot = sport === "run" || sport === "hike";
  return {
    avgCadence: cadence !== undefined ? (onFoot && cadence < 120 ? cadence * 2 : cadence) : undefined,
    avgPowerW: powers.some((w) => w > 0) ? mean(powers) : undefined,
    maxPowerW: powers.some((w) => w > 0) ? Math.max(...powers) : undefined,
  };
}

const EARTH_M = 6371000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distance between two GPS points, in metres (haversine). */
export function between(a: Pick<Point, "lat" | "lon">, b: Pick<Point, "lat" | "lon">): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

const tag = (xml: string, name: string) => xml.match(new RegExp(`<(?:\\w+:)?${name}>([^<]*)</(?:\\w+:)?${name}>`))?.[1]?.trim();
const attr = (xml: string, name: string) => xml.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const decode = (text: string) =>
  text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** The sport named by the file: Garmin writes "running" or "hiking", Strava "9", "1" or "11" (a walk). */
function sportOf(type: string | undefined): Sport | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase();
  if (/hik|walk|trek|^11$/.test(t)) return "hike";
  if (/run|trail|^9$/.test(t)) return "run";
  if (/cycl|bik|ride|^1$/.test(t)) return "bike";
  if (/swim|pool/.test(t)) return "swim";
  if (/row/.test(t)) return "row";
  return "other";
}

/** A climb only counts past 3 m, so GPS noise on the flat adds nothing. */
function elevationGain(points: Point[]): number {
  let gain = 0;
  let low: number | undefined;
  for (const { ele } of points) {
    if (ele === undefined) continue;
    if (low === undefined || ele < low) low = ele;
    else if (ele - low >= 3) {
      gain += ele - low;
      low = ele;
    }
  }
  return Math.round(gain);
}

/**
 * Read a GPX track exported from a watch, Strava or Garmin Connect. Returns
 * null when the file holds no track to measure, like a pool swim.
 */
export function parseGpx(xml: string): GpxActivity | null {
  const points: Point[] = [];
  for (const match of xml.matchAll(/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>|<trkpt\b([^>]*)\/>/g)) {
    const head = match[1] ?? match[3] ?? "";
    const body = match[2] ?? "";
    const lat = Number(attr(head, "lat"));
    const lon = Number(attr(head, "lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const ele = tag(body, "ele");
    const time = tag(body, "time");
    const hr = tag(body, "hr") ?? tag(body, "heartrate");
    const cad = tag(body, "cad") ?? tag(body, "cadence");
    const power = tag(body, "power") ?? tag(body, "PowerInWatts");
    points.push({
      lat,
      lon,
      ele: ele !== undefined ? Number(ele) : undefined,
      time: time ? Date.parse(time) : undefined,
      hr: hr !== undefined ? Number(hr) : undefined,
      cad: cad !== undefined ? Number(cad) : undefined,
      power: power !== undefined ? Number(power) : undefined,
    });
  }
  if (points.length < 2) return null;

  let distanceM = 0;
  let moving = 0;
  for (let i = 1; i < points.length; i++) {
    const step = between(points[i - 1], points[i]);
    distanceM += step;
    const [t0, t1] = [points[i - 1].time, points[i].time];
    if (t0 !== undefined && t1 !== undefined && t1 > t0) {
      const seconds = (t1 - t0) / 1000;
      // Moving: under a minute between points and faster than a slow walk.
      if (seconds <= 60 && step / seconds >= 0.3) moving += seconds;
    }
  }
  if (distanceM < 10) return null;

  const times = points.map((p) => p.time).filter((t): t is number => t !== undefined && Number.isFinite(t));
  const rates = points.map((p) => p.hr).filter((h): h is number => h !== undefined && h > 30 && h < 250);
  const trk = xml.match(/<trk\b[^>]*>([\s\S]*?)<trkseg/)?.[1] ?? "";
  const name = tag(trk, "name") ?? tag(xml.match(/<metadata>([\s\S]*?)<\/metadata>/)?.[1] ?? "", "name");

  const sport = sportOf(tag(trk, "type"));
  return {
    ...cadenceAndPower(points, sport),
    name: name ? decode(name) : undefined,
    sport,
    start: times.length ? new Date(Math.min(...times)) : undefined,
    distanceM: Math.round(distanceM),
    durationSec: Math.round(moving || (times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 1000 : 0)),
    elevationGainM: elevationGain(points),
    avgHr: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : undefined,
    maxHr: rates.length ? Math.max(...rates) : undefined,
  };
}

/**
 * Read a TCX file (Garmin, Polar, Suunto, Wahoo, Zwift exports): its laps give
 * the distance, time and heart rate, a pool swim included (no GPS track);
 * its points give the climb, cadence and power. Null when nothing is measured.
 */
export function parseTcx(xml: string): GpxActivity | null {
  const activity = xml.match(/<Activity\b([^>]*)>([\s\S]*?)<\/Activity>/);
  if (!activity) return null;
  const body = activity[2];
  const laps = [...body.matchAll(/<Lap\b([^>]*)>([\s\S]*?)<\/Lap>/g)];
  if (!laps.length) return null;
  let durationSec = 0;
  let distanceM = 0;
  let hrWeighted = 0;
  let hrTime = 0;
  let maxHr: number | undefined;
  for (const [, , lap] of laps) {
    const head = lap.split(/<Track\b/)[0];
    const sec = Number(tag(head, "TotalTimeSeconds")) || 0;
    durationSec += sec;
    distanceM += Number(tag(head, "DistanceMeters")) || 0;
    const avg = Number(head.match(/<AverageHeartRateBpm>[\s\S]*?<Value>([^<]+)<\/Value>/)?.[1]);
    if (avg > 30 && sec > 0) {
      hrWeighted += avg * sec;
      hrTime += sec;
    }
    const max = Number(head.match(/<MaximumHeartRateBpm>[\s\S]*?<Value>([^<]+)<\/Value>/)?.[1]);
    if (max > 30) maxHr = Math.max(maxHr ?? 0, max);
  }
  if (distanceM < 10 && durationSec < 60) return null;
  const points: Point[] = [];
  for (const [, tp] of body.matchAll(/<Trackpoint>([\s\S]*?)<\/Trackpoint>/g)) {
    const ele = tag(tp, "AltitudeMeters");
    const cad = tag(tp, "Cadence") ?? tag(tp, "RunCadence");
    const watts = tag(tp, "Watts");
    const hr = tp.match(/<HeartRateBpm>[\s\S]*?<Value>([^<]+)<\/Value>/)?.[1];
    points.push({ lat: 0, lon: 0, ele: ele !== undefined ? Number(ele) : undefined, hr: hr ? Number(hr) : undefined, cad: cad !== undefined ? Number(cad) : undefined, power: watts !== undefined ? Number(watts) : undefined });
  }
  const sport = sportOf(attr(activity[1], "Sport"));
  const rates = points.map((p) => p.hr).filter((h): h is number => h !== undefined && h > 30 && h < 250);
  const start = tag(body, "Id");
  return {
    ...cadenceAndPower(points, sport),
    name: tag(body, "Notes") ? decode(tag(body, "Notes")!) : undefined,
    sport,
    start: start && !Number.isNaN(Date.parse(start)) ? new Date(start) : undefined,
    distanceM: Math.round(distanceM),
    durationSec: Math.round(durationSec),
    elevationGainM: elevationGain(points),
    avgHr: hrTime ? Math.round(hrWeighted / hrTime) : mean(rates),
    maxHr: maxHr ?? (rates.length ? Math.max(...rates) : undefined),
  };
}

/** A watch file, GPX or TCX, told apart by its content. */
export function parseActivityFile(text: string): GpxActivity | null {
  if (/<TrainingCenterDatabase\b/.test(text)) return parseTcx(text);
  return parseGpx(text);
}
