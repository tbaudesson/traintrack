"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useReadiness, readinessScore } from "@/hooks/useReadiness";
import { useNutritionForDate, sumMacros } from "@/hooks/useNutrition";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, TrendingUp, CheckCircle, HeartPulse, Apple, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { WorkoutNotes } from "@/components/domain/WorkoutNotes";

function scoreColor(s: number) {
  if (s >= 75) return "text-green-600";
  if (s >= 50) return "text-amber-600";
  return "text-rose-600";
}

export default function ClientDetailPage() {
  const t = useTranslations("teams");
  const tp = useTranslations("progress");
  const params = useParams();
  const userId = params.userId as string;

  const tr = useTranslations("readiness");
  const tn = useTranslations("nutrition");

  const workouts = useWorkouts(userId);
  const sets = useAllWorkoutSets(userId);
  const readiness = useReadiness(userId);
  const today = new Date().toISOString().split("T")[0];
  const nutritionToday = useNutritionForDate(today, userId);
  const macros = sumMacros(nutritionToday);

  const clientProfile = useLiveQuery(
    async () => (await db.athleteProfiles.toArray()).find((p) => !p.deletedAt && p.userId === userId),
    [userId]
  );
  const targets = clientProfile?.nutritionTargets;

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

        {/* Readiness */}
        {readiness.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <HeartPulse className="h-4 w-4 text-rose-500" /> {tr("title")}
            </h2>
            <Card>
              <CardContent className="flex items-end gap-1.5 py-3">
                {readiness.slice(0, 14).reverse().map((r) => {
                  const s = readinessScore(r) ?? 0;
                  return (
                    <div key={r.id} className="flex flex-1 flex-col items-center gap-1" title={`${r.date}: ${s}`}>
                      <div className="flex h-20 w-full items-end">
                        <div
                          className={cn(
                            "w-full rounded-sm",
                            s >= 75 ? "bg-green-500" : s >= 50 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ height: `${Math.max(6, s)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            {readiness[0] && (
              <p className="text-xs text-muted-foreground">
                {tr("score")}: <span className={cn("font-semibold", scoreColor(readinessScore(readiness[0]) ?? 0))}>
                  {readinessScore(readiness[0]) ?? "–"}/100
                </span> · {readiness[0].date}
              </p>
            )}
          </section>
        )}

        {/* Nutrition (today) */}
        {nutritionToday.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Apple className="h-4 w-4 text-emerald-500" /> {tn("title")} · {tn("today")}
            </h2>
            <Card>
              <CardContent className="grid grid-cols-4 gap-2 py-3 text-center">
                {[
                  { label: tn("calories"), val: macros.calories, tgt: targets?.calories },
                  { label: tn("protein"), val: macros.protein, tgt: targets?.protein },
                  { label: tn("carbs"), val: macros.carbs, tgt: targets?.carbs },
                  { label: tn("fat"), val: macros.fat, tgt: targets?.fat },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-sm font-bold">{Math.round(m.val)}</p>
                    {m.tgt ? <p className="text-[10px] text-muted-foreground">/ {m.tgt}</p> : null}
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{tp("title")}</h2>
          {workouts.length === 0 ? (
            <p className="rounded-lg bg-card/60 py-6 text-center text-sm text-muted-foreground">{tp("noData")}</p>
          ) : (
            workouts.map((w) => (
              <ClientWorkoutCard
                key={w.id}
                workoutId={w.id!}
                title={w.title || tp("title")}
                date={w.date}
                setCount={sets.filter((s) => s.workoutId === w.id).length}
                volume={Math.round(
                  sets
                    .filter((s) => s.workoutId === w.id)
                    .reduce((a, s) => a + (s.completed && s.weightKg && s.reps ? s.weightKg * s.reps : 0), 0)
                )}
              />
            ))
          )}
        </section>
      </div>
    </>
  );
}

function ClientWorkoutCard({
  workoutId,
  title,
  date,
  setCount,
  volume,
}: {
  workoutId: number;
  title: string;
  date: string;
  setCount: number;
  volume: number;
}) {
  const t = useTranslations("teams");
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="py-0">
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 py-3 text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">
              {date} · {setCount} {t("roster")}
            </p>
          </div>
          <span className="text-sm font-semibold text-indigo-600">{volume}</span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {open && (
          <div className="border-t border-border py-3">
            <WorkoutNotes workoutId={workoutId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
