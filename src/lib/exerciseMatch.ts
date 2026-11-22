import type { Exercise } from "@/db";

type Ex = Pick<Exercise, "name"> & Partial<Pick<Exercise, "uuid" | "isCustom" | "nameFr" | "nameDe">>;

/** Case, accents and spacing set aside: "Développé couché" matches "developpe  couche". */
export const nameKey = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * The exercise a program line points to: by its id first, then the library's
 * exercise of that name (in any language), then one's own of that name. A
 * copy is made only when none is found, so a name typed in French or with
 * other capitals no longer makes a second "Back Squat".
 */
export function findExercise<E extends Ex>(exercises: E[], name: string, uuid?: string | null): E | undefined {
  if (uuid) {
    const byId = exercises.find((e) => e.uuid === uuid);
    if (byId) return byId;
  }
  const key = nameKey(name);
  if (!key) return undefined;
  const named = (e: E) => [e.name, e.nameFr, e.nameDe].some((n) => nameKey(n) === key);
  return exercises.find((e) => !e.isCustom && named(e)) ?? exercises.find((e) => e.isCustom && named(e));
}
