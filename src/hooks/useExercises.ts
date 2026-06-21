import { useLiveQuery } from "dexie-react-hooks";
import db, { type Exercise, type MuscleGroup, type Equipment } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** All exercises visible to the user: seeded globals + own customs. */
export function useExercises() {
  return useLiveQuery(
    () => db.exercises.filter((e) => !e.deletedAt).sortBy("name"),
    []
  ) ?? [];
}

export function useExercise(id: number | undefined) {
  return useLiveQuery(() => (id ? db.exercises.get(id) : undefined), [id]);
}

export async function createCustomExercise(data: {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: Equipment;
  description?: string;
  videoUrl?: string;
}): Promise<number> {
  const now = new Date().toISOString();
  const id = (await db.exercises.add({
    name: data.name,
    muscleGroup: data.muscleGroup,
    equipment: data.equipment,
    description: data.description,
    videoUrl: data.videoUrl,
    isCustom: true,
    uuid: crypto.randomUUID(),
    userId: getCurrentUserIdSync(),
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

export async function updateExercise(id: number, data: Partial<Exercise>): Promise<void> {
  await db.exercises.update(id, { ...data, updatedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

export async function deleteExercise(id: number): Promise<void> {
  await db.exercises.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}
