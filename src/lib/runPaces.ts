/**
 * Running paces from the VMA (maximal aerobic speed, km/h): each kind of
 * effort is a share of it. The VMA comes from a recent race (a race is run
 * at a known share of the VMA, lower the longer it is), from the half-Cooper
 * test (the metres run in six minutes, divided by 100), or is typed in.
 */

export type PaceZone = "recovery" | "easy" | "marathon" | "half" | "threshold" | "10k" | "5k" | "vma" | "short";

/** Share of the VMA of each zone: [slowest, fastest]. */
export const ZONE_SHARE: Record<PaceZone, [number, number]> = {
  recovery: [0.6, 0.65],
  easy: [0.65, 0.75],
  marathon: [0.78, 0.82],
  half: [0.83, 0.86],
  threshold: [0.86, 0.89],
  "10k": [0.89, 0.92],
  "5k": [0.94, 0.97],
  vma: [0.98, 1.02],
  short: [1.03, 1.08],
};

export const PACE_ZONES = Object.keys(ZONE_SHARE) as PaceZone[];

/** The heart-rate zones of the plans (Zone 1 … Zone 5) as shares of the VMA. */
export const HR_ZONE_SHARE: Record<number, [number, number]> = {
  1: [0.6, 0.65],
  2: [0.65, 0.75],
  3: [0.75, 0.85],
  4: [0.85, 0.92],
  5: [0.92, 1.02],
};

export interface RunPaces {
  /** km/h */
  vma: number;
  source: "race" | "test" | "manual";
  /** YYYY-MM-DD */
  date: string;
  /** The race the VMA came from. */
  distanceM?: number;
  timeSec?: number;
}

/** A VMA is believable between 8 and 26 km/h. */
const believable = (vma: number) => (Number.isFinite(vma) && vma >= 8 && vma <= 26 ? Math.round(vma * 10) / 10 : null);

/**
 * The share of the VMA a race is run at, from its length: about all of it
 * over 2 km, 95 % over 5 km, 90 % over 10 km, 85 % over the half, 80 % over
 * the marathon; in between, along the logarithm of the distance.
 */
export function raceShare(distanceM: number): number {
  const points: [number, number][] = [
    [2000, 1],
    [5000, 0.95],
    [10000, 0.9],
    [21097, 0.85],
    [42195, 0.8],
  ];
  if (distanceM <= points[0][0]) return 1;
  if (distanceM >= points.at(-1)![0]) return 0.8;
  for (let i = 1; i < points.length; i++) {
    const [d1, s1] = points[i - 1];
    const [d2, s2] = points[i];
    if (distanceM <= d2) return s1 + ((s2 - s1) * Math.log(distanceM / d1)) / Math.log(d2 / d1);
  }
  return 0.8;
}

/** The VMA a race result points to, or null when it does not make sense (under 1.5 km, or too slow or fast). */
export function vmaFromRace(distanceM: number, timeSec: number): number | null {
  if (!(distanceM >= 1500) || !(timeSec > 0)) return null;
  const kmh = distanceM / 1000 / (timeSec / 3600);
  return believable(kmh / raceShare(distanceM));
}

/** The half-Cooper test: metres run in six minutes, divided by 100. */
export const vmaFromHalfCooper = (meters: number) => believable(meters / 100);

/** Seconds per kilometre at a share of the VMA. */
export const paceAt = (vma: number, share: number) => Math.round(3600 / (vma * share));

/** A zone's paces, seconds per km: [slowest, fastest]. */
export const zonePaces = (vma: number, zone: PaceZone): [number, number] => {
  const [lo, hi] = ZONE_SHARE[zone];
  return [paceAt(vma, lo), paceAt(vma, hi)];
};

/** "4:05" for 245 seconds a kilometre. */
export const formatPace = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/** Seconds a distance takes at the middle of a zone. */
export const secondsFor = (vma: number, zone: PaceZone, meters: number) => {
  const [lo, hi] = ZONE_SHARE[zone];
  return Math.round(((meters / 1000) * 3600) / (vma * ((lo + hi) / 2)));
};

/** Metres covered in some seconds at the middle of a zone. */
export const metersIn = (vma: number, zone: PaceZone, sec: number) => {
  const [lo, hi] = ZONE_SHARE[zone];
  return Math.round(((vma * ((lo + hi) / 2)) / 3.6) * sec);
};

/** The zone of a plan's intensity ("Zone 4"), or null. */
export function hrZoneOf(intensity: string | undefined): number | null {
  const n = Number(intensity?.match(/(\d)\s*$/)?.[1]);
  return n >= 1 && n <= 5 ? n : null;
}

/** "1:45:30", "45:30" or "45" (minutes) as seconds; null when unreadable. */
export function parseTime(text: string): number | null {
  const parts = text.trim().split(/[:h'’]\s*/).filter(Boolean).map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const [a, b, c] = parts;
  // "1h45": hours and minutes.
  const hours = /h/i.test(text) && parts.length === 2;
  const sec = parts.length === 3 ? a * 3600 + b * 60 + c : hours ? a * 3600 + b * 60 : parts.length === 2 ? a * 60 + b : a * 60;
  return sec > 0 ? sec : null;
}

