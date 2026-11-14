import { mondayOfDate } from "./weekPlan";

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export interface SeasonFit {
  /** The Monday the plan starts on. */
  start: string;
  /** The last week of the plan — the taper — Monday to Sunday: the event's week. */
  lastWeek: { from: string; to: string };
  /** Weeks of the plan already gone by today, skipped when started late. */
  missed: number;
}

/**
 * A plan in weeks set on an event: its last week, the taper, is the event's
 * week, so the start is that many weeks before. Started late, the calendar
 * picks up at the week in progress and the first weeks are skipped.
 */
export function fitToEvent(eventDate: string, weeks: number, today: string): SeasonFit {
  const lastMonday = mondayOfDate(eventDate);
  const start = addDays(lastMonday, -7 * (weeks - 1));
  const thisMonday = mondayOfDate(today);
  const missed = Math.max(0, Math.min(weeks, Math.round((Date.parse(thisMonday) - Date.parse(start)) / (7 * 86_400_000))));
  return { start, lastWeek: { from: lastMonday, to: addDays(lastMonday, 6) }, missed };
}

/** The upcoming competitions: dated today or later, not scored yet. */
export function upcomingCompetitions<C extends { date: string; compulsory?: number | null; technical?: number | null; freestyle?: number | null }>(
  results: C[],
  today: string
): C[] {
  return results
    .filter((r) => r.date >= today && r.compulsory == null && r.technical == null && r.freestyle == null)
    .sort((a, b) => a.date.localeCompare(b.date));
}
