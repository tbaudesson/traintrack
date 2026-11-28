import type { MuscleGroup } from "@/db";

/**
 * The muscle groups of the exercises, as an admin keeps them (app settings
 * "muscle_groups", Admin > Muscle groups): in the order they are shown
 * everywhere (filters, editors, generated sessions), each named in the three
 * languages. Three roles, ticked in the list rather than fixed here:
 * - wholeBody: works every muscle (a circuit, a burpee);
 * - unspecified: the group of an exercise nobody sorted (an import, an
 *   exercise of a program not in the library);
 * - noRecovery: left out of "the same muscles two days running" (trained
 *   often and lightly: the core, the whole body, the unsorted);
 * - endurance: worked by an outing (what to stretch after a run or a ride).
 */
export const MUSCLE_GROUPS_KEY = "muscle_groups";

export interface MuscleGroupDef {
  id: MuscleGroup;
  fr: string;
  en: string;
  de: string;
  wholeBody: boolean;
  unspecified: boolean;
  noRecovery: boolean;
  /** Worked by an endurance outing (a run, a ride): what to stretch after one. */
  endurance: boolean;
}

const ID = /^[a-z0-9_-]{1,30}$/;
/** A group id as kept in a reference (timed sessions, boxing, mobility): its form, the list being the admin's. */
export const isGroupId = (v: unknown): v is MuscleGroup => typeof v === "string" && ID.test(v);
const LABEL = (v: unknown): v is string => typeof v === "string" && !!v.trim() && v.length <= 60;

/** The groups as the admin keeps them; null when the list does not hold together (one unsorted group, at most one whole-body). */
export function parseMuscleGroups(text: string | null | undefined): MuscleGroupDef[] | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as unknown;
    if (!Array.isArray(value) || !value.length || value.length > 40) return null;
    const out: MuscleGroupDef[] = [];
    for (const raw of value as Record<string, unknown>[]) {
      if (!raw || typeof raw !== "object") return null;
      const { id, fr, en, de } = raw;
      if (typeof id !== "string" || !ID.test(id) || out.some((g) => g.id === id)) return null;
      if (!LABEL(fr) || !LABEL(en) || !LABEL(de)) return null;
      out.push({ id, fr: fr.trim(), en: en.trim(), de: de.trim(), wholeBody: raw.wholeBody === true, unspecified: raw.unspecified === true, noRecovery: raw.noRecovery === true, endurance: raw.endurance === true });
    }
    if (out.filter((g) => g.unspecified).length !== 1 || out.filter((g) => g.wholeBody).length > 1) return null;
    return out;
  } catch {
    return null;
  }
}

/** A group's name in the app's language; its id when the list no longer has it. */
export function groupLabel(groups: readonly MuscleGroupDef[] | null | undefined, id: MuscleGroup | null | undefined, locale: string): string {
  if (!id) return "";
  const g = groups?.find((x) => x.id === id);
  if (!g) return id;
  return locale === "fr" ? g.fr : locale === "de" ? g.de : g.en;
}

/** The ids with a role. */
export const wholeBodyIds = (groups: readonly MuscleGroupDef[] | null | undefined) => (groups ?? []).filter((g) => g.wholeBody).map((g) => g.id);
export const noRecoveryIds = (groups: readonly MuscleGroupDef[] | null | undefined) => (groups ?? []).filter((g) => g.noRecovery).map((g) => g.id);
export const unsortedIds = (groups: readonly MuscleGroupDef[] | null | undefined) => (groups ?? []).filter((g) => g.unspecified).map((g) => g.id);
/** The groups a muscle or a restriction belongs to: neither the whole body nor the unsorted. */
export const specificGroups = (groups: readonly MuscleGroupDef[] | null | undefined) => (groups ?? []).filter((g) => !g.wholeBody && !g.unspecified);

const CACHE = `traintrack.guidance.${MUSCLE_GROUPS_KEY}`;

/**
 * The group of an exercise nobody sorted, from the list kept on the device;
 * null before it was ever read (the exercise then has no group until sorted).
 */
export function unspecifiedGroup(): MuscleGroup | null {
  try {
    return parseMuscleGroups(localStorage.getItem(CACHE))?.find((g) => g.unspecified)?.id ?? null;
  } catch {
    return null;
  }
}
