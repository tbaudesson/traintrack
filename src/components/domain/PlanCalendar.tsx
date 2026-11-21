"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, ChevronLeft, ChevronRight, CircleX } from "lucide-react";
import type { Workout } from "@/db";
import { scheduleSessions, type PlannedProgram } from "@/lib/schedule";
import { calendarDays, yearSummary } from "@/lib/planCalendar";
import { monthGrid, shiftMonth } from "@/lib/suggest";
import { formatDuration } from "@/lib/cardio";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** How far ahead the planning can be looked at. */
const AHEAD_MONTHS = 3;

const lastDay = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
};

/**
 * The month as a calendar: a filled dot on a day trained, a ring on a day the
 * planning holds a session to come, a cross on a planned session missed. A
 * day opens what it holds: the sessions done (to open), the sessions planned
 * and those missed. The months ahead show what the planning will bring.
 */
export function PlanCalendar({
  workouts,
  planned,
  today,
  month,
  onMonth,
  row,
}: {
  workouts: Workout[];
  planned: PlannedProgram[];
  today: string;
  month: string;
  onMonth: (month: string) => void;
  /** How a session done is shown in the day's list. */
  row: (w: Workout) => React.ReactNode;
}) {
  const t = useTranslations("history");
  const locale = useLocale();
  const { day } = useFormat();
  const [picked, setPicked] = useState<string | null>(null);
  const sessions = useMemo(() => scheduleSessions({ planned, workouts, from: `${month}-01`, to: lastDay(month), today }), [planned, workouts, month, today]);
  const days = useMemo(() => calendarDays(workouts.filter((w) => w.date.startsWith(month)), sessions), [workouts, sessions, month]);
  const monthName = (m: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${m}-15T12:00:00`));
  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    // 2026-11-16 is a Monday.
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2026, 10, 16 + i, 12))));
  }, [locale]);
  const limit = shiftMonth(today.slice(0, 7), AHEAD_MONTHS);
  const totals = [...days.values()].reduce((a, d) => ({ done: a.done + d.done, planned: a.planned + d.planned.length, missed: a.missed + d.missed.length }), { done: 0, planned: 0, missed: 0 });
  const go = (m: string) => {
    onMonth(m);
    setPicked(null);
  };
  const open = picked ? days.get(picked) : null;

  return (
    <div className="t-panel space-y-3 rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <Button size="icon-sm" variant="ghost" aria-label={t("previousMonth")} onClick={() => go(shiftMonth(month, -1))}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <p className="text-sm font-semibold capitalize" aria-live="polite">{monthName(month)}</p>
        <Button size="icon-sm" variant="ghost" aria-label={t("nextMonth")} disabled={month >= limit} onClick={() => go(shiftMonth(month, 1))}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div role="grid" aria-label={monthName(month)} className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((d, i) => (
          <span key={i} className="text-[0.7rem] font-semibold text-muted-foreground" aria-hidden="true">{d}</span>
        ))}
        {monthGrid(month).flat().map((date, i) => {
          if (!date) return <span key={i} />;
          const d = days.get(date);
          const any = !!d && (d.done > 0 || d.planned.length > 0 || d.missed.length > 0);
          const label = [
            day(date),
            d?.done ? t("count", { count: d.done }) : null,
            d?.planned.length ? t("plannedCount", { count: d.planned.length }) : null,
            d?.missed.length ? t("missedCount", { count: d.missed.length }) : null,
          ].filter(Boolean).join(" · ");
          return (
            <button
              key={date}
              type="button"
              disabled={!any}
              aria-pressed={picked === date}
              aria-label={label}
              onClick={() => setPicked(picked === date ? null : date)}
              className={cn(
                "relative grid aspect-square min-h-9 place-items-center rounded-lg text-sm",
                any ? "font-semibold hover:bg-muted" : "text-muted-foreground/60",
                date === today && "ring-1 ring-accent-500",
                picked === date && "bg-accent-600 text-white hover:bg-accent-600"
              )}
            >
              {Number(date.slice(8))}
              <span className="absolute bottom-1 flex gap-0.5" aria-hidden="true">
                {!!d?.done && <span className={cn("size-1.5 rounded-full", picked === date ? "bg-white" : "bg-accent-500")} />}
                {!!d?.planned.length && <span className={cn("size-1.5 rounded-full border", picked === date ? "border-white" : "border-accent-500")} />}
                {!!d?.missed.length && <CircleX className={cn("size-2", picked === date ? "text-white" : "text-rose-600 dark:text-rose-400")} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* The legend, and the month's counts: the marks never say it alone. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent-500" aria-hidden="true" />{t("legendDone", { count: totals.done })}</li>
        <li className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-accent-500" aria-hidden="true" />{t("legendPlanned", { count: totals.planned })}</li>
        <li className="flex items-center gap-1.5"><CircleX className="size-2.5 text-rose-600 dark:text-rose-400" strokeWidth={3} aria-hidden="true" />{t("legendMissed", { count: totals.missed })}</li>
      </ul>

      {picked && open && (
        <div className="space-y-2">
          {workouts.filter((w) => w.date === picked && !w.cancelledAt).map(row)}
          {open.planned.map((p, i) => (
            <p key={`p${i}`} className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm">
              <CalendarClock className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
              {t("plannedItem", { name: p })}
            </p>
          ))}
          {open.missed.map((p, i) => (
            <p key={`m${i}`} className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              <CircleX className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("missedItem", { name: p })}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The year at a glance: each month with its sessions done and their time,
 * the planned sessions missed and those still to come. A month opens its
 * calendar.
 */
export function YearView({
  workouts,
  planned,
  today,
  year,
  onYear,
  onMonth,
}: {
  workouts: Workout[];
  planned: PlannedProgram[];
  today: string;
  year: number;
  onYear: (year: number) => void;
  onMonth: (month: string) => void;
}) {
  const t = useTranslations("history");
  const locale = useLocale();
  const sessions = useMemo(() => scheduleSessions({ planned, workouts, from: `${year}-01-01`, to: `${year}-12-31`, today }), [planned, workouts, year, today]);
  const done = useMemo(() => workouts.filter((w) => !w.cancelledAt), [workouts]);
  const months = useMemo(() => yearSummary(year, done, sessions), [year, done, sessions]);
  const name = (m: string) => new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(`${m}-15T12:00:00`));
  const top = Math.max(1, ...months.map((m) => m.done));
  const total = months.reduce((a, m) => ({ done: a.done + m.done, minutes: a.minutes + m.minutes, missed: a.missed + m.missed }), { done: 0, minutes: 0, missed: 0 });
  const thisYear = Number(today.slice(0, 4));

  return (
    <div className="t-panel space-y-3 rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <Button size="icon-sm" variant="ghost" aria-label={t("previousYear")} onClick={() => onYear(year - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <p className="text-sm font-semibold" aria-live="polite">{year}</p>
        <Button size="icon-sm" variant="ghost" aria-label={t("nextYear")} disabled={year >= thisYear} onClick={() => onYear(year + 1)}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <p className="text-sm">{t("yearTotal", { count: total.done, time: formatDuration(total.minutes * 60), missed: total.missed })}</p>
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {months.map((m) => (
          <li key={m.month}>
            <button
              type="button"
              onClick={() => onMonth(m.month)}
              className={cn("flex w-full flex-col items-start gap-1 rounded-xl border border-border p-2 text-left hover:bg-muted", m.month === today.slice(0, 7) && "ring-1 ring-accent-500")}
              aria-label={`${name(m.month)} · ${t("count", { count: m.done })}${m.missed ? ` · ${t("missedCount", { count: m.missed })}` : ""}${m.planned ? ` · ${t("plannedCount", { count: m.planned })}` : ""}`}
            >
              <span className="text-xs font-semibold capitalize">{name(m.month)}</span>
              {/* A bar for the sessions done, its number beside it. */}
              <span className="flex w-full items-center gap-1.5">
                <span className="h-1.5 flex-1 rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-accent-500" style={{ width: `${(m.done / top) * 100}%` }} />
                </span>
                <span className="text-xs tabular-nums">{m.done}</span>
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                {m.minutes ? formatDuration(m.minutes * 60) : "—"}
                {m.missed ? ` · ${t("missedShort", { count: m.missed })}` : ""}
                {m.planned ? ` · ${t("plannedShort", { count: m.planned })}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
