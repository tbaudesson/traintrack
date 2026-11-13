import { recordHistory } from "./performance";
import type { PainReport } from "./pain";

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export interface WeeklyReport {
  monday: string;
  sunday: string;
  /** Days trained, and the days planned when the athlete has a plan. */
  daysTrained: number;
  planned: number | null;
  strengthSessions: number;
  /** Kilos lifted on working sets, and the change from the week before. */
  volume: number;
  volumeChange: number | null;
  /** The best record of each exercise beaten this week. */
  records: { exerciseId: number; weightKg: number; reps: number }[];
  avgRpe: number | null;
  cardio: { sessions: number; distanceM: number; durationSec: number };
  minutes: number;
  pains: PainReport[];
}

type W = { id?: number; date: string; kind?: string; distanceM?: number | null; durationSec?: number | null; durationMin?: number };
type S = { workoutId: number; exerciseId: number; setNumber: number; completed: boolean; isWarmup?: boolean; weightKg?: number; reps?: number; rpe?: number };

/**
 * One week, Monday to Sunday, as the athlete and the coach read it on Monday:
 * days trained against the plan, volume and its change, records beaten,
 * average RPE, endurance, time spent and pains reported.
 */
export function weeklyReport(input: {
  monday: string;
  workouts: W[];
  sets: S[];
  trainingDays?: number[];
  pains?: PainReport[];
}): WeeklyReport {
  const sunday = addDays(input.monday, 6);
  const inWeek = (date: string, from = input.monday, to = sunday) => date >= from && date <= to;
  const week = input.workouts.filter((w) => inWeek(w.date));
  const ids = new Set(week.map((w) => w.id));
  const work = (s: S) => s.completed && !s.isWarmup;
  const volumeOf = (workoutIds: Set<number | undefined>) =>
    input.sets.filter((s) => work(s) && workoutIds.has(s.workoutId) && s.weightKg && s.reps).reduce((sum, s) => sum + s.weightKg! * s.reps!, 0);

  const volume = Math.round(volumeOf(ids));
  const before = new Set(input.workouts.filter((w) => inWeek(w.date, addDays(input.monday, -7), addDays(input.monday, -1))).map((w) => w.id));
  const previous = volumeOf(before);

  const records = new Map<number, { exerciseId: number; weightKg: number; reps: number; max: number }>();
  for (const exerciseId of new Set(input.sets.filter((s) => ids.has(s.workoutId) && work(s)).map((s) => s.exerciseId))) {
    for (const r of recordHistory(exerciseId, input.workouts as { id: number; date: string }[], input.sets)) {
      if (!inWeek(r.date)) continue;
      const best = records.get(exerciseId);
      if (!best || r.oneRepMax > best.max) records.set(exerciseId, { exerciseId, weightKg: r.weightKg, reps: r.reps, max: r.oneRepMax });
    }
  }

  const rpes = input.sets.filter((s) => work(s) && ids.has(s.workoutId) && s.rpe && s.rpe >= 1 && s.rpe <= 10).map((s) => s.rpe!);
  const cardio = week.filter((w) => w.kind === "cardio");

  return {
    monday: input.monday,
    sunday,
    daysTrained: new Set(week.map((w) => w.date)).size,
    planned: input.trainingDays?.length ? input.trainingDays.length : null,
    strengthSessions: week.filter((w) => w.kind !== "cardio").length,
    volume,
    volumeChange: previous > 0 ? Math.round(((volume - previous) / previous) * 100) : null,
    records: [...records.values()].map(({ exerciseId, weightKg, reps }) => ({ exerciseId, weightKg, reps })),
    avgRpe: rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null,
    cardio: {
      sessions: cardio.length,
      distanceM: cardio.reduce((sum, w) => sum + (w.distanceM ?? 0), 0),
      durationSec: cardio.reduce((sum, w) => sum + (w.durationSec ?? 0), 0),
    },
    minutes: week.reduce((sum, w) => sum + (w.durationMin ?? (w.durationSec ? Math.round(w.durationSec / 60) : 0)), 0),
    pains: (input.pains ?? []).filter((p) => inWeek(p.date)),
  };
}
