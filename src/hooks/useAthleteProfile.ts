import { useLiveQuery } from "dexie-react-hooks";
import db, { type AthleteProfile, type FitnessLevel } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";
import type { Injury } from "@/lib/injuries";

/** The current user's athlete profile (or undefined if not set up yet). */
export function useAthleteProfile() {
  return useLiveQuery(async () => {
    const all = await db.athleteProfiles.filter((p) => !p.deletedAt).toArray();
    const uid = getCurrentUserIdSync();
    return all.find((p) => !uid || p.userId === uid || p.userId == null);
  }, []);
}

/** The profile, or null when there is none; undefined only while it is read. */
export function useAthleteProfileOrNull() {
  return useLiveQuery(async () => {
    const all = await db.athleteProfiles.filter((p) => !p.deletedAt).toArray();
    const uid = getCurrentUserIdSync();
    return all.find((p) => !uid || p.userId === uid || p.userId == null) ?? null;
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

/** Update just the training level on the current profile. */
export async function updateFitnessLevel(fitnessLevel: FitnessLevel): Promise<void> {
  const uid = getCurrentUserIdSync();
  const existing = (await db.athleteProfiles.toArray()).find(
    (p) => !p.deletedAt && (p.userId === uid || p.userId == null)
  );
  if (!existing?.id) return;
  await db.athleteProfiles.update(existing.id, { fitnessLevel, updatedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

/** Update the week plan (training days, usual time), the strength goals, the deload week or the injuries. */
export async function updateTrainingSchedule(change: Partial<Pick<AthleteProfile, "trainingDays" | "trainingTime" | "strengthGoals" | "deloadWeek" | "injuryAreas">>): Promise<void> {
  const uid = getCurrentUserIdSync();
  const existing = (await db.athleteProfiles.toArray()).find(
    (p) => !p.deletedAt && (p.userId === uid || p.userId == null)
  );
  if (!existing?.id) return;
  await db.athleteProfiles.update(existing.id, { ...change, updatedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

/** Update just the daily macro targets on the current profile. */
export async function updateNutritionTargets(
  targets: { calories?: number; protein?: number; carbs?: number; fat?: number; water?: number }
): Promise<void> {
  const uid = getCurrentUserIdSync();
  const existing = (await db.athleteProfiles.toArray()).find(
    (p) => !p.deletedAt && (p.userId === uid || p.userId == null)
  );
  if (!existing?.id) return;
  await db.athleteProfiles.update(existing.id, {
    nutritionTargets: targets,
    updatedAt: new Date().toISOString(),
    _dirty: 1,
  });
  schedulePush();
}

/** The current athlete's injuries in progress; none while the profile is read. */
export function useInjuries(): Injury[] {
  const profile = useAthleteProfile();
  return profile?.injuryAreas ?? NONE;
}
const NONE: Injury[] = [];

/**
 * The injuries of an athlete: a coach reads a client's (their profile is
 * synced to the coach), anyone else their own when no athlete is given.
 */
export function useInjuriesOf(userId: string | null | undefined): Injury[] {
  const injuries = useLiveQuery(async () => {
    const uid = userId ?? getCurrentUserIdSync();
    const all = await db.athleteProfiles.filter((p) => !p.deletedAt).toArray();
    const profile = all.find((p) => p.userId === uid) ?? (userId ? undefined : all.find((p) => p.userId == null));
    return profile?.injuryAreas ?? NONE;
  }, [userId]);
  return injuries ?? NONE;
}
