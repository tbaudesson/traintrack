import { useLiveQuery } from "dexie-react-hooks";
import db, { type BodyMetric } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

export function useBodyMetrics(userId?: string) {
  return useLiveQuery(async () => {
    const uid = userId ?? getCurrentUserIdSync();
    const all = await db.bodyMetrics.filter((m) => !m.deletedAt).toArray();
    const mine = uid ? all.filter((m) => m.userId === uid) : all;
    return mine.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [userId]) ?? [];
}

export async function addBodyMetric(data: {
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  measurements?: Record<string, number>;
  notes?: string;
}): Promise<number> {
  const now = new Date().toISOString();
  const id = (await db.bodyMetrics.add({
    ...data,
    uuid: crypto.randomUUID(),
    userId: getCurrentUserIdSync(),
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

export async function updateBodyMetric(id: number, data: Partial<BodyMetric>): Promise<void> {
  await db.bodyMetrics.update(id, { ...data, updatedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

export async function deleteBodyMetric(id: number): Promise<void> {
  await db.bodyMetrics.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}
