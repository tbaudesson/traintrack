"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useMobilityGuidance } from "@/hooks/useMobilityGuidance";
import { mobilityStats } from "@/lib/mobilityLog";
import { localDate } from "@/lib/dates";
import { useFormat } from "@/lib/format";

/**
 * The follow-up of one's warm-ups and stretches: the last four weeks, the
 * suppleness felt session after session (a row of small bars, its numbers
 * beside them) and whether it improves, and the moves done most.
 */
export function MobilityProgress() {
  const t = useTranslations("mobilityLog");
  const locale = useLocale() as "fr" | "en" | "de";
  const { day, num } = useFormat();
  const workouts = useWorkouts();
  const guidance = useMobilityGuidance();
  const s = useMemo(() => mobilityStats(workouts, localDate()), [workouts]);
  if (!s.sessions && !s.ratings.length) return null;
  const nameOf = (key: string) => guidance?.moves.find((m) => m.key === key)?.name[locale] ?? key;
  const change = s.now !== null && s.before !== null ? Math.round((s.now - s.before) * 10) / 10 : null;
  const Trend = change === null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5" aria-labelledby="mobility-progress">
      <h2 id="mobility-progress" className="text-sm font-semibold">{t("progressTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("recent", { sessions: s.sessions, minutes: s.minutes, stretches: s.stretches, warmups: s.warmups })}</p>

      {s.ratings.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">{t("ratingsTitle")}</p>
          <ol className="flex h-14 items-end gap-1" aria-label={t("ratingsLabel")}>
            {s.ratings.map((r, i) => (
              <li key={`${r.date}-${i}`} className="flex flex-1 flex-col items-center gap-0.5" title={`${day(r.date)} · ${r.rating}/5`}>
                <span className="w-full rounded-t-sm bg-accent-500" style={{ height: `${r.rating * 9}px` }} aria-hidden="true" />
                <span className="text-[0.65rem] tabular-nums text-muted-foreground">{r.rating}</span>
                <span className="sr-only">{day(r.date)}</span>
              </li>
            ))}
          </ol>
          {change !== null && (
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <Trend className="h-4 w-4 text-accent-text" aria-hidden="true" />
              {t("trend", { now: num(s.now!), before: num(s.before!) })}
            </p>
          )}
        </div>
      )}

      {s.topMoves.length > 0 && (
        <p className="text-xs text-muted-foreground">{t("topMoves", { list: s.topMoves.map((m) => `${nameOf(m.key)} (${m.count})`).join(", ") })}</p>
      )}
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </section>
  );
}
