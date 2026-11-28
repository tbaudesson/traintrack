/**
 * A tennis coach's notebook: groups trained in weekly slots, lessons made of
 * drills with their minutes, then given. Everything here is worked out from
 * those rows; nothing about the players is ever kept.
 */
import type { TennisAgeBand, TennisCategory, TennisDrill, TennisGroup, TennisLesson, TennisPlanItem, TennisSlot } from "@/db";
import { mondayOfDate } from "./weekPlan";

/** A lesson of this length unless the group's slot says otherwise. */
export const DEFAULT_MINUTES = 60;

const DAY_MS = 86400000;
const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;
export const addDays = (date: string, days: number) => new Date((toDay(date) + days) * DAY_MS).toISOString().slice(0, 10);
/** ISO day of the week: 1 Monday … 7 Sunday. */
export const isoDay = (date: string) => ((new Date(toDay(date) * DAY_MS).getUTCDay() + 6) % 7) + 1;

/** A drill's name and description in the app's language (a coach's own drill has only its own words). */
export function drillText(drill: Pick<TennisDrill, "name" | "nameFr" | "nameDe" | "description" | "descriptionFr" | "descriptionDe">, locale: string) {
  const name = (locale === "fr" ? drill.nameFr : locale === "de" ? drill.nameDe : null) || drill.name;
  const description = (locale === "fr" ? drill.descriptionFr : locale === "de" ? drill.descriptionDe : null) || drill.description || "";
  return { name, description };
}

export const planMinutes = (plan: Pick<TennisPlanItem, "minutes">[]) => plan.reduce((sum, p) => sum + (p.minutes || 0), 0);

/** The group's slots, earliest in the week first. */
export const sortedSlots = (slots: TennisSlot[]) => [...slots].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));

/** The days a group trains in the week of a Monday, with their slot. */
export function slotsOfWeek(group: Pick<TennisGroup, "slots">, monday: string): { date: string; slot: TennisSlot }[] {
  return sortedSlots(group.slots ?? []).map((slot) => ({ date: addDays(monday, slot.day - 1), slot }));
}

/** The group's next slot from a day on (that day included), within a week; null without slots. */
export function nextSlot(group: Pick<TennisGroup, "slots">, from: string): { date: string; slot: TennisSlot } | null {
  const slots = sortedSlots(group.slots ?? []);
  for (let i = 0; i < 7; i++) {
    const date = addDays(from, i);
    const slot = slots.find((s) => s.day === isoDay(date));
    if (slot) return { date, slot };
  }
  return null;
}

/** How long a lesson of the group on that day lasts: its slot's minutes, else an hour. */
export function lessonLength(group: Pick<TennisGroup, "slots">, date: string): number {
  return (group.slots ?? []).find((s) => s.day === isoDay(date))?.minutes ?? DEFAULT_MINUTES;
}

export const isGiven = (lesson: Pick<TennisLesson, "givenAt">) => !!lesson.givenAt;

/** Minutes given to each theme over some lessons (given ones only). */
export function themeMinutes(lessons: Pick<TennisLesson, "plan" | "givenAt">[]): Map<TennisCategory, number> {
  const out = new Map<TennisCategory, number>();
  for (const l of lessons) if (isGiven(l)) for (const p of l.plan ?? []) out.set(p.category, (out.get(p.category) ?? 0) + (p.minutes || 0));
  return out;
}

/** The lessons of a group, week by week: the last `count` weeks up to this one, then those ahead with lessons. */
export function groupWeeks<L extends Pick<TennisLesson, "date">>(lessons: L[], today: string, count = 8): { monday: string; lessons: L[] }[] {
  const thisMonday = mondayOfDate(today);
  const mondays = new Set<string>();
  for (let i = count - 1; i >= 0; i--) mondays.add(addDays(thisMonday, -7 * i));
  for (const l of lessons) if (l.date > today) mondays.add(mondayOfDate(l.date));
  return [...mondays]
    .sort()
    .map((monday) => ({ monday, lessons: lessons.filter((l) => mondayOfDate(l.date) === monday).sort((a, b) => a.date.localeCompare(b.date)) }));
}

/**
 * The core themes (the reference's) not worked in the lessons given over the
 * last weeks, for a group that has given lessons in that time: what to bring back.
 */
export function themesToRevisit(lessons: Pick<TennisLesson, "date" | "plan" | "givenAt">[], today: string, core: TennisCategory[], weeks = 3): TennisCategory[] {
  const from = addDays(mondayOfDate(today), -7 * (weeks - 1));
  const recent = lessons.filter((l) => isGiven(l) && l.date >= from && l.date <= today);
  if (!recent.length) return [];
  const worked = themeMinutes(recent);
  return core.filter((c) => !worked.get(c));
}

/** The plan of the group's last lesson before a day, to start from. */
export function previousPlan(lessons: Pick<TennisLesson, "date" | "plan" | "id">[], before: string, except?: number): TennisPlanItem[] | null {
  const last = lessons
    .filter((l) => l.date <= before && l.id !== except && (l.plan ?? []).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))[0];
  return last ? last.plan.map((p) => ({ ...p })) : null;
}

/** A drill as a line of a lesson, named as the coach reads it. */
export const planItem = (drill: Pick<TennisDrill, "uuid" | "name" | "nameFr" | "nameDe" | "description" | "descriptionFr" | "descriptionDe" | "category" | "minutes">, locale: string): TennisPlanItem => ({
  drill: drill.uuid ?? null,
  name: drillText(drill, locale).name,
  category: drill.category,
  minutes: drill.minutes,
});

/** Whether a drill suits a group's age band (a drill without bands suits all). */
export const suitsAge = (drill: Pick<TennisDrill, "ages">, band: TennisAgeBand | null | undefined) => !band || !drill.ages?.length || drill.ages.includes(band);
