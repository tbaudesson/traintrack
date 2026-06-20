import { useLiveQuery } from "dexie-react-hooks";
import db, { type ReadinessCheckin } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

/** Readiness check-ins for a user (defaults to current), newest first. */
export function useReadiness(userId?: string) {
  return useLiveQuery(async () => {
    const uid = userId ?? getCurrentUserIdSync();
    const all = await db.readinessCheckins.filter((r) => !r.deletedAt).toArray();
    const mine = uid ? all.filter((r) => r.userId === uid) : all;
    return mine.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [userId]) ?? [];
}

/** Today's check-in for the current user, if any. */
export function useTodayReadiness() {
  return useLiveQuery(async () => {
    const uid = getCurrentUserIdSync();
    const all = await db.readinessCheckins.filter((r) => !r.deletedAt).toArray();
    return all.find((r) => r.date === todayStr() && (!uid || r.userId === uid));
  }, []);
}

export interface ReadinessInput {
  mood?: number;
  energy?: number;
  sleep?: number;
  soreness?: number;
  note?: string;
}

/** Create or update today's readiness check-in. */
export async function saveTodayReadiness(data: ReadinessInput): Promise<number> {
  const now = new Date().toISOString();
  const uid = getCurrentUserIdSync();
  const date = todayStr();
  const existing = (await db.readinessCheckins.toArray()).find(
    (r) => !r.deletedAt && r.date === date && (r.userId === uid || r.userId == null)
  );
  if (existing?.id != null) {
    await db.readinessCheckins.update(existing.id, { ...data, updatedAt: now, _dirty: 1 });
    schedulePush();
    return existing.id;
  }
  const id = (await db.readinessCheckins.add({
    date,
    ...data,
    uuid: crypto.randomUUID(),
    userId: uid,
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

/** 0–100 readiness score (soreness inverted). Null if no signals. */
export function readinessScore(r: Pick<ReadinessCheckin, "mood" | "energy" | "sleep" | "soreness">): number | null {
  const parts: number[] = [];
  if (r.mood) parts.push(r.mood);
  if (r.energy) parts.push(r.energy);
  if (r.sleep) parts.push(r.sleep);
  if (r.soreness) parts.push(6 - r.soreness);
  if (parts.length === 0) return null;
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  return Math.round((avg / 5) * 100);
}
