import { useLiveQuery } from "dexie-react-hooks";
import db, { type AthleteProfile } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** The current user's athlete profile (or undefined if not set up yet). */
export function useAthleteProfile() {
  return useLiveQuery(async () => {
    const all = await db.athleteProfiles.filter((p) => !p.deletedAt).toArray();
    const uid = getCurrentUserIdSync();
    return all.find((p) => !uid || p.userId === uid || p.userId == null);
  }, []);
}

export async function saveAthleteProfile(
  data: Omit<AthleteProfile, "id" | "uuid" | "_dirty" | "createdAt" | "updatedAt">
): Promise<number> {
  const now = new Date().toISOString();
  const uid = getCurrentUserIdSync();
  const existing = (await db.athleteProfiles.toArray()).find(
    (p) => !p.deletedAt && (p.userId === uid || p.userId == null)
  );
  if (existing?.id != null) {
    await db.athleteProfiles.update(existing.id, { ...data, updatedAt: now, _dirty: 1 });
    schedulePush();
    return existing.id;
  }
  const id = (await db.athleteProfiles.add({
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
