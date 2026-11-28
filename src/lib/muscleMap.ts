import type { Exercise, Muscle, MuscleGroup } from "@/db";
import { MUSCLE_GROUPS } from "./muscles";

/**
 * The muscles of the body map, finer than the groups, as an admin keeps them
 * (app settings "body_muscles", Admin > Body map): each belongs to one group
 * (so the groups keep working) and is named in the three languages. The
 * drawing has a shape for each muscle it knows (bodyShapes); a muscle added
 * without one shows in the lists only. The library says which ones each
 * exercise works (migration 086, an admin edits them); an exercise without
 * them (a custom one) is read from its groups.
 */
export const BODY_MUSCLES_KEY = "body_muscles";

export interface MuscleDef {
  id: Muscle;
  group: Exclude<MuscleGroup, "full_body" | "other">;
  fr: string;
  en: string;
  de: string;
}

const ID = /^[a-z_]{1,30}$/;
const GROUPS = MUSCLE_GROUPS.filter((g) => g !== "full_body" && g !== "other");
const LABEL = (v: unknown): v is string => typeof v === "string" && !!v.trim() && v.length <= 60;

/** The muscles as the admin keeps them; null when the list does not hold together. */
export function parseBodyMuscles(text: string | null | undefined): MuscleDef[] | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as unknown;
    if (!Array.isArray(value) || !value.length || value.length > 60) return null;
    const out: MuscleDef[] = [];
    for (const raw of value as Record<string, unknown>[]) {
      if (!raw || typeof raw !== "object") return null;
      const { id, group, fr, en, de } = raw;
      if (typeof id !== "string" || !ID.test(id) || out.some((m) => m.id === id)) return null;
      if (typeof group !== "string" || !GROUPS.includes(group as MuscleDef["group"])) return null;
      if (!LABEL(fr) || !LABEL(en) || !LABEL(de)) return null;
      out.push({ id, group: group as MuscleDef["group"], fr: fr.trim(), en: en.trim(), de: de.trim() });
    }
    return out;
  } catch {
    return null;
  }
}

/** A muscle's name in the app's language; its id when the list no longer has it. */
export function muscleName(muscles: readonly MuscleDef[], id: Muscle, locale: string): string {
  const m = muscles.find((d) => d.id === id);
  if (!m) return id;
  return locale === "fr" ? m.fr : locale === "de" ? m.de : m.en;
}

/** The muscles of a group; a full-body exercise works them all. */
export const musclesOfGroup = (muscles: readonly MuscleDef[], g: MuscleGroup): Muscle[] =>
  g === "full_body" ? muscles.map((m) => m.id) : muscles.filter((m) => m.group === g).map((m) => m.id);

export type MuscleRole = "target" | "assist";
type Ex = Pick<Exercise, "muscleGroup" | "secondaryMuscles" | "targetMuscles" | "assistMuscles">;

/**
 * What an exercise works: its muscles as the library says, else read from its
 * groups (the main group's muscles as worked, a full-body one's and the other
 * groups' as worked too).
 */
export function musclesOf(ex: Ex, muscles: readonly MuscleDef[]): Map<Muscle, MuscleRole> {
  const out = new Map<Muscle, MuscleRole>();
  const known = (m: unknown): m is Muscle => muscles.some((d) => d.id === m);
  const target = ex.targetMuscles?.filter(known) ?? [];
  if (target.length) {
    for (const m of ex.assistMuscles?.filter(known) ?? []) out.set(m, "assist");
    for (const m of target) out.set(m, "target");
    return out;
  }
  for (const g of ex.secondaryMuscles ?? []) for (const m of musclesOfGroup(muscles, g)) out.set(m, "assist");
  if (ex.muscleGroup === "full_body") {
    for (const m of muscles) out.set(m.id, "assist");
  } else {
    for (const m of musclesOfGroup(muscles, ex.muscleGroup)) out.set(m, "target");
  }
  return out;
}

/** The body map as a filter: each muscle wanted, ruled out, or left as it is. */
export type MuscleChoice = "in" | "out";
export type MuscleSelection = Partial<Record<Muscle, MuscleChoice>>;

/** A tap on a muscle: wanted, then ruled out, then left as it is. */
export const nextChoice = (c: MuscleChoice | undefined): MuscleChoice | undefined => (c === undefined ? "in" : c === "in" ? "out" : undefined);

export const wanted = (s: MuscleSelection) => (Object.keys(s) as Muscle[]).filter((m) => s[m] === "in");
export const ruledOut = (s: MuscleSelection) => (Object.keys(s) as Muscle[]).filter((m) => s[m] === "out");

/**
 * The exercises for a selection: those working a muscle wanted (all of them
 * when none is), without those that mainly work a muscle ruled out; the ones
 * that mainly work what is wanted first, then those that work it too.
 */
export function matchExercises<T extends Ex>(exercises: T[], s: MuscleSelection, muscles: readonly MuscleDef[]): { exercise: T; role: MuscleRole | null }[] {
  const ins = wanted(s);
  const outs = ruledOut(s);
  const rows: { exercise: T; role: MuscleRole | null; score: number }[] = [];
  for (const exercise of exercises) {
    const worked = musclesOf(exercise, muscles);
    if (outs.some((m) => worked.get(m) === "target")) continue;
    if (!ins.length) {
      rows.push({ exercise, role: null, score: 0 });
      continue;
    }
    const targets = ins.filter((m) => worked.get(m) === "target").length;
    const assists = ins.filter((m) => worked.get(m) === "assist").length;
    if (!targets && !assists) continue;
    rows.push({ exercise, role: targets ? "target" : "assist", score: targets * 2 + assists });
  }
  return rows.sort((a, b) => b.score - a.score).map(({ exercise, role }) => ({ exercise, role }));
}

/**
 * How much each muscle works in a session: each exercise's share (its sets,
 * or its seconds) counted whole for its main muscles and half for the others,
 * then scaled so the most worked is 1.
 */
export function muscleLoad(entries: { exercise: Ex; amount: number }[], muscles: readonly MuscleDef[]): Map<Muscle, number> {
  const sum = new Map<Muscle, number>();
  for (const { exercise, amount } of entries) {
    if (!(amount > 0)) continue;
    for (const [m, role] of musclesOf(exercise, muscles)) sum.set(m, (sum.get(m) ?? 0) + amount * (role === "target" ? 1 : 0.5));
  }
  const top = Math.max(0, ...sum.values());
  return new Map([...sum].filter(([, v]) => v > 0).map(([m, v]) => [m, v / top]));
}

/** The groups in their usual order, each with its muscles: the list beside the drawing. */
export const musclesByGroup = (muscles: readonly MuscleDef[]) =>
  GROUPS.map((g) => ({ group: g, muscles: muscles.filter((m) => m.group === g).map((m) => m.id) })).filter((g) => g.muscles.length > 0);
