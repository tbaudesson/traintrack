import type { Program } from "@/db";

export type PlanStatus = "done" | "missed" | "planned" | "rest";

export interface PlanDay {
  /** YYYY-MM-DD */
  date: string;
  /** 1 = Monday … 7 = Sunday */
  weekday: number;
  status: PlanStatus;
  today: boolean;
  /** What was done, or what is planned. */
  label?: string;
  /** With a planning of several programs: the sessions to come that day, and of which program. */
  sessions?: { label: string; program: string }[];
}

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/**
 * The seven days of a week: what was done, the planned days missed, and the
 * sessions to come placed in order on the training days still ahead. A missed
 * day does not skip its session: it moves to the next training day.
 */
export function weekPlan(input: {
  /** Monday of the week, YYYY-MM-DD. */
  monday: string;
  today: string;
  trainingDays: number[];
  workouts: { date: string; title?: string }[];
  /** Names of the next sessions of the program, in order. */
  upcoming: string[];
}): PlanDay[] {
  const upcoming = [...input.upcoming];
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(input.monday, i);
    const weekday = i + 1;
    const today = date === input.today;
    const done = input.workouts.find((w) => w.date === date);
    if (done) return { date, weekday, today, status: "done", label: done.title };
    if (!input.trainingDays.includes(weekday)) return { date, weekday, today, status: "rest" };
    if (date < input.today) return { date, weekday, today, status: "missed" };
    return { date, weekday, today, status: "planned", label: upcoming.shift() };
  });
}

/**
 * The names of the sessions to come in a program, from a day on. A plan made
 * of weeks runs to its end; a rotation (A, B, C…) starts over.
 */
export function upcomingSessions(program: Program, from: number, count: number): string[] {
  const days = program.structure ?? [];
  if (!days.length) return [];
  const weeks = days.some((d) => d.week !== undefined);
  const names: string[] = [];
  for (let k = 0; k < count; k++) {
    const index = from + k;
    if (weeks && index >= days.length) break;
    names.push(days[index % days.length].name);
  }
  return names;
}

/** Monday of the week holding a date, both YYYY-MM-DD. */
export function mondayOfDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

/**
 * The sessions ahead over a number of weeks, placed like the week strip
 * does: on the training days from today on, skipping a day already trained,
 * each taking the next session of the program.
 */
export function plannedSessions(input: {
  today: string;
  trainingDays: number[];
  workouts: { date: string }[];
  /** Names of the next sessions of the program, in order. */
  upcoming: string[];
  weeks: number;
}): { date: string; label: string }[] {
  const upcoming = [...input.upcoming];
  const done = new Set(input.workouts.map((w) => w.date));
  const out: { date: string; label: string }[] = [];
  for (let i = 0; i < input.weeks * 7 && upcoming.length; i++) {
    const date = addDays(input.today, i);
    const [y, m, d] = date.split("-").map(Number);
    const weekday = ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
    if (!input.trainingDays.includes(weekday) || done.has(date)) continue;
    out.push({ date, label: upcoming.shift()! });
  }
  return out;
}
