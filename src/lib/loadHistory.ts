import type { Sport } from "@/db";
import { sessionLoad } from "./trainingLoad";
import { doneSessions } from "./doneSessions";

/**
 * The training load week by week and discipline by discipline. Every
 * discipline is measured in the same unit, minutes x effort felt (session
 * RPE, Foster), never in its own (kilos, kilometres): that is what lets a
 * swim and a squat session sit in one bar. The effort is the session RPE when
 * given, else the sets' RPE, else a usual value by kind of session, so a week
 * without RPE is an estimate. Pure.
 */

export type Discipline = "strength" | "timed" | "run" | "swim" | "bike" | "hike" | "vaulting" | "other";
/** Their fixed order: the colours follow the discipline, never its rank. */
export const DISCIPLINES: Discipline[] = ["strength", "timed", "run", "swim", "bike", "hike", "vaulting", "other"];

type W = { id?: number; date: string; kind?: "strength" | "cardio" | "interval" | "mobility"; sport?: Sport | null; durationMin?: number; durationSec?: number | null; distanceM?: number | null; sessionRpe?: number | null; cancelledAt?: string | null };
type S = { workoutId: number; completed: boolean; isWarmup?: boolean; rpe?: number };

export function disciplineOf(w: Pick<W, "kind" | "sport">): Discipline {
  if (w.kind === "interval") return "timed";
  if (w.kind !== "cardio") return "strength";
  const s = w.sport;
  return s === "run" || s === "swim" || s === "bike" || s === "hike" || s === "vaulting" ? s : "other";
}

const mondayOf = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export type WeekLoad = { monday: string; total: number; by: Record<Discipline, number> };

/** The last `weeks` calendar weeks (Monday to Sunday), oldest first, this week included. */
export function weeklyLoads(input: { today: string; workouts: W[]; sets: S[]; weeks: number }): WeekLoad[] {
  const first = addDays(mondayOf(input.today), -7 * (input.weeks - 1));
  const empty = () => Object.fromEntries(DISCIPLINES.map((d) => [d, 0])) as Record<Discipline, number>;
  const out: WeekLoad[] = Array.from({ length: input.weeks }, (_, i) => ({ monday: addDays(first, 7 * i), total: 0, by: empty() }));
  const setsOf = new Map<number, S[]>();
  for (const s of input.sets) (setsOf.get(s.workoutId) ?? setsOf.set(s.workoutId, []).get(s.workoutId)!).push(s);
  for (const w of doneSessions(input.workouts, input.sets)) {
    if (w.date < first || w.date > input.today) continue;
    const week = out[Math.floor((Date.parse(`${w.date}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / (7 * 86400000))];
    if (!week) continue;
    const load = sessionLoad(w, setsOf.get(w.id ?? -1) ?? []);
    week.by[disciplineOf(w)] += load;
    week.total += load;
  }
  return out;
}

/** Each discipline's share of the load over the given weeks, the largest first; those with none left out. */
export function loadSplit(weeks: WeekLoad[]): { discipline: Discipline; load: number; share: number }[] {
  const total = weeks.reduce((sum, w) => sum + w.total, 0);
  if (!total) return [];
  return DISCIPLINES.map((d) => ({ discipline: d, load: weeks.reduce((sum, w) => sum + w.by[d], 0) }))
    .filter((x) => x.load > 0)
    .map((x) => ({ ...x, share: Math.round((x.load / total) * 100) }))
    .sort((a, b) => b.load - a.load);
}
