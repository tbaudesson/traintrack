import { useLiveQuery } from "dexie-react-hooks";
import db, { type Program, type ProgramDay } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** Programs owned by, or assigned to, the current user. */
export function usePrograms() {
  return useLiveQuery(async () => {
    const uid = getCurrentUserIdSync();
    const all = await db.programs.filter((p) => !p.deletedAt).toArray();
    if (!uid) return all;
    return all.filter(
      (p) => p.userId === uid || p.ownerUserId === uid || p.assignedToUserId === uid
    );
  }, []) ?? [];
}

export function useProgram(id: number | undefined) {
  return useLiveQuery(() => (id ? db.programs.get(id) : undefined), [id]);
}

export async function createProgram(data: {
  name: string;
  description?: string;
  structure?: ProgramDay[];
  assignedToUserId?: string | null;
  groupId?: string | null;
}): Promise<number> {
  const now = new Date().toISOString();
  const uid = getCurrentUserIdSync();
  const id = (await db.programs.add({
    name: data.name,
    description: data.description,
    structure: data.structure ?? [],
    ownerUserId: uid,
    assignedToUserId: data.assignedToUserId ?? null,
    groupId: data.groupId ?? null,
    uuid: crypto.randomUUID(),
    userId: uid,
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

export async function updateProgram(id: number, data: Partial<Program>): Promise<void> {
  await db.programs.update(id, { ...data, updatedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

export async function deleteProgram(id: number): Promise<void> {
  await db.programs.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}
