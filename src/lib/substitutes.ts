import type { Equipment, Exercise } from "@/db";

/**
 * Exercises that can stand in for another when its machine is taken: the same
 * muscle group, with the equipment the athlete has first, then by name.
 */
export function substitutes<E extends Pick<Exercise, "id" | "name" | "muscleGroup" | "equipment">>(
  current: E | undefined,
  library: E[],
  owned: Equipment[] = []
): E[] {
  if (!current) return [];
  const rank = (e: E) => (e.equipment && owned.includes(e.equipment) ? 0 : 1);
  return library
    .filter((e) => e.id !== current.id && e.muscleGroup === current.muscleGroup)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
