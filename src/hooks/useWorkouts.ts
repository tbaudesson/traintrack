import { useLiveQuery } from "dexie-react-hooks";
import db, { type Workout } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** Workouts for a given user (defaults to the current user). */
export function useWorkouts(userId?: string) {
  return useLiveQuery(async () => {
    const uid = userId ?? getCurrentUserIdSync();
    const all = await db.workouts.filter((w) => !w.deletedAt).toArray();
    const mine = uid ? all.filter((w) => w.userId === uid) : all;
    return mine.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [userId]) ?? [];
}

export function useWorkout(id: number | undefined) {
  return useLiveQuery(() => (id ? db.workouts.get(id) : undefined), [id]);
}

export async function createWorkout(data: {
  date: string;
  title?: string;
  programId?: number | null;
  notes?: string;
}): Promise<number> {
  const now = new Date().toISOString();
  const id = (await db.workouts.add({
    date: data.date,
    title: data.title,
    programId: data.programId ?? null,
    notes: data.notes,
    uuid: crypto.randomUUID(),
    userId: getCurrentUserIdSync(),
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

export async function updateWorkout(id: number, data: Partial<Workout>): Promise<void> {
  await db.workouts.update(id, { ...data, updatedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

export async function deleteWorkout(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.workouts.update(id, { deletedAt: now, _dirty: 1 });
  // Soft-delete the workout's sets too
  const sets = await db.workoutSets.where("workoutId").equals(id).toArray();
  await Promise.all(
    sets.map((s) => s.id && db.workoutSets.update(s.id, { deletedAt: now, _dirty: 1 }))
  );
  schedulePush();
}
