import type { Sport, Workout } from "@/db";
import { SPORT_DEFS } from "./disciplines";

/**
 * Each endurance session of a sport over a span, with its pace (seconds per
 * km, per 100 m in the water) and its power: what the curves of Progress
 * draw. Sessions too short for their pace to mean something are left out.
 */
export interface TrendPoint {
  date: string;
  /** Seconds per unit (km, or 100 m for a swim); lower is faster. */
  pace: number | null;
  /** Average watts; the normalized power when the file gave it. */
  power: number | null;
}

type W = Pick<Workout, "date" | "kind" | "sport" | "distanceM" | "durationSec" | "avgPowerW" | "normalizedPowerW" | "cancelledAt">;

export const paceUnit = (sport: Sport) => (sport === "swim" ? 100 : 1000);

export function enduranceTrend(workouts: W[], sport: Sport, from: string, to: string): TrendPoint[] {
  const min = SPORT_DEFS[sport]?.minDistanceForPace ?? Infinity;
  return workouts
    .filter((w) => !w.cancelledAt && w.kind === "cardio" && w.sport === sport && w.date >= from && w.date <= to)
    .map((w) => ({
      date: w.date,
      pace: w.distanceM && w.durationSec && w.distanceM >= min ? Math.round(w.durationSec / (w.distanceM / paceUnit(sport))) : null,
      power: w.normalizedPowerW ?? w.avgPowerW ?? null,
    }))
    .filter((p) => p.pace !== null || p.power !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The sports with at least three sessions to draw, most sessions first. */
export function trendSports(workouts: W[], from: string, to: string): Sport[] {
  const sports = (Object.keys(SPORT_DEFS) as Sport[]).filter((s) => SPORT_DEFS[s].distanceUnit);
  return sports
    .map((s) => ({ s, n: enduranceTrend(workouts, s, from, to).length }))
    .filter((x) => x.n >= 3)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.s);
}
