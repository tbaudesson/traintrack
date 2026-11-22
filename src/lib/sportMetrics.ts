import type { Sport } from "@/db";
import { sportDef } from "./disciplines";

/**
 * Figures proper to a sport, worked out from what was logged or imported.
 * Each says what it needs and gives nothing (null) without it: no guess is
 * shown as a measure. Pure.
 */

export type SwimStroke = "free" | "breast" | "back" | "fly" | "mixed";
export const SWIM_STROKES: SwimStroke[] = ["free", "breast", "back", "fly", "mixed"];
/** Pool lengths offered; open water has none. */
export const POOL_LENGTHS = [25, 50] as const;

/**
 * SWOLF: seconds per length plus strokes per length (one arm's stroke counted
 * each time it enters the water, as watches do). Lower is better, but it only
 * compares sessions in the same pool and stroke. Needs a pool, a distance, a
 * time and the strokes per length.
 */
export function swolf(w: { distanceM?: number | null; durationSec?: number | null; poolLengthM?: number | null; strokesPerLength?: number | null }): number | null {
  const { distanceM, durationSec, poolLengthM, strokesPerLength } = w;
  if (!distanceM || !durationSec || !poolLengthM || !strokesPerLength) return null;
  const lengths = distanceM / poolLengthM;
  if (lengths < 1) return null;
  return Math.round(durationSec / lengths + strokesPerLength);
}

/** Lengths swum, when the pool is known. */
export const lengthsOf = (distanceM?: number | null, poolLengthM?: number | null) =>
  distanceM && poolLengthM ? Math.round(distanceM / poolLengthM) : null;

/**
 * Power zones as shares of FTP (Coggan): 1 active recovery < 55 %, 2
 * endurance < 75 %, 3 tempo < 90 %, 4 threshold < 105 %, 5 VO2max < 120 %,
 * 6 anaerobic < 150 %, 7 neuromuscular beyond.
 */
const ZONE_TOPS = [0.55, 0.75, 0.9, 1.05, 1.2, 1.5];
export function powerZone(watts: number | null | undefined, ftp: number | null | undefined): number | null {
  if (!watts || !ftp) return null;
  const share = watts / ftp;
  const i = ZONE_TOPS.findIndex((top) => share < top);
  return i === -1 ? 7 : i + 1;
}

/** The watts bounds of each zone for an FTP, for the profile. */
export function powerZones(ftp: number): { zone: number; from: number; to: number | null }[] {
  return [0, ...ZONE_TOPS].map((low, i) => ({ zone: i + 1, from: Math.round(low * ftp), to: ZONE_TOPS[i] ? Math.round(ZONE_TOPS[i] * ftp) - 1 : null }));
}

/**
 * Intensity factor and training stress score, estimated from the AVERAGE
 * power (the true TSS uses the normalised power, higher on an uneven ride):
 * an estimate, said so where it is shown. TSS = hours x IF² x 100.
 */
export function powerLoad(durationSec: number | null | undefined, avgPowerW: number | null | undefined, ftp: number | null | undefined): { intensity: number; tss: number } | null {
  if (!durationSec || !avgPowerW || !ftp) return null;
  const intensity = avgPowerW / ftp;
  return { intensity: Math.round(intensity * 100) / 100, tss: Math.round((durationSec / 3600) * intensity * intensity * 100) };
}

/** Cadence is counted in steps a minute on foot, turns a minute on a bike. */
export const cadenceUnit = (sport: string | null | undefined): "spm" | "rpm" | null =>
  sportDef(sport as Sport | null | undefined)?.cadence ?? null;
