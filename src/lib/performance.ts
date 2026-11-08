import type { Workout, WorkoutSet } from "@/db";

type Session = Pick<Workout, "id" | "date">;
type SetLike = Pick<WorkoutSet, "workoutId" | "exerciseId" | "setNumber" | "weightKg" | "reps" | "completed">;

const WEIGHT_STEP_KG = 2.5;

/** Oldest first: by date, then by creation order within a day. */
function ranks(workouts: Session[]): Map<number, number> {
  const ordered = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0));
  return new Map(ordered.map((w, i) => [w.id as number, i]));
}

function isLogged(s: SetLike) {
  return s.completed && !!s.reps && s.reps > 0;
}

/** Estimated one-rep max (Epley). A single rep is simply its own weight. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  return reps <= 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** The sets of the most recent earlier session that trained this exercise. */
export function lastPerformance<S extends SetLike>(
  exerciseId: number,
  current: Session | undefined,
  workouts: Session[],
  sets: S[]
): S[] {
  const rank = ranks(workouts);
  const limit = current?.id !== undefined ? (rank.get(current.id) ?? Infinity) : Infinity;
  let latest = -1;
  for (const s of sets) {
    const r = rank.get(s.workoutId);
    if (r !== undefined && r < limit && s.exerciseId === exerciseId && isLogged(s) && r > latest) latest = r;
  }
  if (latest === -1) return [];
  return sets
    .filter((s) => rank.get(s.workoutId) === latest && s.exerciseId === exerciseId && isLogged(s))
    .sort((a, b) => a.setNumber - b.setNumber);
}

/** The top of a rep target: "8-10" → 10, "12" → 12. Timed targets have none. */
export function topOfRepRange(target: string | undefined): number | null {
  if (!target || /s\s*$/i.test(target.trim())) return null;
  const numbers = target.match(/\d+/g)?.map(Number);
  return numbers?.length ? Math.max(...numbers) : null;
}

/** A target held for time rather than counted: "30-45s". */
export function isTimedTarget(target: string | undefined): boolean {
  return !!target && /s\s*$/i.test(target.trim());
}

/** The bottom of a rep target: "8-10" → 8, "12" → 12. Timed targets have none. */
export function bottomOfRepRange(target: string | undefined): number | null {
  if (!target || /s\s*$/i.test(target.trim())) return null;
  const numbers = target.match(/\d+/g)?.map(Number);
  return numbers?.length ? Math.min(...numbers) : null;
}

/**
 * What to record when a set is ticked with empty boxes. Greyed-out hints look
 * like entered values, so a tick must not leave them unsaved. Reps take the
 * bottom of the range: claiming the top would trigger a weight increase the
 * athlete never earned.
 */
export function valuesForTick(
  set: Pick<WorkoutSet, "weightKg" | "reps">,
  hint: { weightKg?: number | null; targetReps?: string }
): Partial<Pick<WorkoutSet, "weightKg" | "reps">> {
  const filled: Partial<Pick<WorkoutSet, "weightKg" | "reps">> = {};
  if (!set.weightKg && hint.weightKg) filled.weightKg = hint.weightKg;
  const reps = bottomOfRepRange(hint.targetReps);
  if (!set.reps && reps !== null) filled.reps = reps;
  return filled;
}

/** The heavier weight to try, once every target set reached the top of the range. */
export function suggestWeight(last: SetLike[], targetSets: number, targetReps: string | undefined): number | null {
  const top = topOfRepRange(targetReps);
  const weight = topWeight(last);
  if (top === null || weight === null || last.length < targetSets) return null;
  return last.every((s) => (s.reps ?? 0) >= top) ? weight + WEIGHT_STEP_KG : null;
}

export function topWeight(last: SetLike[]): number | null {
  const weights = last.map((s) => s.weightKg ?? 0).filter((w) => w > 0);
  return weights.length ? Math.max(...weights) : null;
}

