import { mondayOfDate } from "./weekPlan";

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export interface WeekStreak {
  /** Weeks in a row with the sessions planned done, this one included once done. */
  weeks: number;
  /** Sessions done this week. */
  thisWeek: number;
  /** Sessions a week to keep the streak. */
  target: number;
}

/**
 * Weeks kept in a row: a week counts when it has as many sessions as the
 * week asks for. Counted in weeks rather than days, since rest days are part
 * of the plan. The week in progress does not break the streak; it adds to it
 * once its sessions are done.
 */
export function weekStreak(input: { today: string; workouts: { date: string }[]; target: number }): WeekStreak {
  const target = Math.max(1, Math.min(7, Math.round(input.target) || 1));
  const monday = mondayOfDate(input.today);
  const perWeek = new Map<string, number>();
  for (const w of input.workouts) {
    if (w.date > input.today) continue;
    const week = mondayOfDate(w.date);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  let weeks = 0;
  for (let week = addDays(monday, -7); weeks < 520 && (perWeek.get(week) ?? 0) >= target; week = addDays(week, -7)) weeks++;
  const thisWeek = perWeek.get(monday) ?? 0;
  return { weeks: weeks + (thisWeek >= target ? 1 : 0), thisWeek, target };
}
