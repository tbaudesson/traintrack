import type { Program, ProgramDay, ProgramExercise, Workout } from "@/db";

type SetRow = { exerciseId: number; workoutId: number; setNumber?: number; reps?: number; restSec?: number; isWarmup?: boolean; completed?: boolean; supersetGroup?: number | null };
type ExerciseRow = { id?: number; name: string; uuid?: string };

/** "Name (copy)", "Name (copy 2)"…: a name none of one's programs has yet. */
export function copyName(name: string, taken: string[], word: string): string {
  const base = name.replace(new RegExp(`\\s*\\(${word}(?: \\d+)?\\)$`), "");
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? `${base} (${word})` : `${base} (${word} ${n})`;
    if (!taken.includes(candidate)) return candidate;
  }
}

/** "8", "8-10": the reps of the sets, as a program writes them. */
function repsOf(reps: number[]): string {
  if (!reps.length) return "8-12";
  const lo = Math.min(...reps);
  const hi = Math.max(...reps);
  return lo === hi ? String(lo) : `${lo}-${hi}`;
}

/**
 * A session done, made a day of a program: its exercises in the order done,
 * as many sets as were done (warm-ups left out), their reps and their rest.
 * Sets not ticked count too: the plan was there. Null when there is nothing
 * to keep (a run, an empty session).
 */
export function dayFromWorkout(name: string, workoutId: number, sets: SetRow[], exercises: ExerciseRow[]): ProgramDay | null {
  const mine = sets.filter((s) => s.workoutId === workoutId && !s.isWarmup);
  const order: number[] = [];
  for (const s of mine) if (!order.includes(s.exerciseId)) order.push(s.exerciseId);
  const items = order
    .map((id) => {
      const ex = exercises.find((e) => e.id === id);
      if (!ex) return null;
      const own = mine.filter((s) => s.exerciseId === id);
      const done = own.filter((s) => s.completed);
      const counted = done.length ? done : own;
      const rests = counted.map((s) => s.restSec).filter((r): r is number => typeof r === "number" && r > 0);
      const item: ProgramExercise = {
        exerciseName: ex.name,
        exerciseUuid: ex.uuid,
        targetSets: counted.length,
        targetReps: repsOf(counted.map((s) => s.reps).filter((r): r is number => typeof r === "number" && r > 0)),
        restSec: rests.length ? Math.round(rests.reduce((a, b) => a + b, 0) / rests.length / 15) * 15 : 90,
      };
      return { item, group: own[0]?.supersetGroup ?? null };
    })
    .filter((x): x is { item: ProgramExercise; group: number | null } => !!x);
  if (!items.length) return null;
  // Exercises done in a row in the session stay a superset in the program.
  const exercisesOut = items.map(({ item, group }, i) => (group != null && items[i + 1]?.group === group ? { ...item, supersetWithNext: true } : item));
  return { name, exercises: exercisesOut };
}

/** The date of the last session of each program, for "recently used". */
export function lastUsed(workouts: Pick<Workout, "programId" | "date">[]): Map<number, string> {
  const out = new Map<number, string>();
  for (const w of workouts) if (w.programId && (out.get(w.programId) ?? "") < w.date) out.set(w.programId, w.date);
  return out;
}

/** One's programs in the order to show: favourites, then the last used, then the newest. */
export function byUse<T extends Pick<Program, "id" | "favorite" | "createdAt">>(programs: T[], used: Map<number, string>): T[] {
  return [...programs].sort(
    (a, b) =>
      Number(!!b.favorite) - Number(!!a.favorite) ||
      (used.get(b.id ?? -1) ?? "").localeCompare(used.get(a.id ?? -1) ?? "") ||
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );
}

/** A day added at the end of a program: a plan in weeks gets it in its last week. */
export function appendDay(structure: ProgramDay[], day: ProgramDay): ProgramDay[] {
  const last = structure[structure.length - 1];
  return [...structure, last?.week !== undefined ? { ...day, week: last.week } : day];
}
