import type { ScheduledSession } from "./schedule";

/**
 * The calendar of training: for each day, what was done, what the planning
 * holds still to come, and what it held but was not done (missed). Done is
 * read from the sessions themselves; planned and missed from the planning
 * (scheduleSessions), so a session moved or a plan's week is counted the way
 * the week strip counts it. Pure.
 */

export type CalendarDay = { done: number; planned: string[]; missed: string[] };

type Done = { date: string; cancelledAt?: string | null };

export function calendarDays(done: Done[], sessions: Pick<ScheduledSession, "date" | "status" | "label" | "program">[]): Map<string, CalendarDay> {
  const out = new Map<string, CalendarDay>();
  const at = (date: string) => out.get(date) ?? out.set(date, { done: 0, planned: [], missed: [] }).get(date)!;
  for (const w of done) if (!w.cancelledAt) at(w.date).done++;
  for (const s of sessions) {
    if (s.status === "planned") at(s.date).planned.push(s.label ? `${s.program.name} — ${s.label}` : s.program.name);
    else if (s.status === "missed") at(s.date).missed.push(s.program.name);
  }
  return out;
}

export type MonthSummary = { month: string; done: number; minutes: number; missed: number; planned: number };

/** The twelve months of a year: sessions done and their time, sessions missed, sessions still planned. */
export function yearSummary(
  year: number,
  done: { date: string; durationMin?: number; durationSec?: number | null }[],
  sessions: Pick<ScheduledSession, "date" | "status">[]
): MonthSummary[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const mine = done.filter((w) => w.date.startsWith(month));
    const plan = sessions.filter((s) => s.date.startsWith(month));
    return {
      month,
      done: mine.length,
      minutes: Math.round(mine.reduce((sum, w) => sum + (w.durationMin ?? (w.durationSec ? w.durationSec / 60 : 0)), 0)),
      missed: plan.filter((s) => s.status === "missed").length,
      planned: plan.filter((s) => s.status === "planned").length,
    };
  });
}
