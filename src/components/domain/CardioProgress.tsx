"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Workout } from "@/db";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/page-parts";
import { DISTANCE_SPORTS, cardioBests, formatDistance, formatPace, isCardioDone } from "@/lib/cardio";
import { localDateIn } from "@/lib/dates";

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
      const bests = cardioBests(own, sport);
      return [{
        sport,
        count: own.length,
        week: total(since(7)),
        month: total(since(28)),
        longest: bests.longestM,
        pace: bests.bestSpeed ? formatPace(sport, 1000, 1000 / bests.bestSpeed) : null,
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
              {r.pace && (
                <>
                  <dt className="text-muted-foreground">{t("bestPace")}</dt>
                  <dd className="text-right font-medium tabular-nums">{r.pace}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
