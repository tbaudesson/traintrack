import { mondayOfDate } from "./weekPlan";

/** A weekly limit when none was set: two and a half hours of work. */
export const DEFAULT_WEEKLY_LIMIT_MIN = 150;
/** Above this much canter in one session, the session is flagged. */
export const MAX_CANTER_PER_SESSION_MIN = 20;

type Session = { date: string; walkMin: number; trotMin: number; canterMin: number };

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export const sessionMinutes = (s: Session) => s.walkMin + s.trotMin + s.canterMin;

export type LoadStatus = "ok" | "near" | "over";

export interface WeekLoad {
  monday: string;
  total: number;
  canter: number;
  limit: number;
  /** Share of the limit used, 0–1 and beyond. */
  share: number;
  status: LoadStatus;
  /** Days of the week (up to today) without any work. */
  restDays: number;
  /** Sessions of the week with too much canter. */
  hardSessions: number;
}

/**
 * A horse's week, Monday to Sunday: minutes of work against its limit, the
 * canter in it, rest days and sessions with a lot of canter. "near" from 80 %
 * of the limit, "over" past it.
 */
export function weekLoad(sessions: Session[], limitMin: number | null | undefined, monday: string, today: string): WeekLoad {
  const sunday = addDays(monday, 6);
  const week = sessions.filter((s) => s.date >= monday && s.date <= sunday);
  const limit = limitMin || DEFAULT_WEEKLY_LIMIT_MIN;
  const total = week.reduce((sum, s) => sum + sessionMinutes(s), 0);
  const share = total / limit;
  const lastDay = today < sunday ? today : sunday;
  const daysSoFar = lastDay < monday ? 0 : Math.round((Date.parse(lastDay) - Date.parse(monday)) / 86_400_000) + 1;
  const worked = new Set(week.filter((s) => sessionMinutes(s) > 0 && s.date <= lastDay).map((s) => s.date)).size;
  return {
    monday,
    total,
    canter: week.reduce((sum, s) => sum + s.canterMin, 0),
    limit,
    share,
    status: share > 1 ? "over" : share >= 0.8 ? "near" : "ok",
    restDays: Math.max(0, daysSoFar - worked),
    hardSessions: week.filter((s) => s.canterMin > MAX_CANTER_PER_SESSION_MIN).length,
  };
}

/** The last weeks of a horse, oldest first, this week last. */
export function recentWeeks(sessions: Session[], limitMin: number | null | undefined, today: string, count = 4): WeekLoad[] {
  const thisMonday = mondayOfDate(today);
  return Array.from({ length: count }, (_, i) => weekLoad(sessions, limitMin, addDays(thisMonday, -7 * (count - 1 - i)), today));
}
