import type { Workout } from "@/db";

/**
 * Suggestions drawn from what the athlete did, never from guesses: the
 * exercises they usually do alongside those of the session, the session they
 * did on this weekday lately, and the sports they actually train.
 */

/**
 * The exercises most often done in the same sessions as these, best first:
 * counted over the athlete's sessions holding at least one of them, those
 * already in the session left out. Done once together is not a habit: two at least.
 */
export function companions(current: number[], sets: { workoutId: number; exerciseId: number }[], limit = 5): number[] {
  if (!current.length) return [];
  const byWorkout = new Map<number, Set<number>>();
  for (const s of sets) (byWorkout.get(s.workoutId) ?? byWorkout.set(s.workoutId, new Set()).get(s.workoutId)!).add(s.exerciseId);
  const counts = new Map<number, number>();
  for (const ids of byWorkout.values()) {
    if (!current.some((c) => ids.has(c))) continue;
    for (const id of ids) if (!current.includes(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([id]) => id);
}

const weekday = (date: string) => new Date(`${date}T12:00:00`).getDay();
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);

/**
 * The strength session done on this weekday in the last four weeks, the
 * latest, when it had work done: "like last Tuesday". None when it is the
 * one already offered as "the last session again".
 */
export function sameWeekday<W extends Pick<Workout, "id" | "date" | "kind">>(
  workouts: W[],
  sets: { workoutId: number; completed: boolean; isWarmup?: boolean }[],
  today: string,
  already?: Pick<Workout, "id">
): W | undefined {
  const withWork = new Set(sets.filter((s) => s.completed && !s.isWarmup).map((s) => s.workoutId));
  return [...workouts]
    .filter((w) => w.kind !== "cardio" && w.kind !== "interval" && w.id !== undefined && withWork.has(w.id) && w.id !== already?.id)
    .filter((w) => w.date < today && daysBetween(w.date, today) <= 28 && weekday(w.date) === weekday(today))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** The shelves the athlete trains on, most sessions first, from the shelves of their sessions' programs. */
export function practisedShelves<S extends string>(workouts: Pick<Workout, "programId">[], shelfOf: (programId: number) => S | null): S[] {
  const counts = new Map<S, number>();
  for (const w of workouts) {
    const shelf = w.programId ? shelfOf(w.programId) : null;
    if (shelf) counts.set(shelf, (counts.get(shelf) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
}

/** Sessions grouped by month ("2026-11"), newest month and newest session first. */
export function byMonth<W extends Pick<Workout, "date" | "id">>(workouts: W[]): { month: string; items: W[] }[] {
  const out = new Map<string, W[]>();
  for (const w of [...workouts].sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))) {
    const m = w.date.slice(0, 7);
    (out.get(m) ?? out.set(m, []).get(m)!).push(w);
  }
  return [...out.entries()].map(([month, items]) => ({ month, items }));
}

/** The weeks of a month for a calendar, Monday first: dates, or null outside the month. */
export function monthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

/** The month before or after ("2026-11" → "2026-12"). */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
