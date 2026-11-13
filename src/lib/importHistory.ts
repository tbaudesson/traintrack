import db, { getCurrentUserIdSync, type Workout, type WorkoutSet } from "@/db";
import { schedulePush } from "./syncEngine";
import { matchExercise, type ImportedWorkout, type ParsedHistory } from "./importCsv";

export interface ImportPlan {
  /** Sessions to add; those already in the app (same day, same title) are left out. */
  workouts: ImportedWorkout[];
  duplicates: number;
  sets: number;
  /** Exercise names found in the library, and those that will be created. */
  matched: string[];
  created: string[];
}

/** What an import would do, before doing it. */
export async function planImport(history: ParsedHistory): Promise<ImportPlan> {
  const uid = getCurrentUserIdSync();
  const existing = new Set(
    (await db.workouts.toArray()).filter((w) => !w.deletedAt && (!uid || w.userId === uid)).map((w) => `${w.date}|${w.title ?? ""}`)
  );
  const workouts = history.workouts.filter((w) => !existing.has(`${w.date}|${w.title}`));
  const library = (await db.exercises.toArray()).filter((e) => !e.deletedAt);
  const names = [...new Set(workouts.flatMap((w) => w.sets.map((s) => s.exercise)))];
  const matched = names.filter((n) => matchExercise(n, library));
  return {
    workouts,
    duplicates: history.workouts.length - workouts.length,
    sets: workouts.reduce((sum, w) => sum + w.sets.length, 0),
    matched,
    created: names.filter((n) => !matched.includes(n)).sort(),
  };
}

/**
 * Write the planned sessions in one go: the exercises missing from the library
 * are created as custom ones, every set is marked done, and the sync sends it
 * all at the next push.
 */
export async function runImport(plan: ImportPlan): Promise<{ workouts: number; sets: number }> {
  const uid = getCurrentUserIdSync();
  const now = new Date().toISOString();
  const sync = { userId: uid, _dirty: 1 as const, createdAt: now, updatedAt: now };

  const library = (await db.exercises.toArray()).filter((e) => !e.deletedAt);
  const idOf = new Map<string, number>();
  for (const name of [...plan.matched, ...plan.created]) {
    const found = matchExercise(name, library);
    if (found?.id !== undefined) {
      idOf.set(name, found.id);
      continue;
    }
    const id = (await db.exercises.add({ name, muscleGroup: "other", isCustom: true, uuid: crypto.randomUUID(), ...sync })) as number;
    idOf.set(name, id);
    library.push({ id, name, muscleGroup: "other", isCustom: true, ...sync } as (typeof library)[number]);
  }

  const workoutIds = (await db.workouts.bulkAdd(
    plan.workouts.map(
      (w): Workout => ({
        date: w.date,
        title: w.title,
        kind: "strength",
        programId: null,
        programDayIndex: null,
        sport: null,
        durationMin: w.durationMin,
        uuid: crypto.randomUUID(),
        ...sync,
      })
    ),
    { allKeys: true }
  )) as number[];

  const sets: WorkoutSet[] = plan.workouts.flatMap((w, i) => {
    const counters = new Map<string, number>();
    return w.sets.map((s): WorkoutSet => {
      const key = `${s.exercise}|${s.isWarmup}`;
      counters.set(key, (counters.get(key) ?? 0) + 1);
      return {
        workoutId: workoutIds[i],
        exerciseId: idOf.get(s.exercise)!,
        setNumber: counters.get(key)!,
        weightKg: s.weightKg,
        reps: s.reps,
        rpe: s.rpe,
        isWarmup: s.isWarmup,
        completed: true,
        uuid: crypto.randomUUID(),
        ...sync,
      };
    });
  });
  await db.workoutSets.bulkAdd(sets);
  schedulePush();
  return { workouts: workoutIds.length, sets: sets.length };
}
