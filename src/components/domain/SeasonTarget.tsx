"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { useCompetitions } from "@/hooks/useCompetitions";
import { fitToEvent, upcomingCompetitions } from "@/lib/seasonPlan";
import { useFormat } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Choice } from "@/components/ui/choice";

/**
 * Set a plan on a date: an upcoming competition, or any day. The plan then
 * starts so that its last week — the taper — is the event's week.
 */
export function SeasonTarget({ weeks, today, onApply }: { weeks: number; today: string; onApply: (start: string) => void }) {
  const t = useTranslations("season");
  const { day } = useFormat();
  const upcoming = upcomingCompetitions(useCompetitions(), today);
  const [date, setDate] = useState("");
  const fit = date && date >= today ? fitToEvent(date, weeks, today) : null;

  return (
    <section className="t-surface space-y-2 rounded-2xl p-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Flag className="h-4 w-4 text-accent-text" aria-hidden="true" />
        {t("title")}
      </h2>
      <p className="text-xs text-muted-foreground">{t("hint", { weeks })}</p>
      {upcoming.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {upcoming.map((c) => (
            <Choice key={c.id} on={date === c.date} onClick={() => setDate(c.date)}>
              {c.event} · {day(c.date)}
            </Choice>
          ))}
        </div>
      )}
      <label className="flex items-center gap-3 text-sm">
        <span className="flex-1">{t(upcoming.length ? "otherDate" : "date")}</span>
        <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      </label>
      {fit && (
        <div className="space-y-2 rounded-xl bg-muted/60 p-2.5 text-sm">
          <p>{t("preview", { start: day(fit.start), from: day(fit.lastWeek.from), to: day(fit.lastWeek.to) })}</p>
          {fit.missed > 0 && <p className="text-amber-700 dark:text-amber-300">{t("late", { count: fit.missed, week: Math.min(weeks, fit.missed + 1) })}</p>}
          <Button size="sm" className="w-full" onClick={() => onApply(fit.start)}>
            {t("apply")}
          </Button>
        </div>
      )}
    </section>
  );
}
