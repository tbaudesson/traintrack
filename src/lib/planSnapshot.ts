import type { Program, ProgramDay, ProgramRevision } from "@/db";
import { bottomOfRepRange, topOfRepRange } from "./performance";

/**
 * The plan kept apart from what was done. A session started from a program
 * keeps a copy of its day (Workout.plannedDay): editing the program later
 * changes what comes next, never what a past session was planned to be. Each
 * day carries a key that follows it through renames and moves, so a session
 * stays tied to its own day, and to none once that day is deleted. Each change
 * of a program keeps the version before it (Program.revisions).
 */

/** Versions kept per program: enough to go back, not a growing row. */
export const MAX_REVISIONS = 10;

const newKey = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** The days, each with a key (the ones they have are kept). */
export function withDayKeys(structure: ProgramDay[]): ProgramDay[] {
  const seen = new Set<string>();
  return structure.map((d) => {
    // A day copied in the editor can carry its model's key: it gets its own.
    const key = d.key && !seen.has(d.key) ? d.key : newKey();
    seen.add(key);
    return d.key === key ? d : { ...d, key };
  });
}

export const needsKeys = (structure: ProgramDay[] | undefined) => (structure ?? []).some((d) => !d.key);

/**
 * The program day a session belongs to: by its kept day's key when there is
 * one (null when that day was deleted since), else by the stored position.
 */
export function plannedIndex(
  program: Pick<Program, "structure">,
  workout: { programDayIndex?: number | null; plannedDay?: ProgramDay | null }
): number | null | undefined {
  const key = workout.plannedDay?.key;
  if (!key) return undefined;
  const index = (program.structure ?? []).findIndex((d) => d.key === key);
  return index === -1 ? null : index;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The versions to keep once a program changes: the one before the change
 * added, the oldest let go. Nothing kept when neither its name nor its days
 * change (a favourite, a planning, keys added).
 */
export function reviseProgram(before: Pick<Program, "name" | "structure" | "revisions">, next: { name?: string; structure?: ProgramDay[] }, at: string): ProgramRevision[] | undefined {
  // Keys added to a program from before them are not a change.
  const strip = (s: ProgramDay[] | undefined) => (s ?? []).map((d) => ({ ...d, key: undefined }));
  const renamed = next.name !== undefined && next.name !== before.name;
  const reshaped = next.structure !== undefined && !sameJson(strip(next.structure), strip(before.structure));
  if (!renamed && !reshaped) return undefined;
  return [...(before.revisions ?? []), { at, name: before.name, structure: before.structure ?? [] }].slice(-MAX_REVISIONS);
}

/** What changed from one version to the next, in a few numbers. */
export function changeSummary(from: ProgramDay[], to: ProgramDay[]): { daysAdded: number; daysRemoved: number; exercisesAdded: number; exercisesRemoved: number; targetsChanged: number } {
  const keyOf = (d: ProgramDay, i: number) => d.key ?? `#${i}`;
  const before = new Map(from.map((d, i) => [keyOf(d, i), d]));
  const after = new Map(to.map((d, i) => [keyOf(d, i), d]));
  let exercisesAdded = 0;
  let exercisesRemoved = 0;
  let targetsChanged = 0;
  for (const [k, d] of after) {
    const old = before.get(k);
    if (!old) continue;
    const names = (x: ProgramDay) => x.exercises.map((e) => e.exerciseName);
    exercisesAdded += names(d).filter((n) => !names(old).includes(n)).length;
    exercisesRemoved += names(old).filter((n) => !names(d).includes(n)).length;
    for (const e of d.exercises) {
      const o = old.exercises.find((x) => x.exerciseName === e.exerciseName);
      if (o && (o.targetSets !== e.targetSets || o.targetReps !== e.targetReps || (o.restSec ?? 0) !== (e.restSec ?? 0))) targetsChanged++;
    }
  }
  return {
    daysAdded: [...after.keys()].filter((k) => !before.has(k)).length,
    daysRemoved: [...before.keys()].filter((k) => !after.has(k)).length,
    exercisesAdded,
    exercisesRemoved,
    targetsChanged,
  };
}

type SetRow = { exerciseId: number; reps?: number; weightKg?: number; completed: boolean; isWarmup?: boolean };
type ExerciseRow = { id?: number; name: string; uuid?: string };

export type PlanLine = {
  name: string;
  planned: { sets: number; reps: string; restSec?: number } | null;
  done: { sets: number; reps: number[]; topKg: number | null } | null;
  /** As planned, different (sets or reps), added during the session, or not done. */
  status: "asPlanned" | "changed" | "added" | "skipped";
};

/** "8-12" → [8, 12], "10" → [10, 10]; null for "AMRAP" and the like. */
function repRange(reps: string): [number, number] | null {
  const low = bottomOfRepRange(reps);
  const high = topOfRepRange(reps);
  return low !== null && high !== null ? [low, high] : null;
}

/**
 * The plan beside what was done, exercise by exercise: the planned ones in
 * their order, then those added. Only the working sets ticked done count.
 */
export function planVsDone(planned: ProgramDay, sets: SetRow[], exercises: ExerciseRow[]): PlanLine[] {
  const work = sets.filter((s) => s.completed && !s.isWarmup);
  const idOf = (name: string, uuid?: string) => exercises.find((e) => (uuid && e.uuid === uuid) || e.name.toLowerCase() === name.toLowerCase())?.id;
  const doneOf = (id: number | undefined) => {
    const own = work.filter((s) => s.exerciseId === id);
    if (!own.length) return null;
    const kg = own.map((s) => s.weightKg ?? 0).filter((w) => w > 0);
    return { sets: own.length, reps: own.map((s) => s.reps ?? 0), topKg: kg.length ? Math.max(...kg) : null };
  };
  const plannedIds: (number | undefined)[] = [];
  const lines: PlanLine[] = planned.exercises.map((pe) => {
    const id = idOf(pe.exerciseName, pe.exerciseUuid);
    plannedIds.push(id);
    const done = doneOf(id);
    const range = repRange(pe.targetReps);
    const inRange = !range || (done?.reps.every((r) => r >= range[0] && r <= range[1]) ?? false);
    return {
      name: pe.exerciseName,
      planned: { sets: pe.targetSets, reps: pe.targetReps, restSec: pe.restSec },
      done,
      status: !done ? "skipped" : done.sets === pe.targetSets && inRange ? "asPlanned" : "changed",
    };
  });
  const added: number[] = [];
  for (const s of work) if (!plannedIds.includes(s.exerciseId) && !added.includes(s.exerciseId)) added.push(s.exerciseId);
  for (const id of added) {
    const ex = exercises.find((e) => e.id === id);
    if (ex) lines.push({ name: ex.name, planned: null, done: doneOf(id), status: "added" });
  }
  return lines;
}
