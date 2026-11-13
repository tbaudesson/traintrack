/** A set as the guided session needs it. */
export interface GuidedSet {
  id: number;
  exerciseId: number;
  setNumber: number;
  isWarmup?: boolean;
}

/**
 * The order the guided session walks through: each exercise's warm-ups, then
 * its working sets; exercises of a superset take turns, round by round
 * (A1, A2, A1, A2…), after their warm-ups.
 */
export function guidedOrder(groups: [number, GuidedSet[]][], supersetOf: (exerciseId: number) => number | null): number[] {
  const order: number[] = [];
  const done = new Set<number>();
  for (const [exerciseId] of groups) {
    if (done.has(exerciseId)) continue;
    const group = supersetOf(exerciseId);
    const members = group === null ? [exerciseId] : groups.map(([id]) => id).filter((id) => supersetOf(id) === group);
    members.forEach((id) => done.add(id));
    const setsOf = (id: number) => groups.find(([g]) => g === id)?.[1] ?? [];
    for (const id of members) {
      order.push(...setsOf(id).filter((s) => s.isWarmup).sort((a, b) => a.setNumber - b.setNumber).map((s) => s.id));
    }
    const work = members.map((id) => setsOf(id).filter((s) => !s.isWarmup).sort((a, b) => a.setNumber - b.setNumber));
    const rounds = Math.max(0, ...work.map((w) => w.length));
    for (let r = 0; r < rounds; r++) for (const w of work) if (w[r]) order.push(w[r].id);
  }
  return order;
}

/** The step to show: the one chosen, or the first set not done yet. */
export function guidedCursor(order: number[], completed: Set<number>, chosen: number | null): number | null {
  if (chosen !== null && order.includes(chosen)) return chosen;
  return order.find((id) => !completed.has(id)) ?? null;
}
