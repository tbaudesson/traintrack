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
  startDate?: string | null;
  weekdays?: number[] | null;
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
    startDate: data.startDate ?? null,
    weekdays: data.weekdays?.length ? data.weekdays : null,
    uuid: crypto.randomUUID(),
    userId: uid,
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

/** The programs this user trains on: not the copies they assigned to clients, nor those archived. */
export function useTrainablePrograms() {
  const programs = usePrograms();
  const uid = getCurrentUserIdSync();
  return programs.filter((p) => (!p.assignedToUserId || p.assignedToUserId === uid) && !p.archivedAt);
}

/**
 * Give each client their own copy of a program. Assigning again refreshes the
 * copies already handed out, so a client never ends up with two versions.
 */
export async function assignProgramToClients(
  model: Pick<Program, "name" | "description" | "structure">,
  members: { userId: string; groupId: string }[],
  startDate?: string | null
): Promise<{ created: number; updated: number }> {
  const uid = getCurrentUserIdSync();
  let created = 0;
  let updated = 0;
  for (const member of members) {
    const existing = await db.programs
      .filter((p) => !p.deletedAt && p.ownerUserId === uid && p.assignedToUserId === member.userId && p.name === model.name)
      .first();
    if (existing?.id) {
      await updateProgram(existing.id, { description: model.description, structure: model.structure, startDate: startDate ?? existing.startDate ?? null });
      updated++;
    } else {
      await createProgram({ ...model, assignedToUserId: member.userId, groupId: member.groupId, startDate: startDate ?? null });
      created++;
    }
  }
  return { created, updated };
}

export async function updateProgram(id: number, data: Partial<Program>): Promise<void> {
  await db.programs.update(id, { ...data, updatedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

export async function deleteProgram(id: number): Promise<void> {
  await db.programs.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

/**
 * A copy of a program to change freely: the original, its sessions and its
 * history stay as they are. Not planned, not a favourite: a fresh start.
 */
export async function duplicateProgram(program: Program, name: string): Promise<number> {
  return createProgram({ name, description: program.description, structure: structuredClone(program.structure ?? []) });
}

export const setProgramFavorite = (id: number, favorite: boolean) => updateProgram(id, { favorite });

/** Archived, a program leaves the planning and the picker; brought back, it returns as it was. */
export const setProgramArchived = (id: number, archived: boolean) => updateProgram(id, { archivedAt: archived ? new Date().toISOString() : null });
