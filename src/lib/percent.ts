import type { Equipment } from "@/db";
import type { GoalPoint } from "./goals";

/** "75" or "70/75/80" (one per set) as numbers; undefined when empty or off. */
export function parsePercents(text: string): number[] | undefined {
  const values = text
    .replace(/%/g, " ")
    .split(/[\/;\s]+|,\s+/)
    .filter(Boolean)
    .map((v) => Number(v.replace(",", ".")));
  if (!values.length || values.some((v) => !Number.isFinite(v) || v < 20 || v > 110)) return undefined;
  return values;
}

export const formatPercents = (percents: number[] | undefined) => (percents?.length ? percents.join("/") : "");

/**
 * The 1RM a percentage applies to: the best estimate of the last three
 * months, so an old peak does not set loads the athlete can no longer lift;
 * the best ever when nothing is that recent.
 */
export function referenceMax(history: GoalPoint[], today: string): number | null {
  if (!history.length) return null;
  const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - 90 * 86400000).toISOString().slice(0, 10);
  const recent = history.filter((p) => p.date >= cutoff);
  return Math.max(...(recent.length ? recent : history).map((p) => p.oneRepMax));
}

/** The weight of each set: its percentage of the 1RM, to the nearest plate step. */
export function percentWeights(percents: number[], sets: number, maxKg: number, equipment?: Equipment): number[] {
  const step = equipment === "dumbbell" || equipment === "kettlebell" ? 2 : 2.5;
  return Array.from({ length: sets }, (_, i) => {
    const percent = percents[Math.min(i, percents.length - 1)];
    return Math.round((maxKg * percent) / 100 / step) * step;
  });
}
