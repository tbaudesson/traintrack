"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, TrendingUp, CheckCircle } from "lucide-react";

export default function ClientDetailPage() {
  const t = useTranslations("teams");
  const tp = useTranslations("progress");
  const params = useParams();
  const userId = params.userId as string;

  const workouts = useWorkouts(userId);
  const sets = useAllWorkoutSets(userId);

  const workoutDate = useMemo(() => new Map(workouts.map((w) => [w.id, w.date])), [workouts]);

  const lastActivity = workouts[0]?.date ?? null;

  // 7-day compliance: number of distinct days with a workout in the last 7 days
  const compliance = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const days = new Set(workouts.filter((w) => w.date >= cutoff).map((w) => w.date));
    return days.size;
  }, [workouts]);

  const totalVolume = useMemo(() => {
    let v = 0;
    for (const s of sets) if (s.completed && s.weightKg && s.reps) v += s.weightKg * s.reps;
    return Math.round(v);
  }, [sets]);

  return (
    <>
      <PageHeader title={t("viewProgress")} showBack />
      <div className="space-y-4 p-4 pb-24">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-lg font-bold">{compliance}/7</p>
              <p className="text-[10px] text-muted-foreground">{t("compliance")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              <p className="text-lg font-bold">{totalVolume.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{tp("volume")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs font-bold">{lastActivity ?? t("never")}</p>
              <p className="text-[10px] text-muted-foreground">{t("lastActivity")}</p>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{tp("title")}</h2>
          {workouts.length === 0 ? (
            <p className="rounded-lg bg-card/60 py-6 text-center text-sm text-muted-foreground">{tp("noData")}</p>
          ) : (
            workouts.map((w) => {
              const wSets = sets.filter((s) => s.workoutId === w.id);
              const vol = wSets.reduce((a, s) => a + (s.completed && s.weightKg && s.reps ? s.weightKg * s.reps : 0), 0);
              return (
                <Card key={w.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{w.title || tp("title")}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.date} · {wSets.length} {t("roster")}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-indigo-600">{Math.round(vol)}</span>
                  </CardContent>
                </Card>
              );
            })
          )}
        </section>
      </div>
    </>
  );
}
