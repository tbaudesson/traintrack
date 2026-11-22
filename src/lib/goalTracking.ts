import type { Goal, Sport } from "@/db";
import { goalProgress, oneRepMaxHistory } from "./goals";
import { doneSessions } from "./doneSessions";

/**
 * Where a goal of any kind stands, from the sessions and the weigh-ins: the
 * value now, the share of the way from where it started, the day it was
 * reached, and whether it is on time. Pure: the same data gives the same
 * answer, the AI and the screens read the very same figures.
 */

type W = { id?: number; date: string; kind?: "strength" | "cardio" | "interval" | "mobility"; sport?: Sport | null; distanceM?: number | null; durationSec?: number | null; durationMin?: number; cancelledAt?: string | null };
type S = { workoutId: number; exerciseId: number; completed: boolean; isWarmup?: boolean; weightKg?: number | null; reps?: number | null };
type E = { id?: number; uuid?: string; name: string };
type M = { date: string; weightKg?: number | null };

export interface GoalData {
  today: string;
  workouts: W[];
  sets: S[];
  exercises: E[];
  bodyMetrics: M[];
}

export interface GoalStatus {
  /** The value now, in the goal's unit; null with nothing to measure yet. */
  current: number | null;
  /** 0–1 from where it started to the target. */
  share: number;
  /** The first day the target was met, if it was. */
  achievedOn?: string;
  /** When the trend reaches it (strength only), null when it does not tell. */
  projectedOn?: string | null;
  /** Ahead of its deadline at the current pace; undefined without one or without a trend. */
  onTrack?: boolean;
  /** Lower is better (a time). */
  lowerIsBetter: boolean;
}

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const DAY_MS = 86_400_000;
const dayOf = (iso: string) => iso.slice(0, 10);
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** The share of the way from start to target, whichever the direction. */
function shareOf(start: number | null | undefined, current: number | null, target: number, lowerIsBetter: boolean): number {
  if (current === null) return 0;
  if (lowerIsBetter ? current <= target : current >= target) return 1;
  if (start === null || start === undefined || start === target) return lowerIsBetter ? 0 : clamp(current / target);
  return clamp((current - start) / (target - start));
}

/** The best time a session of this sport says over the goal's distance (its pace held over that distance). */
export function bestTimeOver(workouts: W[], sport: string, distanceM: number, until?: string): { seconds: number; date: string } | null {
  let best: { seconds: number; date: string } | null = null;
  for (const w of workouts) {
    if (w.cancelledAt || w.kind !== "cardio" || w.sport !== sport || !w.distanceM || !w.durationSec) continue;
    if (w.distanceM < distanceM || (until && w.date > until)) continue;
    const seconds = Math.round((w.durationSec * distanceM) / w.distanceM);
    if (!best || seconds < best.seconds || (seconds === best.seconds && w.date < best.date)) best = { seconds, date: w.date };
  }
  return best;
}

/** Whether a session counts for a frequency goal's scope. */
function inScope(w: W, scope: string | null | undefined): boolean {
  if (!scope || scope === "all") return w.kind !== "mobility";
  if (scope === "mobility") return w.kind === "mobility";
  if (scope === "strength") return w.kind !== "cardio" && w.kind !== "mobility";
  return w.kind === "cardio" && w.sport === scope;
}

