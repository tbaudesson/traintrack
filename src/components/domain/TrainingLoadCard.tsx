"use client";

import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";
import type { LoadZone, TrainingLoad } from "@/lib/trainingLoad";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

const ZONE_TEXT: Record<LoadZone, string> = {
  low: "text-sky-700 dark:text-sky-300",
  optimal: "text-emerald-700 dark:text-emerald-300",
  caution: "text-amber-700 dark:text-amber-300",
  danger: "text-rose-700 dark:text-rose-300",
};
const ZONE_BAR: Record<LoadZone, string> = {
  low: "bg-sky-500",
  optimal: "bg-emerald-500",
  caution: "bg-amber-500",
  danger: "bg-rose-500",
};

/**
 * This week's load against the last four weeks: the ratio, its zone, what to
 * do about it, and the four weeks as bars. `forCoach` speaks of the athlete
 * to their coach.
 */
export function TrainingLoadCard({ load, forCoach }: { load: TrainingLoad; forCoach?: boolean }) {
  const t = useTranslations("load");
  const { num } = useFormat();
  const top = Math.max(...load.weeks, 1);
  const change = Math.round((load.ratio - 1) * 100);

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5" aria-labelledby="training-load-title">
      <div className="flex items-start gap-3">
        <Activity className={cn("mt-0.5 h-5 w-5 shrink-0", ZONE_TEXT[load.zone])} aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 id="training-load-title" className="font-semibold">
            {t("title")}
          </h2>
          <p className={cn("text-sm font-semibold", ZONE_TEXT[load.zone])}>
            {t(`zone_${load.zone}`)} · {t("ratio", { ratio: num(load.ratio, 2) })}
            {change !== 0 && ` · ${change > 0 ? "+" : ""}${change} %`}
          </p>
          <p className="text-sm text-muted-foreground">{t(forCoach ? `coach_${load.zone}` : `advice_${load.zone}`)}</p>
        </div>
      </div>

      <div className="flex h-16 items-end gap-2" role="img" aria-label={t("weeksLabel", { weeks: load.weeks.join(", ") })}>
        {load.weeks.map((w, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn("w-full rounded-md", i === 3 ? ZONE_BAR[load.zone] : "bg-foreground/15")}
              style={{ height: `${Math.max(4, (w / top) * 48)}px` }}
            />
            <span className="text-[11px] text-muted-foreground">{i === 3 ? t("thisWeek") : t("weeksAgo", { count: 3 - i })}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("how")}</p>
    </section>
  );
}
