"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Workout } from "@/db";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/page-parts";
import { DISTANCE_SPORTS, cardioBests, formatDistance, formatDuration, formatPace, isCardioDone, speedTrend } from "@/lib/cardio";
import { localDateIn } from "@/lib/dates";
import { TrendingDown, TrendingUp } from "lucide-react";

/** Endurance totals and bests, one card per sport practised. */
export function CardioProgress({ workouts }: { workouts: Workout[] }) {
  const t = useTranslations("cardio");
  const [now] = useState(() => Date.now());

  const rows = useMemo(() => {
    const done = workouts.filter(isCardioDone);
    const since = (days: number) => localDateIn(-days, now);
    return DISTANCE_SPORTS.flatMap((sport) => {
      const own = done.filter((w) => w.sport === sport);
      if (own.length === 0) return [];
      const total = (from: string) => own.filter((w) => w.date >= from).reduce((sum, w) => sum + (w.distanceM ?? 0), 0);
      const climbed = (from: string) => own.filter((w) => w.date >= from).reduce((sum, w) => sum + (w.elevationGainM ?? 0), 0);
      const bests = cardioBests(own, sport);
      // Metres climbed: the measure of a hike, shown for any sport that has some.
      const climbs = sport === "hike" || bests.highestClimbM > 0;
      return [{
        sport,
        count: own.length,
        week: total(since(7)),
        month: total(since(28)),
        longest: bests.longestM,
        longestTime: bests.longestSec,
        climbWeek: climbs ? climbed(since(7)) : null,
        climbMonth: climbs ? climbed(since(28)) : null,
        highestClimb: climbs ? bests.highestClimbM : null,
        pace: bests.bestSpeed ? formatPace(sport, 1000, 1000 / bests.bestSpeed) : null,
        trend: speedTrend(own, sport, localDateIn(0, now)),
      }];
    });
  }, [workouts, now]);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-2">
      <SectionHeading>{t("endurance")}</SectionHeading>
      {rows.map((r) => (
        <Card key={r.sport}>
          <CardContent className="space-y-2 py-3">
            <p className="font-semibold">{t(`sport_${r.sport}`)} · {t("sessions", { count: r.count })}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{t("last7Days")}</dt>
              <dd className="text-right font-medium tabular-nums">{formatDistance(r.week, r.sport)}</dd>
              <dt className="text-muted-foreground">{t("last28Days")}</dt>
              <dd className="text-right font-medium tabular-nums">{formatDistance(r.month, r.sport)}</dd>
              <dt className="text-muted-foreground">{t("longest")}</dt>
              <dd className="text-right font-medium tabular-nums">{formatDistance(r.longest, r.sport)}</dd>
              {r.longestTime > 0 && (
                <>
                  <dt className="text-muted-foreground">{t("longestTime")}</dt>
                  <dd className="text-right font-medium tabular-nums">{formatDuration(r.longestTime)}</dd>
                </>
              )}
              {r.climbMonth !== null && (
                <>
                  <dt className="text-muted-foreground">{t("climbWeek")}</dt>
                  <dd className="text-right font-medium tabular-nums">+{r.climbWeek} m</dd>
                  <dt className="text-muted-foreground">{t("climbMonth")}</dt>
                  <dd className="text-right font-medium tabular-nums">+{r.climbMonth} m</dd>
                  <dt className="text-muted-foreground">{t("highestClimb")}</dt>
                  <dd className="text-right font-medium tabular-nums">+{r.highestClimb} m</dd>
                </>
              )}
              {r.pace && (
                <>
                  <dt className="text-muted-foreground">{t("bestPace")}</dt>
                  <dd className="text-right font-medium tabular-nums">{r.pace}</dd>
                </>
              )}
              {r.trend !== null && (
                <>
                  <dt className="text-muted-foreground">{t("trend")}</dt>
                  <dd className={`flex items-center justify-end gap-1 font-medium tabular-nums ${r.trend >= 0 ? "text-success-text" : "text-muted-foreground"}`}>
                    {r.trend >= 0 ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : <TrendingDown className="h-4 w-4" aria-hidden="true" />}
                    {t(r.trend >= 0 ? "faster" : "slower", { percent: Math.abs(Math.round(r.trend * 100)) })}
                  </dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
