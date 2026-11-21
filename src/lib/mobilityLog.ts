import type { MobilityLog, Workout } from "@/db";

/**
 * The follow-up of warm-ups and stretches, from the sessions kept: how many
 * and how long lately, the suppleness felt over time (1 stiff to 5 very
 * supple: a feeling, not a measure) and whether it improves, and the moves
 * done most. Pure.
 */

type W = Pick<Workout, "date" | "kind" | "durationSec" | "cancelledAt"> & { mobility?: MobilityLog | null };

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const average = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

export type MobilityStats = {
  /** Last 28 days, today included. */
  sessions: number;
  minutes: number;
  stretches: number;
  warmups: number;
  /** Suppleness felt, oldest first, the last ones given. */
  ratings: { date: string; rating: number }[];
  /** Average felt over the last 28 days and the 28 before; null without two ratings in each. */
  now: number | null;
  before: number | null;
  /** The moves done most over the last 28 days, by key. */
  topMoves: { key: string; count: number }[];
};

export function mobilityStats(workouts: W[], today: string, keep = 12): MobilityStats {
  const all = workouts.filter((w) => w.kind === "mobility" && !w.cancelledAt && w.mobility).sort((a, b) => a.date.localeCompare(b.date));
  const from = addDays(today, -27);
  const beforeFrom = addDays(today, -55);
  const recent = all.filter((w) => w.date >= from && w.date <= today);
  const earlier = all.filter((w) => w.date >= beforeFrom && w.date < from);
  const rated = (list: W[]) => list.map((w) => w.mobility!.rating).filter((r): r is number => typeof r === "number" && r >= 1 && r <= 5);
  const counts = new Map<string, number>();
  for (const w of recent) for (const k of new Set(w.mobility!.moves)) counts.set(k, (counts.get(k) ?? 0) + 1);
  const nowRatings = rated(recent);
  const beforeRatings = rated(earlier);
  return {
    sessions: recent.length,
    minutes: Math.round(recent.reduce((sum, w) => sum + (w.durationSec ?? 0), 0) / 60),
    stretches: recent.filter((w) => w.mobility!.mode === "stretch").length,
    warmups: recent.filter((w) => w.mobility!.mode === "warmup").length,
    ratings: all
      .filter((w) => typeof w.mobility!.rating === "number")
      .map((w) => ({ date: w.date, rating: w.mobility!.rating! }))
      .slice(-keep),
    now: nowRatings.length >= 2 && beforeRatings.length >= 2 ? average(nowRatings) : null,
    before: nowRatings.length >= 2 && beforeRatings.length >= 2 ? average(beforeRatings) : null,
    topMoves: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([key, count]) => ({ key, count })),
  };
}
