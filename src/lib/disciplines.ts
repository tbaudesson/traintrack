import type { Sport, TrainingGoal } from "@/db";
import type { FavoriteSport } from "./appTheme";
import type { ProgramCategory } from "./programCategories";

/**
 * The disciplines, described once. Everything that differs from one sport to
 * another — its unit of distance, the pace worth showing, its cadence, the
 * fields asked first when logging and those kept under "More details", its
 * shelf among the ready-made programs, its colour on the load chart — is read
 * from here. A new sport is a new entry (and its texts), not a change in every
 * page.
 */

/** What can be logged for an endurance session, beyond its date. */
export type MetricId =
  | "distance"
  | "duration"
  | "climb"
  | "cadence"
  | "avgPower"
  | "maxPower"
  | "ftp"
  | "swimStroke"
  | "pool"
  | "strokesPerLength";

/** The load chart's disciplines: strength, timed sessions, and each endurance sport. */
export type Discipline = "strength" | "timed" | "run" | "swim" | "bike" | "hike" | "vaulting" | "other";

export interface SportDef {
  /** Metres or kilometres; null for a sport timed only (no distance, no pace, no GPS track). */
  distanceUnit: "km" | "m" | null;
  /** Shorter than this (metres) and a pace is noise, not a performance. */
  minDistanceForPace: number;
  /** Steps a minute on foot, turns a minute on a bike; null when it means nothing. */
  cadence: "spm" | "rpm" | null;
  /** Asked first, always visible. */
  essential: readonly MetricId[];
  /** Under "More details", opened when one of them already has a value. */
  advanced: readonly MetricId[];
  /** Its own colour and line on the load chart (otherwise "other"). */
  discipline: Discipline;
  /** Its shelf among the ready-made programs. */
  category: ProgramCategory | null;
  /** The favourite sport it stands for. */
  favorite: FavoriteSport | null;
}

/** The endurance sports, in the order they are offered. */
export const SPORT_DEFS: Readonly<Record<Sport, SportDef>> = {
  run: {
    distanceUnit: "km", minDistanceForPace: 1000, cadence: "spm",
    essential: ["distance", "duration"], advanced: ["climb", "cadence"],
    discipline: "run", category: "running", favorite: "running",
  },
  hike: {
    distanceUnit: "km", minDistanceForPace: 2000, cadence: "spm",
    essential: ["distance", "duration", "climb"], advanced: ["cadence"],
    discipline: "hike", category: "hiking", favorite: "hiking",
  },
  swim: {
    distanceUnit: "m", minDistanceForPace: 100, cadence: null,
    essential: ["distance", "duration", "swimStroke", "pool"], advanced: ["strokesPerLength"],
    discipline: "swim", category: "swimming", favorite: "swimming",
  },
  bike: {
    distanceUnit: "km", minDistanceForPace: 5000, cadence: "rpm",
    essential: ["distance", "duration", "avgPower"], advanced: ["climb", "cadence", "maxPower", "ftp"],
    discipline: "bike", category: "cycling", favorite: "cycling",
  },
  row: {
    distanceUnit: "km", minDistanceForPace: 500, cadence: null,
    essential: ["distance", "duration"], advanced: [],
    discipline: "other", category: null, favorite: null,
  },
  vaulting: {
    distanceUnit: null, minDistanceForPace: Infinity, cadence: null,
    essential: ["duration"], advanced: [],
    discipline: "vaulting", category: "vaulting", favorite: "vaulting",
  },
  other: {
    distanceUnit: "km", minDistanceForPace: Infinity, cadence: null,
    essential: ["distance", "duration"], advanced: ["climb"],
    discipline: "other", category: null, favorite: null,
  },
};

/** What the app puts first for a favourite sport: distances, loads, repetitions, or time on the horse. */
export type ActivityKind = "endurance" | "strength" | "bodyweight" | "vaulting";

export interface FavoriteDef {
  kind: ActivityKind;
  /** Its endurance sport, for its distances; null for the strength sports. */
  sport: Sport | null;
  /** The goal it usually comes with (the athlete can change it). */
  goal: TrainingGoal;
  category: ProgramCategory;
}

export const FAVORITE_DEFS: Readonly<Record<FavoriteSport, FavoriteDef>> = {
  bodybuilding: { kind: "strength", sport: null, goal: "hypertrophy", category: "bodybuilding" },
  strength: { kind: "strength", sport: null, goal: "strength", category: "strength" },
  fitness: { kind: "strength", sport: null, goal: "fat_loss", category: "fitness" },
  running: { kind: "endurance", sport: "run", goal: "endurance", category: "running" },
  hiking: { kind: "endurance", sport: "hike", goal: "endurance", category: "hiking" },
  swimming: { kind: "endurance", sport: "swim", goal: "endurance", category: "swimming" },
  cycling: { kind: "endurance", sport: "bike", goal: "endurance", category: "cycling" },
  vaulting: { kind: "vaulting", sport: "vaulting", goal: "general_fitness", category: "vaulting" },
  callisthenics: { kind: "bodyweight", sport: null, goal: "general_fitness", category: "callisthenics" },
};

export const sportDef = (sport: Sport | null | undefined): SportDef | null => (sport ? SPORT_DEFS[sport] ?? null : null);

/** Every metric a sport logs, essential first. */
export const metricsOf = (sport: Sport | null | undefined): readonly MetricId[] => {
  const def = sportDef(sport);
  return def ? [...def.essential, ...def.advanced] : [];
};

/** Whether a sport asks for this metric first, later, or not at all. */
export function metricPlace(sport: Sport | null | undefined, metric: MetricId): "essential" | "advanced" | null {
  const def = sportDef(sport);
  if (!def) return null;
  if (def.essential.includes(metric)) return "essential";
  if (def.advanced.includes(metric)) return "advanced";
  return null;
}
