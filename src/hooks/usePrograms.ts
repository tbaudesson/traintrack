import { useLiveQuery } from "dexie-react-hooks";
import db, { type Program, type ProgramDay } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";
import { reviseProgram, withDayKeys } from "@/lib/planSnapshot";
import { canEditProgram } from "@/lib/programOrigin";

/** Programs owned by, or assigned to, the current user. */
export function usePrograms() {
  return useProgramsRead() ?? [];
}

/** The same, undefined while they are read from the device. */
export function useProgramsRead(): Program[] | undefined {
  return useLiveQuery(async () => {
    const uid = getCurrentUserIdSync();
    const all = await db.programs.filter((p) => !p.deletedAt).toArray();
    if (!uid) return all;
    return all.filter(
      (p) => p.userId === uid || p.ownerUserId === uid || p.assignedToUserId === uid
    );
  }, []);
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
    structure: withDayKeys(data.structure ?? []),
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
  return trainableOf(usePrograms());
}

/** Of the user's programs, those trained on (see useTrainablePrograms). */
export function trainableOf(programs: Program[]): Program[] {
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
      // The client's days keep their own keys, so their past sessions stay tied to them.
      const structure = model.structure.map((d, i) => ({ ...d, key: existing.structure?.[i]?.key }));
      await updateProgram(existing.id, { description: model.description, structure, startDate: startDate ?? existing.startDate ?? null });
      updated++;
    } else {
      await createProgram({ ...model, assignedToUserId: member.userId, groupId: member.groupId, startDate: startDate ?? null });
      created++;
    }
  }
  return { created, updated };
}

/**
 * Save changes to a program. A new name or new days keep the version before
 * them (at most a few), and every day gets its key.
 */
export async function updateProgram(id: number, data: Partial<Program>): Promise<boolean> {
  const now = new Date().toISOString();
  const patch: Partial<Program> = { ...data };
  const before = await db.programs.get(id);
  // Someone else's program (a coach's, given to this client): never changed here.
  if (!before || !canEditProgram(before, getCurrentUserIdSync())) return false;
  if (data.structure !== undefined || data.name !== undefined) {
    if (data.structure) patch.structure = withDayKeys(data.structure);
    const revisions = reviseProgram(before, patch, now);
    if (revisions) patch.revisions = revisions;
  }
  await db.programs.update(id, { ...patch, updatedAt: now, _dirty: 1 });
  schedulePush();
  return true;
}

export async function deleteProgram(id: number): Promise<boolean> {
  const before = await db.programs.get(id);
  if (!before || !canEditProgram(before, getCurrentUserIdSync())) return false;
  await db.programs.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
  return true;
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