export function goalStatus(goal: Goal, data: GoalData): GoalStatus {
  const since = dayOf(goal.createdAt);
  switch (goal.type) {
    case "strength": {
      const exercise = data.exercises.find((e) => (goal.exerciseUuid && e.uuid === goal.exerciseUuid) || e.name === goal.exerciseName);
      const history = exercise?.id !== undefined ? oneRepMaxHistory(exercise.id, data.workouts, data.sets) : [];
      const p = goalProgress(
        { id: goal.uuid, exerciseUuid: goal.exerciseUuid ?? undefined, exerciseName: goal.exerciseName ?? "", targetKg: goal.targetValue, deadline: goal.deadline ?? undefined, startKg: goal.startValue ?? 0, createdAt: goal.createdAt },
        history,
        data.today
      );
      return { current: history.length ? p.currentKg : null, share: p.share, achievedOn: p.achievedOn, projectedOn: p.projectedOn, onTrack: p.onTrack, lowerIsBetter: false };
    }
    case "time": {
      if (!goal.scope || !goal.distanceM) return { current: null, share: 0, lowerIsBetter: true };
      const best = bestTimeOver(data.workouts, goal.scope, goal.distanceM);
      const current = best?.seconds ?? null;
      // The first session at or under the target.
      const hit = data.workouts
        .filter((w) => !w.cancelledAt && w.kind === "cardio" && w.sport === goal.scope && (w.distanceM ?? 0) >= goal.distanceM! && w.durationSec)
        .filter((w) => Math.round((w.durationSec! * goal.distanceM!) / w.distanceM!) <= goal.targetValue)
        .map((w) => w.date)
        .sort()[0];
      return { current, share: shareOf(goal.startValue, current, goal.targetValue, true), achievedOn: hit, lowerIsBetter: true };
    }
    case "distance": {
      // What was covered in this sport since the goal was set (up to its deadline).
      const sessions = data.workouts
        .filter((w) => !w.cancelledAt && w.kind === "cardio" && w.sport === goal.scope && w.date >= since && (!goal.deadline || w.date <= goal.deadline))
        .sort((a, b) => a.date.localeCompare(b.date));
      let total = 0;
      let achievedOn: string | undefined;
      for (const w of sessions) {
        total += w.distanceM ?? 0;
        if (!achievedOn && total >= goal.targetValue) achievedOn = w.date;
      }
      return { current: total, share: clamp(total / goal.targetValue), achievedOn, onTrack: paceOnTrack(total, goal, since, data.today), lowerIsBetter: false };
    }
    case "frequency": {
      // Sessions a week, over the last four weeks (or since the goal, if newer).
      const from = [addDays(data.today, -27), since].sort().at(-1)!;
      const days = Math.max(7, (Date.parse(`${data.today}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS + 1);
      const done = goal.scope === "mobility" ? data.workouts.filter((w) => !w.cancelledAt) : doneSessions(data.workouts, data.sets);
      const count = done.filter((w) => w.date >= from && w.date <= data.today && inScope(w, goal.scope)).length;
      const perWeek = Math.round((count / days) * 7 * 10) / 10;
      return { current: perWeek, share: clamp(perWeek / goal.targetValue), onTrack: perWeek >= goal.targetValue, lowerIsBetter: false };
    }
    case "weight": {
      const weighed = data.bodyMetrics.filter((m) => m.weightKg).sort((a, b) => a.date.localeCompare(b.date));
      const last = weighed.at(-1);
      const current = last?.weightKg ?? null;
      const start = goal.startValue ?? null;
      const lowerIsBetter = start !== null ? goal.targetValue < start : current !== null && goal.targetValue < current;
      const hit = weighed.find((m) => m.date >= since && (lowerIsBetter ? m.weightKg! <= goal.targetValue : m.weightKg! >= goal.targetValue))?.date;
      return { current, share: shareOf(start, current, goal.targetValue, lowerIsBetter), achievedOn: hit, lowerIsBetter };
    }
  }
}

/** A cumulative goal on time: covered at least the share of the time gone by. */
function paceOnTrack(total: number, goal: Goal, since: string, today: string): boolean | undefined {
  if (!goal.deadline) return undefined;
  const span = Date.parse(`${goal.deadline}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`);
  if (span <= 0) return total >= goal.targetValue;
  const gone = clamp((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`)) / span);
  return total >= goal.targetValue * gone;
}

/** The value a new goal starts from: the best 1RM, the best time or the weight now. */
export function startValueFor(goal: Pick<Goal, "type" | "scope" | "distanceM" | "exerciseUuid" | "exerciseName" | "targetValue">, data: GoalData): number | null {
  const probe = { ...goal, uuid: "new", priority: 2, createdAt: `${data.today}T00:00:00Z`, updatedAt: "", _dirty: 0 } as Goal;
  if (goal.type === "distance" || goal.type === "frequency") return null;
  return goalStatus({ ...probe, startValue: null }, data).current;
}

/** The goals in the order they matter: the main one, then the nearest deadline, then the newest. */
export function byPriority<G extends Pick<Goal, "priority" | "deadline" | "createdAt">>(goals: G[]): G[] {
  return [...goals].sort(
    (a, b) => a.priority - b.priority || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || b.createdAt.localeCompare(a.createdAt)
  );
}
