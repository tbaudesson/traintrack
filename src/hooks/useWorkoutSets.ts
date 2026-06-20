import { useLiveQuery } from "dexie-react-hooks";
import db, { type WorkoutSet } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** Sets for a given workout, ordered by set number. */
export function useWorkoutSets(workoutId: number | undefined) {
  return useLiveQuery(async () => {
    if (!workoutId) return [];
    const sets = await db.workoutSets.where("workoutId").equals(workoutId).toArray();
    return sets
      .filter((s) => !s.deletedAt)
      .sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0));
  }, [workoutId]) ?? [];
}

/** All of a user's sets (for progress charts / PRs). */
export function useAllWorkoutSets(userId?: string) {
  return useLiveQuery(async () => {
    const uid = userId ?? getCurrentUserIdSync();
    const all = await db.workoutSets.filter((s) => !s.deletedAt).toArray();
    return uid ? all.filter((s) => s.userId === uid) : all;
  }, [userId]) ?? [];
}

export async function addWorkoutSet(data: {
  workoutId: number;
  exerciseId: number;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  rpe?: number;
  restSec?: number;
  completed?: boolean;
}): Promise<number> {
  const now = new Date().toISOString();
  const id = (await db.workoutSets.add({
    ...data,
    completed: data.completed ?? false,
    uuid: crypto.randomUUID(),
    userId: getCurrentUserIdSync(),
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

export async function updateWorkoutSet(id: number, data: Partial<WorkoutSet>): Promise<void> {
  await db.workoutSets.update(id, { ...data, updatedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

export async function deleteWorkoutSet(id: number): Promise<void> {
  await db.workoutSets.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}
