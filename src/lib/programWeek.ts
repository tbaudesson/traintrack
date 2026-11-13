import type { Program } from "@/db";

const DAY_MS = 86400000;
const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;

export interface ProgramWeek {
  /** The program has begun (start date reached, or no start date). */
  started: boolean;
  /** Calendar week since the start, 1 for the first; capped to the plan's length. */
  week: number;
  /** Weeks in the plan, for a plan made of weeks. */
  total: number | null;
  /** Past the last week of the plan. */
  finished: boolean;
}

/** Where a program with a start date stands in the calendar today. Null without a start date. */
export function programWeek(program: Pick<Program, "startDate" | "structure">, today: string): ProgramWeek | null {
  if (!program.startDate) return null;
  const weeks = (program.structure ?? []).map((d) => d.week).filter((w): w is number => w !== undefined);
  const total = weeks.length ? Math.max(...weeks) : null;
  const elapsed = Math.floor((toDay(today) - toDay(program.startDate)) / 7) + 1;
  return {
    started: elapsed >= 1,
    week: Math.max(1, total ? Math.min(elapsed, total) : elapsed),
    total,
    finished: total !== null && elapsed > total,
  };
}

/** The next Monday after a date (the date itself when it is a Monday), YYYY-MM-DD. */
export function nextMonday(today: string): string {
  const day = new Date(toDay(today) * DAY_MS).getUTCDay();
  const ahead = (8 - day) % 7;
  return new Date((toDay(today) + ahead) * DAY_MS).toISOString().slice(0, 10);
}