export interface RecordEntry {
  workoutId: number;
  date: string;
  weightKg: number;
  reps: number;
  oneRepMax: number;
}

/**
 * Every set that beat what came before it, oldest first. The very first set
 * only sets the baseline: nothing was beaten yet.
 */
export function recordHistory(exerciseId: number, workouts: Session[], sets: SetLike[]): RecordEntry[] {
  const rank = ranks(workouts);
  const dates = new Map(workouts.map((w) => [w.id as number, w.date]));
  const ordered = sets
    .filter((s) => s.exerciseId === exerciseId && isLogged(s) && (s.weightKg ?? 0) > 0 && rank.has(s.workoutId))
    .sort((a, b) => rank.get(a.workoutId)! - rank.get(b.workoutId)! || a.setNumber - b.setNumber);

  const records: RecordEntry[] = [];
  let bestWeight = 0;
  let bestMax = 0;
  ordered.forEach((s, i) => {
    const weightKg = s.weightKg!;
    const reps = s.reps!;
    const oneRepMax = estimateOneRepMax(weightKg, reps);
    if (i > 0 && (weightKg > bestWeight || oneRepMax > bestMax)) {
      records.push({ workoutId: s.workoutId, date: dates.get(s.workoutId) ?? "", weightKg, reps, oneRepMax });
    }
    bestWeight = Math.max(bestWeight, weightKg);
    bestMax = Math.max(bestMax, oneRepMax);
  });
  return records;
}

export function bestLifts(exerciseId: number, sets: SetLike[]): { weightKg: number; oneRepMax: number } | null {
  const own = sets.filter((s) => s.exerciseId === exerciseId && isLogged(s) && (s.weightKg ?? 0) > 0);
  if (!own.length) return null;
  return {
    weightKg: Math.max(...own.map((s) => s.weightKg!)),
    oneRepMax: Math.max(...own.map((s) => estimateOneRepMax(s.weightKg!, s.reps!))),
  };
}

/** Whether this set, just completed, beats everything logged up to now. */
export function beatsRecord(
  candidate: SetLike,
  current: Session,
  workouts: Session[],
  others: SetLike[]
): boolean {
  if (!candidate.weightKg || !candidate.reps) return false;
  const rank = ranks(workouts);
  const limit = rank.get(current.id as number) ?? Infinity;
  const earlier = others.filter((s) => {
    const r = rank.get(s.workoutId);
    return r !== undefined && r <= limit && s.exerciseId === candidate.exerciseId;
  });
  const best = bestLifts(candidate.exerciseId, earlier);
  if (!best) return false;
  return candidate.weightKg > best.weightKg || estimateOneRepMax(candidate.weightKg, candidate.reps) > best.oneRepMax;
}

export function totalVolume(sets: SetLike[]): number {
  return sets.reduce((sum, s) => (isLogged(s) && s.weightKg ? sum + s.weightKg * s.reps! : sum), 0);
}

export function timestampIn(seconds: number): number {
  return Date.now() + seconds * 1000;
}

/** How long a session took; null when it was clearly not run in one go. */
export function elapsedMinutes(startedAt: string): number | null {
  const minutes = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
  return minutes > 0 && minutes <= 300 ? minutes : null;
}

const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/** The plates for one side of the bar; `left` is what no plate can make up. */
export function platesPerSide(targetKg: number, barKg: number): { plates: number[]; left: number } {
  // In grams: 1.25 is exact, but repeated subtraction of decimals drifts.
  let remaining = Math.round(((targetKg - barKg) / 2) * 1000);
  const plates: number[] = [];
  if (remaining <= 0) return { plates, left: 0 };
  for (const kg of PLATES_KG) {
    const grams = Math.round(kg * 1000);
    while (remaining >= grams) {
      plates.push(kg);
      remaining -= grams;
    }
  }
  return { plates, left: remaining / 1000 };
}
