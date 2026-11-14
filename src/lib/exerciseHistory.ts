import { estimateOneRepMax } from "./performance";

type Session = { id?: number; date: string; title?: string };
type SetLike = { workoutId: number; exerciseId: number; setNumber: number; completed: boolean; isWarmup?: boolean; weightKg?: number | null; reps?: number | null; rpe?: number | null };

export interface HistorySession {
  workoutId: number;
  date: string;
  title?: string;
  sets: { weightKg?: number; reps: number; rpe?: number }[];
  /** Heaviest working set of the day, kg. */
  topKg: number | null;
  /** Best estimated 1RM of the day, kg. */
  oneRepMax: number | null;
  /** Weight × reps over the working sets. */
  volume: number;
  /** Most reps (or seconds) in one set. */
  bestReps: number;
}

export interface HistoryRecord<T = number> {
  value: T;
  date: string;
  workoutId: number;
}

export interface ExerciseHistory {
  /** Most recent first. */
  sessions: HistorySession[];
  records: {
    heaviest: HistoryRecord<{ kg: number; reps: number }> | null;
    oneRepMax: HistoryRecord | null;
    volume: HistoryRecord | null;
    reps: HistoryRecord | null;
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Everything one did of an exercise: each session with its working sets (no
 * warm-up), and the records — heaviest set, best estimated 1RM, biggest
 * volume in a session, most reps in a set. A record ties go to the first time.
 */
export function exerciseHistory(exerciseId: number, workouts: Session[], sets: SetLike[]): ExerciseHistory {
  const byId = new Map(workouts.filter((w) => w.id !== undefined).map((w) => [w.id!, w]));
  const grouped = new Map<number, SetLike[]>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || !s.completed || s.isWarmup || !s.reps || !byId.has(s.workoutId)) continue;
    const list = grouped.get(s.workoutId) ?? [];
    list.push(s);
    grouped.set(s.workoutId, list);
  }

  const sessions: HistorySession[] = [...grouped.entries()].map(([workoutId, list]) => {
    const w = byId.get(workoutId)!;
    const ordered = [...list].sort((a, b) => a.setNumber - b.setNumber);
    const weighted = ordered.filter((s) => s.weightKg);
    return {
      workoutId,
      date: w.date,
      title: w.title,
      sets: ordered.map((s) => ({ weightKg: s.weightKg ?? undefined, reps: s.reps!, rpe: s.rpe ?? undefined })),
      topKg: weighted.length ? Math.max(...weighted.map((s) => s.weightKg!)) : null,
      oneRepMax: weighted.length ? round(Math.max(...weighted.map((s) => estimateOneRepMax(s.weightKg!, s.reps!)))) : null,
      volume: round(weighted.reduce((sum, s) => sum + s.weightKg! * s.reps!, 0)),
      bestReps: Math.max(...ordered.map((s) => s.reps!)),
    };
  });
  sessions.sort((a, b) => b.date.localeCompare(a.date) || b.workoutId - a.workoutId);

  // Records: oldest first, so a tie keeps the first time it was done.
  const chronological = [...sessions].reverse();
  let heaviest: ExerciseHistory["records"]["heaviest"] = null;
  let oneRepMax: HistoryRecord | null = null;
  let volume: HistoryRecord | null = null;
  let reps: HistoryRecord | null = null;
  for (const s of chronological) {
    for (const set of s.sets) {
      if (set.weightKg && (!heaviest || set.weightKg > heaviest.value.kg || (set.weightKg === heaviest.value.kg && set.reps > heaviest.value.reps)))
        heaviest = { value: { kg: set.weightKg, reps: set.reps }, date: s.date, workoutId: s.workoutId };
    }
    if (s.oneRepMax && (!oneRepMax || s.oneRepMax > oneRepMax.value)) oneRepMax = { value: s.oneRepMax, date: s.date, workoutId: s.workoutId };
    if (s.volume && (!volume || s.volume > volume.value)) volume = { value: s.volume, date: s.date, workoutId: s.workoutId };
    if (!reps || s.bestReps > reps.value) reps = { value: s.bestReps, date: s.date, workoutId: s.workoutId };
  }
  return { sessions, records: { heaviest, oneRepMax, volume, reps } };
}
