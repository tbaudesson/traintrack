"use client";

import { useTranslations } from "next-intl";
import { useHorseSessions, useHorses } from "@/hooks/useHorses";
import { recentWeeks } from "@/lib/horseLoad";
import { localDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** For the coach: each horse an athlete logs, and this week's work against its limit. */
export function HorseLoadSummary({ userId }: { userId: string }) {
  const t = useTranslations("horses");
  const horses = useHorses(userId);
  const sessions = useHorseSessions(userId);
  if (!horses.length) return null;
  const today = localDate();
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{t("title")}</h2>
      <ul className="t-surface space-y-1.5 rounded-2xl p-3 ring-1 ring-foreground/5">
        {horses.map((h) => {
          const week = recentWeeks(sessions.filter((s) => s.horseId === h.id), h.weeklyLimitMin, today, 1)[0];
          return (
            <li key={h.id} className="flex items-center gap-2 text-sm">
              <span className={cn("size-2.5 shrink-0 rounded-full", week.status === "over" ? "bg-rose-500" : week.status === "near" ? "bg-amber-500" : "bg-emerald-500")} />
              <span className="flex-1 font-medium">{h.name}</span>
              <span className="tabular-nums text-muted-foreground">{t("thisWeek", { total: week.total, limit: week.limit })}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
