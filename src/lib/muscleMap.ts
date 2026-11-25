import type { Exercise, Muscle, MuscleGroup } from "@/db";
import { MUSCLE_GROUPS } from "./muscles";

/**
 * The muscles of the body map, finer than the six groups: each belongs to one
 * group (so the groups keep working) and is drawn on the front, the back or
 * both. The library says which ones each exercise works (migration 086, an
 * admin edits them); an exercise without them (a custom one) is read from its
 * groups.
 */
export interface MuscleDef {
  id: Muscle;
  group: Exclude<MuscleGroup, "full_body" | "other">;
  views: readonly ("front" | "back")[];
}

export const MUSCLES: readonly MuscleDef[] = [
  { id: "chest", group: "chest", views: ["front"] },
  { id: "front_delts", group: "shoulders", views: ["front"] },
  { id: "side_delts", group: "shoulders", views: ["front", "back"] },
  { id: "rear_delts", group: "shoulders", views: ["back"] },
  { id: "biceps", group: "arms", views: ["front"] },
  { id: "triceps", group: "arms", views: ["back"] },
  { id: "forearms", group: "arms", views: ["front", "back"] },
  { id: "abs", group: "core", views: ["front"] },
  { id: "obliques", group: "core", views: ["front", "back"] },
  { id: "traps", group: "back", views: ["back"] },
  { id: "lats", group: "back", views: ["back"] },
  { id: "lower_back", group: "back", views: ["back"] },
  { id: "glutes", group: "legs", views: ["back"] },
  { id: "quads", group: "legs", views: ["front"] },
  { id: "hamstrings", group: "legs", views: ["back"] },
  { id: "adductors", group: "legs", views: ["front"] },
  { id: "calves", group: "legs", views: ["front", "back"] },
];

export const MUSCLE_IDS: readonly Muscle[] = MUSCLES.map((m) => m.id);
export const isMuscle = (v: unknown): v is Muscle => MUSCLE_IDS.includes(v as Muscle);
export const groupOf = (m: Muscle) => MUSCLES.find((d) => d.id === m)!.group;
/** The muscles of a group; a full-body exercise works them all. */
export const musclesOfGroup = (g: MuscleGroup): Muscle[] =>
  g === "full_body" ? [...MUSCLE_IDS] : MUSCLES.filter((m) => m.group === g).map((m) => m.id);

export type MuscleRole = "target" | "assist";
type Ex = Pick<Exercise, "muscleGroup" | "secondaryMuscles" | "targetMuscles" | "assistMuscles">;

/**
 * What an exercise works: its muscles as the library says, else read from its
 * groups (the main group's muscles as worked, a full-body one's and the other
 * groups' as worked too).
 */
export function musclesOf(ex: Ex): Map<Muscle, MuscleRole> {
  const out = new Map<Muscle, MuscleRole>();
  const target = ex.targetMuscles?.filter(isMuscle) ?? [];
  if (target.length) {
    for (const m of ex.assistMuscles?.filter(isMuscle) ?? []) out.set(m, "assist");
    for (const m of target) out.set(m, "target");
    return out;
  }
  for (const g of ex.secondaryMuscles ?? []) for (const m of musclesOfGroup(g)) out.set(m, "assist");
  if (ex.muscleGroup === "full_body") {
    for (const m of MUSCLE_IDS) out.set(m, "assist");
  } else {
    for (const m of musclesOfGroup(ex.muscleGroup)) out.set(m, "target");
  }
  return out;
}

/** The body map as a filter: each muscle wanted, ruled out, or left as it is. */
export type MuscleChoice = "in" | "out";
export type MuscleSelection = Partial<Record<Muscle, MuscleChoice>>;

/** A tap on a muscle: wanted, then ruled out, then left as it is. */
export const nextChoice = (c: MuscleChoice | undefined): MuscleChoice | undefined => (c === undefined ? "in" : c === "in" ? "out" : undefined);

export const wanted = (s: MuscleSelection) => MUSCLE_IDS.filter((m) => s[m] === "in");
export const ruledOut = (s: MuscleSelection) => MUSCLE_IDS.filter((m) => s[m] === "out");

/**
 * The exercises for a selection: those working a muscle wanted (all of them
 * when none is), without those that mainly work a muscle ruled out; the ones
 * that mainly work what is wanted first, then those that work it too.
 */
export function matchExercises<T extends Ex>(exercises: T[], s: MuscleSelection): { exercise: T; role: MuscleRole | null }[] {
  const ins = wanted(s);
  const outs = ruledOut(s);
  const rows: { exercise: T; role: MuscleRole | null; score: number }[] = [];
  for (const exercise of exercises) {
    const worked = musclesOf(exercise);
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
export function muscleLoad(entries: { exercise: Ex; amount: number }[]): Map<Muscle, number> {
  const sum = new Map<Muscle, number>();
  for (const { exercise, amount } of entries) {
    if (!(amount > 0)) continue;
    for (const [m, role] of musclesOf(exercise)) sum.set(m, (sum.get(m) ?? 0) + amount * (role === "target" ? 1 : 0.5));
  }
  const top = Math.max(0, ...sum.values());
  return new Map([...sum].filter(([, v]) => v > 0).map(([m, v]) => [m, v / top]));
}

/** The groups in their usual order, each with its muscles: the list beside the drawing. */
export const MUSCLES_BY_GROUP = MUSCLE_GROUPS.filter((g) => g !== "full_body" && g !== "other").map((g) => ({
  group: g,
  muscles: MUSCLES.filter((m) => m.group === g).map((m) => m.id),
}));
