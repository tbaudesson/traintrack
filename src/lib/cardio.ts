import type { CardioTarget, Program, ProgramDay, Sport, Workout } from "@/db";
import { SPORT_DEFS } from "./disciplines";

/** The endurance sports, in the registry's order. */
export const SPORTS = Object.keys(SPORT_DEFS) as Sport[];

/** Sports measured in distance; vaulting is a time on the horse or the barrel only. */
export const hasDistance = (sport: Sport | null | undefined) => !sport || SPORT_DEFS[sport]?.distanceUnit !== null;
export const DISTANCE_SPORTS: Sport[] = SPORTS.filter(hasDistance);

/** Shorter than this and a pace is noise, not a performance. */
const MIN_DISTANCE_FOR_PACE = Object.fromEntries(SPORTS.map((s) => [s, SPORT_DEFS[s].minDistanceForPace])) as Record<Sport, number>;

type CardioFields = Pick<Workout, "id" | "kind" | "sport" | "distanceM" | "durationSec"> & Partial<Pick<Workout, "elevationGainM" | "date">>;

export function isCardio(w: Pick<Workout, "kind"> | undefined): boolean {
  return w?.kind === "cardio";
}

export function isCardioDone(w: CardioFields): boolean {
  return isCardio(w) && ((w.distanceM ?? 0) > 0 || (w.durationSec ?? 0) > 0);
}

export function formatDistance(meters: number, sport?: Sport | null): string {
  if (sport === "swim" || meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")}`;
}

function minutesSeconds(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

/** In each sport's own unit; null when it cannot be worked out. */
export function formatPace(sport: Sport | null | undefined, meters?: number, seconds?: number): string | null {
  if (!sport || !meters || !seconds) return null;
  if (sport === "run") return `${minutesSeconds(seconds / (meters / 1000))} /km`;
  // On foot over hills a pace says little: the speed, as walkers read it.
  if (sport === "hike") return `${((meters / 1000) / (seconds / 3600)).toFixed(1)} km/h`;
  if (sport === "swim") return `${minutesSeconds(seconds / (meters / 100))} /100 m`;
  if (sport === "row") return `${minutesSeconds(seconds / (meters / 500))} /500 m`;
  if (sport === "bike") return `${((meters / 1000) / (seconds / 3600)).toFixed(1)} km/h`;
  return null;
}

/** "10 km · Zone 2" */
export function describeTarget(target: CardioTarget): string {
  const parts: string[] = [];
  if (target.distanceKm) parts.push(formatDistance(target.distanceKm * 1000, target.sport));
  if (target.durationMin) parts.push(formatDuration(target.durationMin * 60));
  if (target.intensity) parts.push(target.intensity);
  return parts.join(" · ");
}

export interface CardioBests {
  longestM: number;
  /** Metres per second. */
  bestSpeed: number;
  /** The longest outing, in seconds. */
  longestSec: number;
  /** The most metres climbed in one outing. */
  highestClimbM: number;
}

export function cardioBests(workouts: CardioFields[], sport: Sport): CardioBests {
  let longestM = 0;
  let bestSpeed = 0;
  let longestSec = 0;
  let highestClimbM = 0;
  for (const w of workouts) {
    if (!isCardioDone(w) || w.sport !== sport) continue;
    const meters = w.distanceM ?? 0;
    longestM = Math.max(longestM, meters);
    longestSec = Math.max(longestSec, w.durationSec ?? 0);
    highestClimbM = Math.max(highestClimbM, w.elevationGainM ?? 0);
    if (w.durationSec && meters >= MIN_DISTANCE_FOR_PACE[sport]) bestSpeed = Math.max(bestSpeed, meters / w.durationSec);
  }
  return { longestM, bestSpeed, longestSec, highestClimbM };
}

/**
 * How the speed moves: the average speed of the last four weeks against the
 * four before, as a share (+0.05 = 5 % faster). Null without two measured
 * outings in each window.
 */
export function speedTrend(workouts: CardioFields[], sport: Sport, today: string): number | null {
  const day = (offset: number) => new Date(Date.parse(`${today}T00:00:00Z`) - offset * 86_400_000).toISOString().slice(0, 10);
  const speeds = (from: string, to: string) =>
    workouts
      .filter((w) => w.sport === sport && isCardioDone(w) && !!w.date && w.date > from && w.date <= to && !!w.durationSec && (w.distanceM ?? 0) >= MIN_DISTANCE_FOR_PACE[sport])
      .map((w) => (w.distanceM ?? 0) / w.durationSec!);
  const recent = speeds(day(28), today);
  const before = speeds(day(56), day(28));
  if (recent.length < 2 || before.length < 2) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return mean(recent) / mean(before) - 1;
}

export type CardioRecord = "distance" | "pace" | "climb";

/** Which records this session beat. Nothing counts without an earlier session. */
export function newCardioRecords(session: CardioFields, others: CardioFields[]): CardioRecord[] {
  if (!session.sport || !isCardioDone(session)) return [];
  const earlier = others.filter((w) => w.id !== session.id && w.sport === session.sport && isCardioDone(w));
  if (earlier.length === 0) return [];
  const before = cardioBests(earlier, session.sport);
  const now = cardioBests([session], session.sport);
  const records: CardioRecord[] = [];
  if (now.longestM > before.longestM) records.push("distance");
  if (now.bestSpeed > before.bestSpeed && before.bestSpeed > 0) records.push("pace");
  // Metres climbed: a record once some were noted before.
  if (now.highestClimbM > before.highestClimbM && before.highestClimbM > 0) records.push("climb");
  return records;
}

/** The session count to aim for this week: a plan's week, or the whole cycle. */
export function weeklyGoal(program: Program, day: ProgramDay | undefined): number {
  if (day?.week === undefined) return program.structure.length;
  return program.structure.filter((d) => d.week === day.week).length;
}

export type SportTotals = { sport: Sport; sessions: number; distanceM: number; durationSec: number };

/**
 * The outings, sport by sport: distances of different sports are never added
 * together (a kilometre swum is not a kilometre run). The sport done most
 * often first.
 */
export function bySport(workouts: { kind?: string; sport?: Sport | null; distanceM?: number | null; durationSec?: number | null }[]): SportTotals[] {
  const out = new Map<Sport, SportTotals>();
  for (const w of workouts) {
    if (w.kind !== "cardio") continue;
    const sport = w.sport ?? "other";
    const t = out.get(sport) ?? { sport, sessions: 0, distanceM: 0, durationSec: 0 };
    t.sessions++;
    t.distanceM += w.distanceM ?? 0;
    t.durationSec += w.durationSec ?? 0;
    out.set(sport, t);
  }
  return [...out.values()].sort((a, b) => b.sessions - a.sessions || b.durationSec - a.durationSec);
}
