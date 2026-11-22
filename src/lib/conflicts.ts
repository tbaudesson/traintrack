import type { Exercise, MuscleGroup, ProgramDay } from "@/db";
import { findExercise } from "./exerciseMatch";

/**
 * Two sessions too close for the same muscles: a muscle group worked hard
 * (six working sets or more) on two days less than 48 hours apart. Strength
 * days only; the core, the whole body and "other" are left aside (trained
 * often, and lightly). Pure.
 */

export const HARD_SETS = 6;
const SKIP: MuscleGroup[] = ["core", "full_body", "other"];
const DAY_MS = 86_400_000;
const daysApart = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS;

type Ex = Pick<Exercise, "name" | "uuid" | "isCustom" | "muscleGroup"> & Partial<Pick<Exercise, "nameFr" | "nameDe">>;

/** The muscle groups a day works hard. */
export function hardGroups(day: Pick<ProgramDay, "exercises" | "cardio">, exercises: Ex[]): MuscleGroup[] {
  if (day.cardio) return [];
  const sets = new Map<MuscleGroup, number>();
  for (const pe of day.exercises) {
    const group = findExercise(exercises, pe.exerciseName, pe.exerciseUuid)?.muscleGroup;
    if (!group || SKIP.includes(group)) continue;
    sets.set(group, (sets.get(group) ?? 0) + (pe.targetSets || 0));
  }
  return [...sets].filter(([, n]) => n >= HARD_SETS).map(([g]) => g);
}

export interface Conflict {
  first: { date: string; label: string };
  second: { date: string; label: string };
  groups: MuscleGroup[];
}

/** The pairs of sessions, in date order, that work the same muscles hard less than two days apart. */
export function sessionConflicts(sessions: { date: string; label: string; day: Pick<ProgramDay, "exercises" | "cardio"> | undefined }[], exercises: Ex[]): Conflict[] {
  const withGroups = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ ...s, groups: s.day ? hardGroups(s.day, exercises) : [] }))
    .filter((s) => s.groups.length);
  const out: Conflict[] = [];
  for (let i = 0; i < withGroups.length; i++) {
    for (let j = i + 1; j < withGroups.length; j++) {
      const a = withGroups[i];
      const b = withGroups[j];
      if (daysApart(a.date, b.date) >= 2) break;
      if (a.date === b.date) continue;
      const shared = a.groups.filter((g) => b.groups.includes(g));
      if (shared.length) out.push({ first: { date: a.date, label: a.label }, second: { date: b.date, label: b.label }, groups: shared });
    }
  }
  return out;
}
