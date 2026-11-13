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
}

interface Point {
  lat: number;
  lon: number;
  ele?: number;
  time?: number;
  hr?: number;
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

/** The sport named by the file: Garmin writes "running", Strava "9" or "1". */
function sportOf(type: string | undefined): Sport | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase();
  if (/run|trail|walk|hik|^9$/.test(t)) return "run";
  if (/cycl|bik|ride|^1$/.test(t)) return "bike";
  if (/swim/.test(t)) return "swim";
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
    points.push({
      lat,
      lon,
      ele: ele !== undefined ? Number(ele) : undefined,
      time: time ? Date.parse(time) : undefined,
      hr: hr !== undefined ? Number(hr) : undefined,
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

  return {
    name: name ? decode(name) : undefined,
    sport: sportOf(tag(trk, "type")),
    start: times.length ? new Date(Math.min(...times)) : undefined,
    distanceM: Math.round(distanceM),
    durationSec: Math.round(moving || (times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 1000 : 0)),
    elevationGainM: elevationGain(points),
    avgHr: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : undefined,
    maxHr: rates.length ? Math.max(...rates) : undefined,
  };
}
