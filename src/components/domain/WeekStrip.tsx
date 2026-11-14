"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarPlus, Check, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PlanDay } from "@/lib/weekPlan";

const weekday = (locale: string, day: number, width: "narrow" | "short") =>
  new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));

/**
 * The week at a glance: done, missed, planned and rest days, then what comes
 * next, and a way to put the weeks ahead in the phone's calendar.
 */
export function WeekStrip({ plan, planned, onExport }: { plan: PlanDay[]; planned: boolean; onExport?: () => void }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const next = plan.filter((d) => d.status === "planned" && d.label).slice(0, 3);

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("weekPlan")}</h2>
        <Link href="/settings" className="flex min-h-10 items-center text-sm font-medium text-accent-text">
          {planned ? t("weekPlanEdit") : t("weekPlanSetup")}
        </Link>
      </div>

      <ol className="grid grid-cols-7 gap-1 text-center">
        {plan.map((d) => (
          <li key={d.date} className="flex flex-col items-center gap-1">
            <span className={cn("text-xs", d.today ? "font-bold text-accent-text" : "text-muted-foreground")}>
              {weekday(locale, d.weekday, "narrow")}
            </span>
            <span
              title={d.label}
              aria-label={`${weekday(locale, d.weekday, "short")} ${Number(d.date.slice(8))} : ${t(`plan_${d.status}`)}${d.label ? `, ${d.label}` : ""}`}
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-xs font-semibold",
                d.status === "done" && "bg-green-500 text-white",
                d.status === "planned" && "border-2 border-accent-500 text-accent-text",
                d.status === "missed" && "border border-dashed border-muted-foreground/60 text-muted-foreground",
                d.status === "rest" && "text-muted-foreground/60",
                d.today && d.status !== "done" && "ring-2 ring-accent-500/40 ring-offset-2 ring-offset-background"
              )}
            >
              {d.status === "done" ? <Check className="h-4 w-4" aria-hidden="true" />
                : d.status === "missed" ? <X className="h-3.5 w-3.5" aria-hidden="true" />
                : Number(d.date.slice(8))}
            </span>
          </li>
        ))}
      </ol>

      {next.length > 0 && (
        <ul className="space-y-1 text-sm">
          {next.map((d) => (
            <li key={d.date} className="flex gap-2">
              <span className="w-24 shrink-0 text-muted-foreground">
                {d.today ? t("planToday") : `${weekday(locale, d.weekday, "short")} ${Number(d.date.slice(8))}`}
              </span>
              <span className="min-w-0 truncate font-medium">{d.label}</span>
            </li>
          ))}
        </ul>
      )}
      {!planned && <p className="text-xs text-muted-foreground">{t("weekPlanHint")}</p>}
      {planned && onExport && (
        <button type="button" onClick={onExport} className="flex min-h-10 items-center gap-1.5 text-sm font-medium text-accent-text">
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {t("exportCalendar")}
        </button>
      )}
    </section>
  );
}
