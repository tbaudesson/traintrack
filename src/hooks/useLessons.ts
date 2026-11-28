import { useLiveQuery } from "dexie-react-hooks";
import db, { getCurrentUserIdSync, type Exercise, type GroupLesson, type LessonGroup } from "@/db";
import { schedulePush } from "@/lib/syncEngine";
import { supabase } from "@/lib/supabase";
import { unspecifiedGroup } from "@/lib/muscles";

const now = () => new Date().toISOString();
const fresh = () => ({ uuid: crypto.randomUUID(), userId: getCurrentUserIdSync(), _dirty: 1, createdAt: now(), updatedAt: now() });
const mine = (row: { deletedAt?: string | null; userId?: string | null }) => {
  const uid = getCurrentUserIdSync();
  return !row.deletedAt && (!uid || row.userId === uid);
};

/** One's lesson groups, by name (the archived ones too: the page sets them apart). */
export function useLessonGroups(): LessonGroup[] | undefined {
  return useLiveQuery(async () => (await db.lessonGroups.filter(mine).toArray()).sort((a, b) => a.name.localeCompare(b.name)), []);
}

export function useLessonGroup(id: number | undefined): LessonGroup | null | undefined {
  return useLiveQuery(async () => {
    const g = id ? await db.lessonGroups.get(id) : undefined;
    return g && !g.deletedAt ? g : null;
  }, [id]);
}

/** One's lessons, a group's when given, most recent first. */
export function useGroupLessons(groupId?: number): GroupLesson[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.groupLessons.filter((l) => mine(l) && (groupId === undefined || l.groupId === groupId)).toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
  }, [groupId]);
}

export function useGroupLesson(id: number | undefined): GroupLesson | null | undefined {
  return useLiveQuery(async () => {
    const l = id ? await db.groupLessons.get(id) : undefined;
    return l && !l.deletedAt ? l : null;
  }, [id]);
}

export async function saveLessonGroup(
  fields: Pick<LessonGroup, "sport" | "name" | "ageBand" | "level" | "slots" | "players" | "description"> & { archivedAt?: string | null },
  id?: number
): Promise<number> {
  if (id) await db.lessonGroups.update(id, { ...fields, kind: "lessons", updatedAt: now(), _dirty: 1 });
  else id = (await db.lessonGroups.add({ ...fields, kind: "lessons", ...fresh() } as LessonGroup)) as number;
  schedulePush();
  return id;
}

/** A group removed, with its lessons. */
export async function deleteLessonGroup(id: number): Promise<void> {
  const at = now();
  await db.transaction("rw", db.lessonGroups, db.groupLessons, async () => {
    await db.lessonGroups.update(id, { deletedAt: at, updatedAt: at, _dirty: 1 });
    await db.groupLessons.where("groupId").equals(id).modify({ deletedAt: at, updatedAt: at, _dirty: 1 });
  });
  schedulePush();
}

export async function addGroupLesson(fields: Pick<GroupLesson, "groupId" | "date" | "plan"> & Partial<Pick<GroupLesson, "theme">>): Promise<number> {
  const id = (await db.groupLessons.add({ theme: null, ...fields, ...fresh() } as GroupLesson)) as number;
  schedulePush();
  return id;
}

export async function updateGroupLesson(
  id: number,
  fields: Partial<Pick<GroupLesson, "date" | "theme" | "plan" | "givenAt" | "present" | "intensity" | "notes" | "horseId" | "horseSessionId">>
): Promise<void> {
  await db.groupLessons.update(id, { ...fields, updatedAt: now(), _dirty: 1 });
  schedulePush();
}

export async function deleteGroupLesson(id: number): Promise<void> {
  await db.groupLessons.update(id, { deletedAt: now(), updatedAt: now(), _dirty: 1 });
  schedulePush();
}

/** What makes an exercise one for lessons: its sport, theme, minutes, ages and kit. */
export type LessonFields = Pick<Exercise, "sport" | "theme" | "minutes" | "ages" | "gear">;

/** One's own exercise made for the lessons of a sport, in the one library. */
export async function addOwnLessonExercise(fields: Pick<Exercise, "name" | "description"> & LessonFields): Promise<number> {
  const id = (await db.exercises.add({ ...fields, muscleGroup: unspecifiedGroup() ?? "", isCustom: true, ...fresh() } as Exercise)) as number;
  schedulePush();
  return id;
}

/**
 * An admin sets a library exercise for lessons (all empty: not for lessons):
 * online, through the server (the library's rows belong to no one), then the
 * copy on this device follows.
 */
export async function adminSetExerciseLesson(exercise: Pick<Exercise, "id" | "uuid">, fields: LessonFields): Promise<void> {
  const { error } = await supabase.rpc("admin_set_exercise_lesson", {
    p_uuid: exercise.uuid,
    p_sport: fields.sport ?? "",
    p_theme: fields.theme ?? "",
    p_minutes: fields.minutes ?? null,
    p_ages: fields.ages ?? [],
    p_gear: fields.gear ?? [],
  });
  if (error) throw new Error(error.message);
  if (exercise.id) await db.exercises.update(exercise.id, { ...fields, updatedAt: now(), _dirty: 0 });
}
