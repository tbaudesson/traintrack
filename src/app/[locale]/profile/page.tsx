"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useBodyMetrics } from "@/hooks/useBodyMetrics";
import { useReadiness } from "@/hooks/useReadiness";
import { useAllNutrition } from "@/hooks/useNutrition";
import { computeGamification } from "@/lib/gamification";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, TrendingUp, Flame, Trophy, Award, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormat } from "@/lib/format";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { num } = useFormat();
  const { user, profile } = useAuth();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const bodyMetrics = useBodyMetrics();
  const readiness = useReadiness();
  const nutrition = useAllNutrition();

  const g = useMemo(
    () => computeGamification({ workouts, sets, bodyMetrics, readiness, nutrition }),
    [workouts, sets, bodyMetrics, readiness, nutrition]
  );

  const name = profile?.display_name ?? user?.email?.split("@")[0] ?? "";
  const earnedCount = g.badges.filter((b) => b.earned).length;

  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-6">
        {/* Level + XP */}
        <Card className="t-profile-hero overflow-hidden">
          <CardContent className="relative py-6 md:py-8">
            <div className="flex items-center gap-4">
              <div className="t-level-emblem flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-black text-white md:h-24 md:w-24 md:text-4xl">
                {g.level}
              </div>
              <div className="flex-1">
                <p className="t-display text-2xl md:text-4xl">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("level")} {g.level} · {num(g.xp, 0)} {t("xp")}
                </p>
                <div className="t-sunken mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/20">
                  <div
                    className="t-xp-progress h-full rounded-full"
                    style={{ width: `${g.progressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("toNext", { n: num(g.xpForNextLevel - g.xpIntoLevel, 0) })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Stat icon={<Dumbbell className="h-5 w-5 text-accent-500" />} value={g.totalWorkouts} label={t("workouts")} />
          <Stat icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} value={num(g.totalVolume, 0)} label={t("volume")} />
          <Stat
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            value={`${g.currentStreak}`}
            label={`${t("streak")} (${t("days")})`}
          />
        </div>

        {/* Badges */}
        <section className="space-y-2">
          <h2 className="t-section-heading">
            <Trophy className="h-4 w-4 text-amber-500" /> {t("badges")}
            <span className="ml-auto text-xs font-normal">
              {t("earned", { n: earnedCount, total: g.badges.length })}
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {g.badges.map((b) => (
              <Card key={b.key} className={cn("t-badge-card", !b.earned && "opacity-50")}>
                <CardContent className="flex flex-col items-center gap-1.5 py-4 text-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      b.earned ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"
                    )}
                  >
                    {b.earned ? (
                      <Award className="h-5 w-5 text-amber-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-medium leading-tight">{t(`b_${b.key}`)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card className="t-profile-stat">
      <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
        {icon}
        <p className="t-metric text-lg font-black md:text-2xl">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
