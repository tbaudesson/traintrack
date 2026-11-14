import { useLiveQuery } from "dexie-react-hooks";
import db, { getCurrentUserIdSync, type Horse, type HorseSession } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** One person's horses (the current user by default), by name. */
export function useHorses(userId?: string) {
  return (
    useLiveQuery(async () => {
      const uid = userId ?? getCurrentUserIdSync();
      const all = await db.horses.filter((h) => !h.deletedAt && (!uid || h.userId === uid)).toArray();
      return all.sort((a, b) => a.name.localeCompare(b.name));
    }, [userId]) ?? []
  );
}

/** The work logged on those horses, most recent first. */
export function useHorseSessions(userId?: string) {
  return (
    useLiveQuery(async () => {
      const uid = userId ?? getCurrentUserIdSync();
      const all = await db.horseSessions.filter((s) => !s.deletedAt && (!uid || s.userId === uid)).toArray();
      return all.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
    }, [userId]) ?? []
  );
}

const now = () => new Date().toISOString();
const fresh = () => ({ uuid: crypto.randomUUID(), userId: getCurrentUserIdSync(), _dirty: 1, createdAt: now(), updatedAt: now() });

export async function saveHorse(fields: Pick<Horse, "name" | "weeklyLimitMin" | "notes">, id?: number): Promise<number> {
  if (id) await db.horses.update(id, { ...fields, updatedAt: now(), _dirty: 1 });
  else id = (await db.horses.add({ ...fields, ...fresh() } as Horse)) as number;
  schedulePush();
  return id;
}

export async function deleteHorse(id: number): Promise<void> {
  await db.horses.update(id, { deletedAt: now(), _dirty: 1 });
  schedulePush();
}

export async function addHorseSession(fields: Pick<HorseSession, "horseId" | "date" | "walkMin" | "trotMin" | "canterMin" | "notes">): Promise<number> {
  const id = (await db.horseSessions.add({ ...fields, ...fresh() } as HorseSession)) as number;
  schedulePush();
  return id;
}

export async function deleteHorseSession(id: number): Promise<void> {
  await db.horseSessions.update(id, { deletedAt: now(), _dirty: 1 });
  schedulePush();
}
