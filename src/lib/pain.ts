export const PAIN_AREAS = ["shoulder", "elbow", "wrist", "neck", "upper_back", "lower_back", "hip", "knee", "ankle", "other"] as const;
export type PainArea = (typeof PAIN_AREAS)[number];

/** From this level on, the app advises to stop the exercise and see a professional. */
export const SEVERE_PAIN = 7;

export interface PainReport {
  date: string;
  area: PainArea;
  level: number;
  exerciseUuid?: string;
  exerciseName?: string;
  note?: string;
}

const DAY_MS = 86400000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/**
 * Pain reports read from workout notes: only those carrying an area and a
 * level, dated by their session, most recent first.
 */
export function painReports(
  notes: { workoutId: number; userId?: string | null; painArea?: string | null; painLevel?: number | null; exerciseUuid?: string; exerciseName?: string; body?: string; deletedAt?: string | null }[],
  workouts: { id?: number; date: string }[],
  author?: string
): PainReport[] {
  const dates = new Map(workouts.map((w) => [w.id, w.date]));
  return notes
    .filter((n) => !n.deletedAt && n.painArea && n.painLevel && (!author || n.userId === author) && dates.has(n.workoutId))
    .map((n) => ({
      date: dates.get(n.workoutId)!,
      area: n.painArea as PainArea,
      level: n.painLevel!,
      exerciseUuid: n.exerciseUuid,
      exerciseName: n.exerciseName,
      note: n.body || undefined,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.level - a.level);
}

/** The latest pain on an exercise within the last two weeks, to warn before loading it again. */
export function recentPainOn(reports: PainReport[], exercise: { uuid?: string; name?: string }, today: string, days = 14): PainReport | undefined {
  return reports.find(
    (r) =>
      ((exercise.uuid && r.exerciseUuid === exercise.uuid) || (!!exercise.name && r.exerciseName === exercise.name)) &&
      daysBetween(r.date, today) <= days &&
      daysBetween(r.date, today) >= 0
  );
}

/** The worst pain of the last week, for the coach's team list. */
export function worstRecentPain(reports: PainReport[], today: string, days = 7): PainReport | undefined {
  return reports
    .filter((r) => daysBetween(r.date, today) <= days && daysBetween(r.date, today) >= 0)
    .sort((a, b) => b.level - a.level)[0];
}
