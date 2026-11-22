import type { Sport } from "@/db";
import type { FavoriteSport } from "./appTheme";

import { FAVORITE_DEFS, SPORT_DEFS, type ActivityKind } from "./disciplines";

export type { ActivityKind };

/** What the app puts first for a favourite sport (from the registry). */
export function kindOf(sport: FavoriteSport | null | undefined): ActivityKind | null {
  return sport ? FAVORITE_DEFS[sport]?.kind ?? null : null;
}

/** The endurance sport of a favourite sport, for its distances. */
export const cardioSportOf = (sport: FavoriteSport | null | undefined): Sport | null => {
  const def = sport ? FAVORITE_DEFS[sport] : undefined;
  return def?.kind === "endurance" ? def.sport : null;
};

type W = { id?: number; date: string; kind?: string; sport?: Sport | null; distanceM?: number | null; durationSec?: number | null; durationMin?: number };
type S = { workoutId: number; completed: boolean; isWarmup?: boolean; weightKg?: number | null; reps?: number | null };

const FAVORITE_OF = Object.fromEntries(
  Object.entries(SPORT_DEFS).filter(([, d]) => d.favorite).map(([s, d]) => [s, d.favorite])
) as Partial<Record<Sport, FavoriteSport>>;

/**
 * The sport one actually practises, from the last four weeks: the one of at
 * least six sessions out of ten. Weighted sessions read as weight training,
 * sessions without any load as callisthenics. Null when nothing stands out.
 */
export function detectSport(input: { today: string; workouts: W[]; sets: S[] }): FavoriteSport | null {
  const since = new Date(Date.parse(`${input.today}T00:00:00Z`) - 28 * 86_400_000).toISOString().slice(0, 10);
  const recent = input.workouts.filter((w) => w.date > since && w.date <= input.today);
  if (recent.length < 6) return null;
  const counts = new Map<FavoriteSport, number>();
  const add = (s: FavoriteSport) => counts.set(s, (counts.get(s) ?? 0) + 1);
  for (const w of recent) {
    if (w.kind === "cardio") {
      const s = w.sport ? FAVORITE_OF[w.sport] : undefined;
      if (s) add(s);
      continue;
    }
    const done = input.sets.filter((s) => s.workoutId === w.id && s.completed && !s.isWarmup);
    if (!done.length) continue;
    add(done.some((s) => (s.weightKg ?? 0) > 0) ? "bodybuilding" : "callisthenics");
  }
  // Out of the sessions that say something (a run, sets done), not those left empty.
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return best && total >= 6 && best[1] / total >= 0.6 ? best[0] : null;
}

export interface WeekOverview {
  /** What the first figure measures. */
  metric: "distance" | "volume" | "reps" | "time";
  /** Kilometres (metres for swimming), kilos, repetitions or minutes. */
  value: number;
  unit: "km" | "m" | "kg" | "reps" | "min";
  /** Change against last week up to the same day, in %; null without anything to compare. */
  change: number | null;
  sessions: number;
}

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * The week so far in the figure that matters for the sport: kilometres for an
 * endurance sport, kilos lifted for weight training, repetitions for
 * callisthenics, minutes for vaulting; and how it compares with last week up
 * to the same day, a week in progress against a whole one saying nothing.
 */
export function weekOverview(input: { kind: ActivityKind; cardioSport?: Sport | null; monday: string; today: string; workouts: W[]; sets: S[] }): WeekOverview {
  const { kind, monday, today } = input;
  const elapsed = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${monday}T00:00:00Z`)) / 86_400_000);
  const lastMonday = addDays(monday, -7);
  const lastSameDay = addDays(lastMonday, elapsed);
  const within = (from: string, to: string) => input.workouts.filter((w) => w.date >= from && w.date <= to);
  const measure = (ws: W[]): number => {
    if (kind === "endurance") {
      const sport = input.cardioSport ?? "run";
      return ws.filter((w) => w.kind === "cardio" && w.sport === sport).reduce((sum, w) => sum + (w.distanceM ?? 0), 0);
    }
    if (kind === "vaulting") return ws.reduce((sum, w) => sum + (w.durationSec ? w.durationSec / 60 : (w.durationMin ?? 0)), 0);
    const ids = new Set(ws.map((w) => w.id));
    const done = input.sets.filter((s) => ids.has(s.workoutId) && s.completed && !s.isWarmup && (s.reps ?? 0) > 0);
    return kind === "strength"
      ? done.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0)
      : done.filter((s) => !(s.weightKg && s.weightKg > 0)).reduce((sum, s) => sum + (s.reps ?? 0), 0);
  };
  const now = measure(within(monday, today));
  const before = measure(within(lastMonday, lastSameDay));
  const swim = kind === "endurance" && input.cardioSport === "swim";
  const metric = kind === "endurance" ? "distance" : kind === "strength" ? "volume" : kind === "bodyweight" ? "reps" : "time";
  const unit = kind === "endurance" ? (swim ? "m" : "km") : kind === "strength" ? "kg" : kind === "bodyweight" ? "reps" : "min";
  const value = kind === "endurance" && !swim ? Math.round(now / 100) / 10 : Math.round(now);
  return {
    metric,
    value,
    unit,
    change: before > 0 ? Math.round(((now - before) / before) * 100) : null,
    sessions: within(monday, today).length,
  };
}
