import { useLiveQuery } from "dexie-react-hooks";
import db, { getCurrentUserIdSync, type CompetitionResult } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** One athlete's competition results (the current user by default), most recent first. */
export function useCompetitions(userId?: string) {
  return (
    useLiveQuery(async () => {
      const uid = userId ?? getCurrentUserIdSync();
      const all = await db.competitionResults.filter((r) => !r.deletedAt && (!uid || r.userId === uid)).toArray();
      return all.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
    }, [userId]) ?? []
  );
}

type Fields = Omit<CompetitionResult, "id" | "uuid" | "userId" | "_dirty" | "createdAt" | "updatedAt" | "deletedAt">;

export async function saveCompetition(fields: Fields, id?: number): Promise<number> {
  const now = new Date().toISOString();
  if (id) {
    await db.competitionResults.update(id, { ...fields, updatedAt: now, _dirty: 1 });
    schedulePush();
    return id;
  }
  const newId = (await db.competitionResults.add({
    ...fields,
    uuid: crypto.randomUUID(),
    userId: getCurrentUserIdSync(),
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return newId;
}

export async function deleteCompetition(id: number): Promise<void> {
  await db.competitionResults.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}
