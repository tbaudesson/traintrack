import { useLiveQuery } from "dexie-react-hooks";
import db, { type HydrationLog } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

/** Today's hydration log for the current user (or undefined). */
export function useTodayHydration(date = todayStr()) {
  return useLiveQuery(async () => {
    const uid = getCurrentUserIdSync();
    const all = await db.hydrationLogs.filter((h) => !h.deletedAt && h.date === date).toArray();
    return all.find((h) => !uid || h.userId === uid || h.userId == null);
  }, [date]);
}

async function upsertToday(date: string, mutate: (current: number) => number): Promise<void> {
  const now = new Date().toISOString();
  const uid = getCurrentUserIdSync();
  const existing = (await db.hydrationLogs.toArray()).find(
    (h) => !h.deletedAt && h.date === date && (h.userId === uid || h.userId == null)
  );
  const next = Math.max(0, Math.round(mutate(existing?.ml ?? 0)));
  if (existing?.id != null) {
    await db.hydrationLogs.update(existing.id, { ml: next, updatedAt: now, _dirty: 1 });
  } else {
    await db.hydrationLogs.add({
      date,
      ml: next,
      uuid: crypto.randomUUID(),
      userId: uid,
      _dirty: 1,
      createdAt: now,
      updatedAt: now,
    } as HydrationLog);
  }
  schedulePush();
}

/** Add (or subtract) millilitres to today's total. */
export async function addWater(ml: number, date = todayStr()): Promise<void> {
  await upsertToday(date, (cur) => cur + ml);
}

/** Set today's total to an exact value. */
export async function setWater(ml: number, date = todayStr()): Promise<void> {
  await upsertToday(date, () => ml);
}
