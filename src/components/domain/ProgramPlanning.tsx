"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, CalendarPlus } from "lucide-react";
import type { Program } from "@/db";
import { updateProgram } from "@/hooks/usePrograms";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { nextMonday, programWeek } from "@/lib/programWeek";
import { sessionsPerWeek, suggestDays } from "@/lib/schedule";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const weekdayName = (locale: string, day: number, width: "narrow" | "long") =>
  new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));

/**
 * A program in the athlete's planning: on which days of the week and from
 * when. Its sessions then show in the week on the home screen and in the
 * calendar export, with those of the other programs planned. A coach's
 * program is planned by the coach: the athlete sees the days.
 */
export function ProgramPlanning({ program, today, readOnly }: { program: Program; today: string; readOnly: boolean }) {
  const t = useTranslations("planning");
  const locale = useLocale();
  const { day } = useFormat();
  const profile = useAthleteProfile();
  const trainingDays = profile?.trainingDays ?? [];
  const id = program.id!;
  const days = [...new Set(program.weekdays ?? [])].sort();
  const perWeek = sessionsPerWeek(program);
  const weeks = (program.structure ?? []).some((d) => d.week !== undefined);
  const calendar = programWeek(program, today);
  const planned = days.length > 0 || (readOnly && !!program.startDate);

  function plan() {
    void updateProgram(id, {
      weekdays: suggestDays(perWeek, trainingDays),
      startDate: program.startDate ?? (weeks ? nextMonday(today) : today),
    });
  }

  function toggle(d: number) {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();
    void updateProgram(id, { weekdays: next.length ? next : null });
  }

  if (!planned) {
    if (readOnly) {
      return (
        <section className="t-surface flex items-start gap-3 rounded-2xl p-4 ring-1 ring-foreground/5">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("coachNotYet")}</p>
        </section>
      );
    }
    return (
      <section className="t-surface space-y-3 rounded-2xl p-4 ring-2 ring-accent-500/40">
        <div className="flex items-start gap-3">
          <CalendarPlus className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="font-semibold">{t("notPlannedTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("notPlannedText", { count: perWeek })}</p>
          </div>
        </div>
        <Button className="w-full" onClick={plan}>
          <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("add")}
        </Button>
      </section>
    );
  }

  const shown = days.length ? days : trainingDays;
  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5" aria-labelledby="planning-title">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-accent-text" aria-hidden="true" />
        <h2 id="planning-title" className="flex-1 font-semibold">
          {t("title")}
        </h2>
        {!readOnly && (
          <button type="button" onClick={() => updateProgram(id, { weekdays: null })} className="min-h-10 text-sm font-medium text-muted-foreground underline">
            {t("remove")}
          </button>
        )}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("days")}</legend>
        <div className="grid grid-cols-7 gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const on = shown.includes(d);
            return (
              <button
                key={d}
                type="button"
                disabled={readOnly}
                onClick={() => toggle(d)}
                aria-pressed={on}
                aria-label={weekdayName(locale, d, "long")}
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                  on ? "bg-accent-600 text-white" : "bg-muted text-muted-foreground",
                  readOnly && "cursor-default"
                )}
              >
                {weekdayName(locale, d, "narrow")}
              </button>
            );
          })}
        </div>
      </fieldset>
      {!readOnly && days.length !== perWeek && <p className="text-xs text-amber-700 dark:text-amber-300">{t("mismatch", { count: perWeek, chosen: days.length })}</p>}
      {readOnly && <p className="text-xs text-muted-foreground">{days.length ? t("coachDays") : t("coachTrainingDays")}</p>}

      <div className="flex items-center gap-3">
        <label htmlFor="program-start" className="flex-1 text-sm font-medium">
          {t("start")}
        </label>
        {readOnly ? (
          <span className="text-sm">{program.startDate ? day(program.startDate) : "—"}</span>
        ) : (
          <Input
            id="program-start"
            type="date"
            value={program.startDate ?? ""}
            onChange={(e) => updateProgram(id, { startDate: e.target.value || null })}
            className="w-auto"
          />
        )}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => updateProgram(id, { startDate: today })}>
            {t("today")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => updateProgram(id, { startDate: nextMonday(today) })}>
            {t("nextMonday")}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {calendar
          ? calendar.finished
            ? t("finished")
            : calendar.started
              ? calendar.total
                ? t("weekOf", { week: calendar.week, total: calendar.total })
                : t("weekSince", { week: calendar.week })
              : t("startsOn", { date: day(program.startDate!) })
          : t("hint")}
      </p>
    </section>
  );
}
