"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Check, Timer } from "lucide-react";
import type { AthleteProfile, Workout } from "@/db";
import { updateTrainingSchedule } from "@/hooks/useAthleteProfile";
import { mondayOfDate } from "@/lib/weekPlan";
import { scheduleSessions, weekdayOf, withMove, type PlannedProgram } from "@/lib/schedule";
import { fitWeek, type DayTime, type WeekFit } from "@/lib/weekFit";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/find";

/** The lengths offered for a day; the athlete picks the nearest to the time they have. */
const LENGTHS = [30, 45, 60, 90] as const;

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * "This week I can train…": the days and the time each, then what the
 * planning would need to fit: a session moved to a day with time, one
 * skipped when no day is left, one in its short version when time is short.
 * Moves and skips are applied one by one or all at once, as the week strip
 * makes them; nothing changes on its own.
 */
export function WeekFitCard({ planned, workouts, profile, today }: { planned: PlannedProgram[]; workouts: Workout[]; profile: AthleteProfile | null | undefined; today: string }) {
  const t = useTranslations("weekFit");
  const locale = useLocale();
  const { day } = useFormat();
  const monday = mondayOfDate(today);
  const availability = profile?.weekAvailability;
  const saved = availability && availability.monday === monday ? availability.days : null;
  const [days, setDays] = useState<DayTime[] | null>(null);
  const shown = days ?? saved ?? [];
  const [appliedFits, setAppliedFits] = useState(0);
  const weekdayName = (d: number) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(Date.UTC(2026, 10, 15 + d, 12)));

  const sessions = useMemo(() => scheduleSessions({ planned, workouts, from: today, to: addDays(monday, 6), today }), [planned, workouts, today, monday]);
  const fits = useMemo(() => fitWeek({ today, availability: saved ? { monday, days: saved } : null, sessions, planned, workouts }), [today, saved, monday, sessions, planned, workouts]);
  const plannedCount = sessions.filter((s) => s.status === "planned").length;

  async function save(next: DayTime[]) {
    setDays(next);
    await updateTrainingSchedule({ weekAvailability: { monday, days: next } });
  }
  const toggle = (weekday: number) =>
    save(shown.some((d) => d.weekday === weekday) ? shown.filter((d) => d.weekday !== weekday) : [...shown, { weekday, minutes: 60 }].sort((a, b) => a.weekday - b.weekday));
  const setMinutes = (weekday: number, minutes: number) => save(shown.map((d) => (d.weekday === weekday ? { ...d, minutes } : d)));

  /** Moves and skips go into the planning the same way as from the week strip. */
  async function applyFits(list: WeekFit[]) {
    let moves = profile?.scheduleMoves ?? [];
    for (const f of list) {
      if (f.type === "move") moves = withMove(moves, { program: f.program, from: f.from, to: f.to }, today);
      if (f.type === "skip") moves = withMove(moves, { program: f.program, from: f.from, to: null }, today);
    }
    await updateTrainingSchedule({ scheduleMoves: moves });
    setAppliedFits((n) => n + list.length);
  }
  const changes = fits.filter((f) => f.type !== "shorten");

  // The days left of this week, today first.
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => d >= today);

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5" aria-labelledby="week-fit">
      <div>
        <h2 id="week-fit" className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-accent-text" aria-hidden="true" />
          {t("title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("intro", { count: plannedCount })}</p>
      </div>

      <ChipRow label={t("days")}>
        {week.map((date) => {
          const wd = weekdayOf(date);
          return (
            <Chip key={date} on={shown.some((d) => d.weekday === wd)} onClick={() => toggle(wd)}>
              {weekdayName(wd)} {Number(date.slice(8))}
            </Chip>
          );
        })}
      </ChipRow>

      {shown.filter((d) => week.some((date) => weekdayOf(date) === d.weekday)).map((d) => (
        <div key={d.weekday} className="flex flex-wrap items-center gap-2">
          <span className="w-12 text-xs font-medium capitalize">{weekdayName(d.weekday)}</span>
          <ChipRow label={t("minutesFor", { day: weekdayName(d.weekday) })}>
            {LENGTHS.map((m) => (
              <Chip key={m} on={d.minutes === m} onClick={() => setMinutes(d.weekday, m)}>{t("minutes", { m })}</Chip>
            ))}
          </ChipRow>
        </div>
      ))}

      {saved && (
        <div className="space-y-2 border-t border-border pt-3">
          {fits.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4" aria-hidden="true" />
              {appliedFits ? t("applied") : t("fits")}
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {fits.map((f, i) => (
                  <li key={i} className={cn("flex items-start gap-2 rounded-xl p-3 text-sm", f.type === "shorten" ? "bg-muted/60" : "bg-accent-50 dark:bg-accent-900/20")}>
                    {f.type === "shorten" ? <Timer className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" /> : <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />}
                    <span>
                      {f.type === "move" && t("move", { label: f.label, from: day(f.from), to: day(f.to) })}
                      {f.type === "skip" && t("skip", { label: f.label, from: day(f.from) })}
                      {f.type === "shorten" && t("shorten", { label: f.label, date: day(f.date), planned: f.planned, minutes: f.minutes })}
                      {f.type === "shorten" && f.dropped.length > 0 && <span className="block text-xs text-muted-foreground">{t("dropped", { count: f.dropped.length })}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {changes.length > 0 && (
                <Button className="w-full rounded-full" onClick={() => applyFits(changes)}>
                  <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t("applyAll", { count: changes.length })}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">{t("control")}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
