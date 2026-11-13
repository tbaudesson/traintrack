/** An exercise of the session, in display order, with its superset if any. */
export interface Slot {
  exerciseId: number;
  group?: number | null;
}

/** The exercises done in a row with this one, in order (itself included). */
export function supersetOf(exerciseId: number, slots: Slot[]): number[] {
  const group = slots.find((s) => s.exerciseId === exerciseId)?.group;
  if (group == null) return [exerciseId];
  return slots.filter((s) => s.group === group).map((s) => s.exerciseId);
}

/** In a superset, the rest only comes after its last exercise. */
export function restsAfter(exerciseId: number, slots: Slot[]): boolean {
  return supersetOf(exerciseId, slots).at(-1) === exerciseId;
}

/** The exercise to go to straight away, if this one is not the last of its superset. */
export function chainedNext(exerciseId: number, slots: Slot[]): number | null {
  const members = supersetOf(exerciseId, slots);
  const i = members.indexOf(exerciseId);
  return i >= 0 && i < members.length - 1 ? members[i + 1] : null;
}

/** The group two neighbouring exercises share once linked. */
export function linkGroup(a: Slot, b: Slot, slots: Slot[]): number {
  if (a.group != null) return a.group;
  if (b.group != null) return b.group;
  return Math.max(0, ...slots.map((s) => s.group ?? 0)) + 1;
}

/**
 * The group each exercise of a program day starts with: "linked to the next"
 * chains an exercise with the one after it.
 */
export function programGroups(linkedToNext: boolean[]): (number | undefined)[] {
  const groups: (number | undefined)[] = [];
  let group = 0;
  linkedToNext.forEach((linked, i) => {
    const continues = i > 0 && linkedToNext[i - 1];
    if (!continues && linked) group++;
    groups.push(linked || continues ? group : undefined);
  });
  return groups;
}

/**
 * Cut a superset between an exercise and the one after it. Each side keeps a
 * group only if it still holds two exercises or more.
 */
export function unlinkAfter(exerciseId: number, slots: Slot[]): Map<number, number | null> {
  const members = supersetOf(exerciseId, slots);
  const cut = members.indexOf(exerciseId) + 1;
  const before = members.slice(0, cut);
  const after = members.slice(cut);
  const group = slots.find((s) => s.exerciseId === exerciseId)?.group ?? null;
  const fresh = Math.max(0, ...slots.map((s) => s.group ?? 0)) + 1;
  const changes = new Map<number, number | null>();
  for (const id of before) changes.set(id, before.length > 1 ? group : null);
  for (const id of after) changes.set(id, after.length > 1 ? fresh : null);
  return changes;
}
