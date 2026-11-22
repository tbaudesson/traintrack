import { findExercise } from "./exerciseMatch";
import type { Program } from "@/db";
import { estimateOneRepMax, isTimedTarget } from "./performance";
import { findWorkoutProgramDay } from "./startWorkout";
import { programWeek } from "./programWeek";
import { programCategory } from "./programCategories";
import type { ProgramTemplate } from "./programTemplates";

type W = { id?: number; date: string; title?: string; programId?: number | null; programDayIndex?: number | null };
type S = { workoutId: number; exerciseId: number; completed: boolean; isWarmup?: boolean; weightKg?: number | null; reps?: number | null };
type E = { id?: number; name: string; uuid?: string };

/** How an exercise is measured: the estimated 1RM, the most reps, or the longest hold in seconds. */
export type MetricKind = "load" | "reps" | "seconds";

export interface ExerciseSeries {
  name: string;
  exerciseId: number;
  kind: MetricKind;
  /** The best of each session, oldest first. */
  points: { date: string; value: number }[];
}

/**
 * Each exercise of a program over its sessions: the best estimated 1RM of a
 * session when there is a load, otherwise its most reps (or seconds, for a
 * hold). In the order of the program.
 */
export function exerciseSeries(input: { program: Program; workouts: W[]; sets: S[]; exercises: E[] }): ExerciseSeries[] {
  const { program } = input;
  const dates = new Map<number, string>();
  for (const w of input.workouts) if (w.id !== undefined && findWorkoutProgramDay([program], w)) dates.set(w.id, w.date);
  const out: ExerciseSeries[] = [];
  const seen = new Set<number>();
  for (const day of program.structure ?? []) {
    for (const pe of day.exercises) {
      const ex = findExercise(input.exercises, pe.exerciseName, pe.exerciseUuid);
      if (ex?.id === undefined || seen.has(ex.id)) continue;
      seen.add(ex.id);
      const done = input.sets.filter((s) => s.exerciseId === ex.id && s.completed && !s.isWarmup && dates.has(s.workoutId) && (s.reps ?? 0) > 0);
      const loaded = done.some((s) => (s.weightKg ?? 0) > 0);
      const kind: MetricKind = loaded ? "load" : isTimedTarget(pe.targetReps) ? "seconds" : "reps";
      const best = new Map<string, number>();
      for (const s of done) {
        if (loaded && !(s.weightKg && s.weightKg > 0)) continue;
        const value = loaded ? estimateOneRepMax(s.weightKg!, s.reps!) : s.reps!;
        const date = dates.get(s.workoutId)!;
        best.set(date, Math.max(best.get(date) ?? 0, value));
      }
      if (!best.size) continue;
      out.push({
        name: ex.name,
        exerciseId: ex.id,
        kind,
        points: [...best.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)),
      });
    }
  }
  return out;
}

export interface ProgramReview {
  sessions: number;
  /** Sessions in a plan made of weeks; null for a rotation. */
  planned: number | null;
  first: string | null;
  last: string | null;
  /** Kilos lifted over the program, warm-ups aside. */
  volume: number;
  finished: boolean;
  /** Exercises trained twice at least: the first session against the best one. */
  progress: { name: string; exerciseId: number; kind: MetricKind; from: number; best: number; change: number }[];
}

/** What a program brought: sessions done, kilos lifted, and how each exercise moved. Biggest gains first. */
export function programReview(input: { program: Program; workouts: W[]; sets: S[]; exercises: E[]; today: string }): ProgramReview {
  const { program } = input;
  const own = input.workouts.filter((w) => findWorkoutProgramDay([program], w)).sort((a, b) => a.date.localeCompare(b.date));
  const ids = new Set(own.map((w) => w.id));
  const volume = input.sets
    .filter((s) => ids.has(s.workoutId) && s.completed && !s.isWarmup && s.weightKg && s.reps)
    .reduce((sum, s) => sum + s.weightKg! * s.reps!, 0);
  const weeks = (program.structure ?? []).some((d) => d.week !== undefined);
  const progress = exerciseSeries(input)
    .filter((x) => x.points.length >= 2)
    .map((x) => {
      const from = x.points[0].value;
      const best = Math.max(...x.points.map((p) => p.value));
      return { name: x.name, exerciseId: x.exerciseId, kind: x.kind, from, best, change: from > 0 ? Math.round(((best - from) / from) * 100) : 0 };
    })
    .sort((a, b) => b.change - a.change);
  return {
    sessions: new Set(own.map((w) => `${w.date}:${w.programDayIndex ?? w.title}`)).size,
    planned: weeks ? program.structure.length : null,
    first: own[0]?.date ?? null,
    last: own.at(-1)?.date ?? null,
    volume: Math.round(volume),
    finished: !!programWeek(program, input.today)?.finished,
    progress,
  };
}

const LEVELS = ["beginner", "intermediate", "advanced"];

/**
 * What to follow once a program is over: ready-made programs of the same kind,
 * the next level up first, then the same level; never the program itself.
 * Three at most.
 */
export function nextPrograms(program: Pick<Program, "name" | "structure">, catalogue: ProgramTemplate[]): ProgramTemplate[] {
  const category = programCategory(program, catalogue);
  const current = catalogue.find((t) => t.name === program.name);
  const level = current ? LEVELS.indexOf(current.level) : -1;
  const rank = (t: ProgramTemplate) => {
    const l = LEVELS.indexOf(t.level);
    if (level < 0) return 0;
    return l === level + 1 ? 0 : l === level ? 1 : l > level ? 2 : 3;
  };
  return catalogue
    .filter((t) => t.name !== program.name && (!category || programCategory(t, catalogue) === category))
    .filter((t) => level < 0 || LEVELS.indexOf(t.level) >= level)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 3);
}
