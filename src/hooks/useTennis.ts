import { useLiveQuery } from "dexie-react-hooks";
import db, { getCurrentUserIdSync, type TennisDrill, type TennisGroup, type TennisLesson } from "@/db";
import { schedulePush } from "@/lib/syncEngine";
import { supabase } from "@/lib/supabase";

const now = () => new Date().toISOString();
const fresh = () => ({ uuid: crypto.randomUUID(), userId: getCurrentUserIdSync(), _dirty: 1, createdAt: now(), updatedAt: now() });
const mine = (row: { deletedAt?: string | null; userId?: string | null }) => {
  const uid = getCurrentUserIdSync();
  return !row.deletedAt && (!uid || row.userId === uid);
};

/** One's tennis groups, by name (the archived ones too: the page sets them apart). */
export function useTennisGroups(): TennisGroup[] | undefined {
  return useLiveQuery(async () => (await db.tennisGroups.filter(mine).toArray()).sort((a, b) => a.name.localeCompare(b.name)), []);
}

export function useTennisGroup(id: number | undefined): TennisGroup | null | undefined {
  return useLiveQuery(async () => {
    const g = id ? await db.tennisGroups.get(id) : undefined;
    return g && !g.deletedAt ? g : null;
  }, [id]);
}

/** One's lessons, a group's when given, most recent first. */
export function useTennisLessons(groupId?: number): TennisLesson[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.tennisLessons.filter((l) => mine(l) && (groupId === undefined || l.groupId === groupId)).toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
  }, [groupId]);
}

export function useTennisLesson(id: number | undefined): TennisLesson | null | undefined {
  return useLiveQuery(async () => {
    const l = id ? await db.tennisLessons.get(id) : undefined;
    return l && !l.deletedAt ? l : null;
  }, [id]);
}

/** The library and one's own drills (another coach's never show). */
export function useTennisDrills(): TennisDrill[] | undefined {
  return useLiveQuery(async () => {
    const uid = getCurrentUserIdSync();
    return db.tennisDrills.filter((d) => !d.deletedAt && (!d.userId || !uid || d.userId === uid)).toArray();
  }, []);
}

export async function saveTennisGroup(fields: Pick<TennisGroup, "name" | "ageBand" | "level" | "slots" | "players" | "notes"> & { archivedAt?: string | null }, id?: number): Promise<number> {
  if (id) await db.tennisGroups.update(id, { ...fields, updatedAt: now(), _dirty: 1 });
  else id = (await db.tennisGroups.add({ ...fields, ...fresh() } as TennisGroup)) as number;
  schedulePush();
  return id;
}

/** A group removed, with its lessons. */
export async function deleteTennisGroup(id: number): Promise<void> {
  const at = now();
  await db.transaction("rw", db.tennisGroups, db.tennisLessons, async () => {
    await db.tennisGroups.update(id, { deletedAt: at, updatedAt: at, _dirty: 1 });
    await db.tennisLessons.where("groupId").equals(id).modify({ deletedAt: at, updatedAt: at, _dirty: 1 });
  });
  schedulePush();
}

export async function addTennisLesson(fields: Pick<TennisLesson, "groupId" | "date" | "plan"> & Partial<Pick<TennisLesson, "theme">>): Promise<number> {
  const id = (await db.tennisLessons.add({ theme: null, ...fields, ...fresh() } as TennisLesson)) as number;
  schedulePush();
  return id;
}

export async function updateTennisLesson(id: number, fields: Partial<Pick<TennisLesson, "date" | "theme" | "plan" | "givenAt" | "present" | "intensity" | "notes">>): Promise<void> {
  await db.tennisLessons.update(id, { ...fields, updatedAt: now(), _dirty: 1 });
  schedulePush();
}

export async function deleteTennisLesson(id: number): Promise<void> {
  await db.tennisLessons.update(id, { deletedAt: now(), updatedAt: now(), _dirty: 1 });
  schedulePush();
}

export type DrillFields = Pick<TennisDrill, "name" | "description" | "category" | "minutes" | "ages" | "equipment"> &
  Partial<Pick<TennisDrill, "nameFr" | "nameDe" | "descriptionFr" | "descriptionDe">>;

/** One's own drill, added or changed. */
export async function saveOwnDrill(fields: DrillFields, id?: number): Promise<number> {
  if (id) await db.tennisDrills.update(id, { ...fields, updatedAt: now(), _dirty: 1 });
  else id = (await db.tennisDrills.add({ ...fields, ...fresh() } as TennisDrill)) as number;
  schedulePush();
  return id;
}

export async function deleteOwnDrill(id: number): Promise<void> {
  await db.tennisDrills.update(id, { deletedAt: now(), updatedAt: now(), _dirty: 1 });
  schedulePush();
}

/**
 * An admin keeps the library: online only, through the server (the library's
 * rows belong to no one), then the copy on this device follows.
 */
export async function adminSaveLibraryDrill(fields: DrillFields, drill?: TennisDrill, remove = false): Promise<void> {
  const { data, error } = await supabase.rpc("admin_save_tennis_drill", {
    p_uuid: drill?.uuid ?? null,
    p_drill: {
      name: fields.name,
      name_fr: fields.nameFr ?? "",
      name_de: fields.nameDe ?? "",
      description: fields.description ?? "",
      description_fr: fields.descriptionFr ?? "",
      description_de: fields.descriptionDe ?? "",
      category: fields.category,
      minutes: fields.minutes,
      ages: fields.ages,
      equipment: fields.equipment,
      deleted: remove,
    },
  });
  if (error) throw new Error(error.message);
  const at = now();
  if (drill?.id) await db.tennisDrills.update(drill.id, { ...fields, ...(remove ? { deletedAt: at } : {}), updatedAt: at, _dirty: 0 });
  else if (data) await db.tennisDrills.add({ ...fields, uuid: String(data), userId: null, _dirty: 0, createdAt: at, updatedAt: at } as TennisDrill);
}
