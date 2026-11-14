import { estimateOneRepMax, recordHistory } from "./performance";
import { finalScore } from "./competitions";
import type { PainReport } from "./pain";

type W = { id?: number; date: string; kind?: string; distanceM?: number | null; durationSec?: number | null; durationMin?: number };
type S = { workoutId: number; exerciseId: number; setNumber: number; completed: boolean; isWarmup?: boolean; weightKg?: number; reps?: number; rpe?: number };
type C = { date: string; event: string; compulsory?: number | null; technical?: number | null; freestyle?: number | null; rank?: number | null; participants?: number | null };

export interface MonthlyReport {
  month: string;
  from: string;
  to: string;
  sessions: number;
  daysTrained: number;
  /** Training days the plan had in the month (up to today for the month in progress). */
  planned: number | null;
  adherence: number | null;
  strengthSessions: number;
  cardio: { sessions: number; distanceM: number; durationSec: number };
  minutes: number;
  volume: number;
  volumeChange: number | null;
  avgRpe: number | null;
  /** The best record of each exercise beaten in the month. */
  records: { exerciseId: number; weightKg: number; reps: number }[];
  /** The exercises whose estimated 1RM rose the most against everything before the month. */
  progress: { exerciseId: number; before: number; best: number; percent: number }[];
  readiness: number | null;
  pains: PainReport[];
  competitions: (C & { final: number | null })[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The first and last day of a month "YYYY-MM". */
export function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}` };
}

/** The month before, or after, "YYYY-MM". */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** How many days of the month fall on the training days (1 = Monday), up to a given day. */
export function plannedDays(month: string, trainingDays: number[], until: string): number {
  const { from, to } = monthBounds(month);
  const end = until < to ? until : to;
  let count = 0;
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const weekday = ((d.getUTCDay() + 6) % 7) + 1;
    if (trainingDays.includes(weekday)) count++;
  }
  return count;
}

/**
 * A month as the coach sends it and the athlete reads it: attendance against
 * the plan, volume and its change, records beaten and the biggest gains,
 * endurance, effort, form, pains and competitions.
 */
export function monthlyReport(input: {
  month: string;
  today: string;
  workouts: W[];
  sets: S[];
  trainingDays?: number[];
  pains?: PainReport[];
  readiness?: { date: string; score: number | null }[];
  competitions?: C[];
}): MonthlyReport {
  const { from, to } = monthBounds(input.month);
  const prev = monthBounds(shiftMonth(input.month, -1));
  const inMonth = (date: string) => date >= from && date <= to;
  const month = input.workouts.filter((w) => inMonth(w.date));
  const ids = new Set(month.map((w) => w.id));
  const work = (s: S) => s.completed && !s.isWarmup;
  const volumeOf = (workoutIds: Set<number | undefined>) =>
    input.sets.filter((s) => work(s) && workoutIds.has(s.workoutId) && s.weightKg && s.reps).reduce((sum, s) => sum + s.weightKg! * s.reps!, 0);
  const volume = Math.round(volumeOf(ids));
  const previous = volumeOf(new Set(input.workouts.filter((w) => w.date >= prev.from && w.date <= prev.to).map((w) => w.id)));

  const dateOf = new Map(input.workouts.map((w) => [w.id, w.date]));
  const exercises = new Set(input.sets.filter((s) => ids.has(s.workoutId) && work(s)).map((s) => s.exerciseId));
  const records: MonthlyReport["records"] = [];
  const progress: MonthlyReport["progress"] = [];
  for (const exerciseId of exercises) {
    let best: { weightKg: number; reps: number; max: number } | null = null;
    for (const r of recordHistory(exerciseId, input.workouts as { id: number; date: string }[], input.sets)) {
      if (inMonth(r.date) && (!best || r.oneRepMax > best.max)) best = { weightKg: r.weightKg, reps: r.reps, max: r.oneRepMax };
    }
    if (best) records.push({ exerciseId, weightKg: best.weightKg, reps: best.reps });

    // Gain: the best of the month against the best of everything before it.
    let before = 0;
    let during = 0;
    for (const s of input.sets) {
      if (s.exerciseId !== exerciseId || !work(s) || !s.weightKg || !s.reps) continue;
      const date = dateOf.get(s.workoutId);
      if (!date) continue;
      const max = estimateOneRepMax(s.weightKg, s.reps);
      if (date < from) before = Math.max(before, max);
      else if (inMonth(date)) during = Math.max(during, max);
    }
    if (before > 0 && during > before)
      progress.push({ exerciseId, before: Math.round(before * 10) / 10, best: Math.round(during * 10) / 10, percent: Math.round(((during - before) / before) * 1000) / 10 });
  }
  progress.sort((a, b) => b.percent - a.percent);

  const rpes = input.sets.filter((s) => work(s) && ids.has(s.workoutId) && s.rpe && s.rpe >= 1 && s.rpe <= 10).map((s) => s.rpe!);
  const scores = (input.readiness ?? []).filter((r) => inMonth(r.date) && r.score !== null).map((r) => r.score!);
  const cardio = month.filter((w) => w.kind === "cardio");
  const daysTrained = new Set(month.map((w) => w.date)).size;
  const planned = input.trainingDays?.length ? plannedDays(input.month, input.trainingDays, input.today) : null;

  return {
    month: input.month,
    from,
    to,
    sessions: month.length,
    daysTrained,
    planned,
    adherence: planned ? Math.min(100, Math.round((daysTrained / planned) * 100)) : null,
    strengthSessions: month.filter((w) => w.kind !== "cardio").length,
    cardio: {
      sessions: cardio.length,
      distanceM: cardio.reduce((sum, w) => sum + (w.distanceM ?? 0), 0),
      durationSec: cardio.reduce((sum, w) => sum + (w.durationSec ?? 0), 0),
    },
    minutes: month.reduce((sum, w) => sum + (w.durationMin ?? (w.durationSec ? Math.round(w.durationSec / 60) : 0)), 0),
    volume,
    volumeChange: previous > 0 ? Math.round(((volume - previous) / previous) * 100) : null,
    avgRpe: rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null,
    records,
    progress: progress.slice(0, 3),
    readiness: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    pains: (input.pains ?? []).filter((p) => inMonth(p.date)),
    competitions: (input.competitions ?? []).filter((c) => inMonth(c.date) && finalScore(c) !== null).map((c) => ({ ...c, final: finalScore(c) })),
  };
}
