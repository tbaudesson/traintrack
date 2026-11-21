import type { Workout } from "@/db";
import { dayMinutes, expressDay } from "./express";
import { moveTargets, weekdayOf, type PlannedProgram, type ScheduledSession } from "./schedule";

/**
 * The week fitted to the time the athlete has: the days they can train this
 * week and the minutes each. The planned sessions still to come are checked
 * against them:
 *  - on a day without time: moved to a free day with time (the days a move
 *    allows: this week, after today, not a day the program already trains),
 *    the one with the most minutes first; skipped when there is none left;
 *  - on a day with too few minutes: its short version (expressDay), what it
 *    leaves out said.
 * Proposals only: the athlete applies them (moves and skips, as the week
 * strip makes them) or not. Pure.
 */

export type DayTime = { weekday: number; minutes: number };
export interface WeekAvailability {
  /** The Monday of the week it is for: another week starts again from the usual planning. */
  monday: string;
  days: DayTime[];
}

export type WeekFit =
  | { type: "move"; program: string; programName: string; label: string; from: string; to: string }
  | { type: "skip"; program: string; programName: string; label: string; from: string }
  | { type: "shorten"; programName: string; label: string; date: string; minutes: number; planned: number; dropped: string[] };

type S = Pick<ScheduledSession, "date" | "status" | "label" | "index" | "program">;

export function fitWeek(input: {
  today: string;
  availability: WeekAvailability | null | undefined;
  sessions: S[];
  planned: PlannedProgram[];
  workouts?: Pick<Workout, "id" | "date" | "title" | "programId" | "programDayIndex">[];
}): WeekFit[] {
  const a = input.availability;
  if (!a) return [];
  const sunday = new Date(`${a.monday}T12:00:00Z`);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const end = sunday.toISOString().slice(0, 10);
  if (input.today > end) return [];
  const minutesOn = (date: string) => a.days.find((d) => d.weekday === weekdayOf(date))?.minutes ?? 0;
  const ahead = input.sessions.filter((s) => s.status === "planned" && s.date >= input.today && s.date <= end).sort((x, y) => x.date.localeCompare(y.date));
  // Days already holding a session that stays.
  const used = new Set(ahead.filter((s) => minutesOn(s.date) > 0).map((s) => s.date));
  const out: WeekFit[] = [];

  for (const s of ahead) {
    const uuid = s.program.uuid;
    const day = s.program.structure?.[s.index];
    const label = s.label || s.program.name;
    const minutes = minutesOn(s.date);
    if (minutes > 0) {
      const need = day && !day.cardio ? dayMinutes(day) : null;
      if (day && need && need > minutes) out.push({ type: "shorten", programName: s.program.name, label, date: s.date, minutes, planned: need, dropped: expressDay(day, minutes).dropped });
      continue;
    }
    if (!uuid) continue;
    const planned = input.planned.find((p) => p.program.id === s.program.id);
    const targets = planned
      ? moveTargets({ planned, date: s.date, today: input.today, workouts: input.workouts as never })
          .filter((d) => d <= end && minutesOn(d) > 0 && !used.has(d))
          .sort((x, y) => minutesOn(y) - minutesOn(x) || x.localeCompare(y))
      : [];
    const to = targets[0];
    if (to) {
      used.add(to);
      out.push({ type: "move", program: uuid, programName: s.program.name, label, from: s.date, to });
    } else {
      out.push({ type: "skip", program: uuid, programName: s.program.name, label, from: s.date });
    }
  }
  return out;
}
