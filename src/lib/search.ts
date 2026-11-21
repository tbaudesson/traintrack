/**
 * Instant search shared by the pickers: accents and case ignored, every word
 * typed must appear somewhere ("dev couch halt" finds "Développé couché aux
 * haltères"), names before descriptions.
 */

/** Lower case, without accents, apostrophes and dashes made spaces. */
export function fold(text: string | null | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'\-_/().,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The words of a query, folded. */
export const words = (query: string): string[] => fold(query).split(" ").filter(Boolean);

/**
 * How well a thing matches the words: null when a word is missing, else a
 * score, lower is better (a name starting with the query first, then a name
 * holding every word, then a match that needs the other texts).
 */
export function matchScore(q: string[], names: (string | null | undefined)[], others: (string | null | undefined)[] = []): number | null {
  if (!q.length) return 0;
  const n = names.map(fold).filter(Boolean);
  const all = [...n, ...others.map(fold)].join(" | ");
  if (!q.every((w) => all.includes(w))) return null;
  const phrase = q.join(" ");
  if (n.some((x) => x.startsWith(phrase))) return 0;
  if (n.some((x) => x.split(" ").some((part) => part.startsWith(q[0])) && q.every((w) => x.includes(w)))) return 1;
  if (n.some((x) => q.every((w) => x.includes(w)))) return 2;
  return 3;
}

/** The items matching the query, best first, the original order kept among equals. */
export function search<T>(items: T[], query: string, texts: (item: T) => { names: (string | null | undefined)[]; others?: (string | null | undefined)[] }): T[] {
  const q = words(query);
  if (!q.length) return items;
  return items
    .map((item, i) => ({ item, i, score: matchScore(q, texts(item).names, texts(item).others) }))
    .filter((x): x is { item: T; i: number; score: number } => x.score !== null)
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map((x) => x.item);
}

/**
 * The exercises last used, most recent first: from the sets of the sessions,
 * latest session first, each exercise once.
 */
export function recentExerciseIds(sets: { exerciseId: number; workoutId: number }[], workouts: { id?: number; date: string }[], limit = 8): number[] {
  const dateOf = new Map(workouts.map((w) => [w.id, w.date]));
  const sorted = [...sets].sort((a, b) => (dateOf.get(b.workoutId) ?? "").localeCompare(dateOf.get(a.workoutId) ?? "") || b.workoutId - a.workoutId);
  const out: number[] = [];
  for (const s of sorted) {
    if (!out.includes(s.exerciseId)) out.push(s.exerciseId);
    if (out.length >= limit) break;
  }
  return out;
}
