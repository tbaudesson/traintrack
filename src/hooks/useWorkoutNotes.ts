import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** Notes on a given workout, oldest first. */
export function useWorkoutNotes(workoutId: number | undefined) {
  return useLiveQuery(async () => {
    if (!workoutId) return [];
    const notes = await db.workoutNotes.where("workoutId").equals(workoutId).toArray();
    return notes.filter((n) => !n.deletedAt).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }, [workoutId]) ?? [];
}

export async function addWorkoutNote(workoutId: number, body: string, authorName?: string): Promise<number> {
  const now = new Date().toISOString();
  const id = (await db.workoutNotes.add({
    workoutId,
    body,
    authorName,
    uuid: crypto.randomUUID(),
    userId: getCurrentUserIdSync(),
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

export async function deleteWorkoutNote(id: number): Promise<void> {
  await db.workoutNotes.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}
