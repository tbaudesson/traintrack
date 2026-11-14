/**
 * The athlete's planning, every program together: each program in the
 * planning has its own days of the week (or, for a coach's program dated by
 * the coach, the athlete's training days) and a start. Its sessions are laid
 * on those days: a plan made of weeks gives each calendar week its own
 * sessions; a rotation (A, B, C…) goes on from the next session due. A day
 * missed does not lose its session: it moves to the next planned day. Pure.
 */
import type { Program, Workout } from "@/db";
import { findWorkoutProgramDay, nextDayIndex } from "./startWorkout";

export interface PlannedProgram {
  program: Program;
  /** 1 = Monday … 7 = Sunday */
  days: number[];
  /** YYYY-MM-DD */
  start: string;
}

export interface ScheduledSession {
  date: string;
  program: Program;
  /** The program day. */
  index: number;
  label: string;
  status: "done" | "missed" | "planned";
}

type W = Pick<Workout, "id" | "date" | "title" | "programId" | "programDayIndex">;

const DAY_MS = 86_400_000;
const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;
const addDays = (date: string, days: number) => new Date((toDay(date) + days) * DAY_MS).toISOString().slice(0, 10);
export const weekdayOf = (date: string) => ((new Date(toDay(date) * DAY_MS).getUTCDay() + 6) % 7) + 1;

const cleanDays = (days: number[] | null | undefined) => [...new Set((days ?? []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort();

/** Weeks of a plan made of weeks, or null for a rotation. */
const planLength = (program: Program) => {
  const weeks = (program.structure ?? []).map((d) => d.week).filter((w): w is number => w !== undefined);
  return weeks.length ? Math.max(...weeks) : null;
};

/** Sessions a program asks for in a week: those of its busiest week, or its days for a rotation (7 at most). */
export function sessionsPerWeek(program: Pick<Program, "structure">): number {
  const days = program.structure ?? [];
  const counts = new Map<number, number>();
  for (const d of days) if (d.week !== undefined) counts.set(d.week, (counts.get(d.week) ?? 0) + 1);
  return counts.size ? Math.max(...counts.values()) : Math.min(days.length, 7);
}

/** Days to suggest for a program: the athlete's training days first, then spread over the week. */
export function suggestDays(count: number, trainingDays: number[]): number[] {
  const n = Math.max(1, Math.min(7, count));
  const own = cleanDays(trainingDays);
  if (own.length >= n) return own.slice(0, n);
  const spread: Record<number, number[]> = { 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] };
  const fill = [...spread[n], ...[1, 2, 3, 4, 5, 6, 7]].filter((d, i, all) => !own.includes(d) && all.indexOf(d) === i);
  return cleanDays([...own, ...fill.slice(0, n - own.length)]);
}

/**
 * The programs in the planning today: those given days, and a coach's program
 * dated by the coach (on the athlete's training days). A plan over before
 * `from` is left out.
 */
export function plannedPrograms(input: { programs: Program[]; me: string | null | undefined; trainingDays: number[]; from: string }): PlannedProgram[] {
  const out: PlannedProgram[] = [];
  for (const program of input.programs) {
    if (!(program.structure ?? []).length) continue;
    const own = cleanDays(program.weekdays);
    const fromCoach = !!program.startDate && !!program.assignedToUserId && program.assignedToUserId === input.me && program.ownerUserId !== input.me;
    const days = own.length ? own : fromCoach ? cleanDays(input.trainingDays) : [];
    if (!days.length) continue;
    const start = program.startDate ?? program.createdAt.slice(0, 10);
    const weeks = planLength(program);
    if (weeks !== null && toDay(input.from) >= toDay(start) + weeks * 7) continue;
    out.push({ program, days, start });
  }
  return out;
}

/** The sessions of the planned programs between two dates (both included), with what was done and missed. */
export function scheduleSessions(input: { planned: PlannedProgram[]; workouts: W[]; from: string; to: string; today: string }): ScheduledSession[] {
  const { from, to, today } = input;
  const out: ScheduledSession[] = [];
  for (const { program, days, start } of input.planned) {
    const structure = program.structure ?? [];
    const name = (index: number) => structure[index]?.name ?? "";
    // What was done of this program, by date.
    const doneOn = new Map<string, number[]>();
    const doneIndexes = new Set<number>();
    for (const w of input.workouts) {
      const at = findWorkoutProgramDay([program], w);
      if (!at) continue;
      doneOn.set(w.date, [...(doneOn.get(w.date) ?? []), at.index]);
      doneIndexes.add(at.index);
    }
    const weeks = planLength(program);
    const weekOf = (date: string) => Math.floor((toDay(date) - toDay(start)) / 7) + 1;
    // A rotation goes on from the next session due.
    let next = weeks === null ? nextDayIndex(program, input.workouts, today) : 0;
    // A plan's sessions not yet done, by week.
    const left = new Map<number, number[]>();
    if (weeks !== null) structure.forEach((d, i) => d.week !== undefined && !doneIndexes.has(i) && left.set(d.week, [...(left.get(d.week) ?? []), i]));

    // Sessions to come are laid from today: a later window starts its walk today.
    const first = from > today ? today : from;
    for (let date = first < start ? start : first; date <= to; date = addDays(date, 1)) {
      const week = weekOf(date);
      if (weeks !== null && week > weeks) break;
      const show = date >= from;
      const done = doneOn.get(date);
      if (done) {
        if (show) for (const index of done) out.push({ date, program, index, label: name(index), status: "done" });
        continue;
      }
      if (!days.includes(weekdayOf(date))) continue;
      if (date < today) {
        // A plan's day is missed only while its week still has sessions to do.
        const behind = weeks === null || (left.get(week)?.length ?? 0) > 0;
        if (show && behind) out.push({ date, program, index: -1, label: program.name, status: "missed" });
        continue;
      }
      if (weeks === null) {
        const index = next;
        next = (next + 1) % structure.length;
        if (show) out.push({ date, program, index, label: name(index), status: "planned" });
      } else {
        const index = left.get(week)?.shift();
        if (index !== undefined && show) out.push({ date, program, index, label: name(index), status: "planned" });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export type DayStatus = "done" | "missed" | "planned" | "rest";

export interface ScheduleDay {
  date: string;
  weekday: number;
  today: boolean;
  status: DayStatus;
  sessions: ScheduledSession[];
  /** Done that day outside the planned programs (a run, a free session). */
  others: string[];
}

/** The seven days from a Monday, each with its sessions, and what else was done. */
export function scheduleWeek(input: { monday: string; today: string; planned: PlannedProgram[]; sessions: ScheduledSession[]; workouts: W[] }): ScheduleDay[] {
  const programs = input.planned.map((p) => p.program);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(input.monday, i);
    const sessions = input.sessions.filter((s) => s.date === date);
    const others = input.workouts.filter((w) => w.date === date && !findWorkoutProgramDay(programs, w)).map((w) => w.title ?? "");
    // A planned session done makes the day done; something else done does not
    // make up for a planned session missed.
    const status: DayStatus = sessions.some((s) => s.status === "planned")
      ? "planned"
      : sessions.some((s) => s.status === "done")
        ? "done"
        : sessions.some((s) => s.status === "missed")
          ? "missed"
          : others.length
            ? "done"
            : "rest";
    return { date, weekday: i + 1, today: date === input.today, status, sessions, others };
  });
}
