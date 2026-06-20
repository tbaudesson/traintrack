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

export default function ProfilePage() {
  const t = useTranslations("profile");
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
      <div className="space-y-5 p-4 pb-24">
        {/* Level + XP */}
        <Card className="overflow-hidden">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-violet-600 text-2xl font-bold text-white">
                {g.level}
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {t("level")} {g.level} · {g.xp.toLocaleString()} {t("xp")}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-500 to-violet-500"
                    style={{ width: `${g.progressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("toNext", { n: (g.xpForNextLevel - g.xpIntoLevel).toLocaleString() })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<Dumbbell className="h-5 w-5 text-accent-500" />} value={g.totalWorkouts} label={t("workouts")} />
          <Stat icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} value={g.totalVolume.toLocaleString()} label={t("volume")} />
          <Stat
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            value={`${g.currentStreak}`}
            label={`${t("streak")} (${t("days")})`}
          />
        </div>

        {/* Badges */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Trophy className="h-4 w-4 text-amber-500" /> {t("badges")}
            <span className="ml-auto text-xs font-normal">
              {t("earned", { n: earnedCount, total: g.badges.length })}
            </span>
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {g.badges.map((b) => (
              <Card key={b.key} className={cn(!b.earned && "opacity-50")}>
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
                  <span className="text-[10px] font-medium leading-tight">{t(`b_${b.key}`)}</span>
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
    <Card>
      <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
        {icon}
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
