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
import { SessionDetail } from "@/components/domain/SessionDetail";
import { useExercises } from "@/hooks/useExercises";
import type { Exercise, WorkoutSet } from "@/db";
import { SectionHeading } from "@/components/ui/page-parts";
import { formatDistance, formatDuration, isCardio } from "@/lib/cardio";
import { localDate } from "@/lib/dates";
import { useTeamAdherence } from "@/hooks/useClientActivity";
import { NudgeButton } from "@/components/domain/NudgeButton";
import { GoalsSection } from "@/components/domain/GoalsSection";

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
  const exercises = useExercises();
  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const readiness = useReadiness(userId);
  const today = localDate();
  const nutritionToday = useNutritionForDate(today, userId);
  const macros = sumMacros(nutritionToday);

  const clientProfile = useLiveQuery(
    async () => (await db.athleteProfiles.toArray()).find((p) => !p.deletedAt && p.userId === userId),
    [userId]
  );
  const targets = clientProfile?.nutritionTargets;

  const lastActivity = workouts[0]?.date ?? null;

  const adherence = useTeamAdherence([userId])?.get(userId);
  const thisWeek = adherence?.weeks.at(-1);

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
              <p className="text-lg font-bold">
                {thisWeek ? (thisWeek.planned !== null ? `${thisWeek.done}/${thisWeek.planned}` : thisWeek.done) : "–"}
              </p>
              <p className="text-xs text-muted-foreground">{t("adherenceThisWeek")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <TrendingUp className="h-5 w-5 text-accent-500" />
              <p className="text-lg font-bold">{totalVolume.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{tp("volume")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs font-bold">{lastActivity ?? t("never")}</p>
              <p className="text-xs text-muted-foreground">{t("lastActivity")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Adherence over four weeks */}
        {adherence && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" /> {t("adherenceTitle")}
            </h2>
            <Card>
              <CardContent className="space-y-3 py-3">
                <div className="flex items-end gap-3">
                  {adherence.weeks.map((week, _, all) => {
                    // One scale for the four weeks, so a busier week shows taller.
                    const target = Math.max(1, ...all.map((w) => Math.max(w.planned ?? 0, w.done)));
                    return (
                      <div key={week.monday} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex h-20 w-full items-end gap-1" title={`${week.done}${week.planned !== null ? ` / ${week.planned}` : ""}`}>
                          {week.planned !== null && (
                            <div className="w-1/2 rounded-sm bg-muted" style={{ height: `${(week.planned / target) * 100}%` }} />
                          )}
                          <div
                            className={cn(
                              "flex-1 rounded-sm",
                              week.planned === null || week.done >= week.planned ? "bg-green-500" : "bg-amber-500"
                            )}
                            style={{ height: `${Math.max(4, (week.done / target) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {week.done}{week.planned !== null ? `/${week.planned}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">{week.monday.slice(8)}/{week.monday.slice(5, 7)}</span>
                      </div>
                    );
                  })}
                </div>
                <NudgeButton userId={userId} adherence={adherence} />
                <p className="text-sm">
                  {adherence.rate !== null ? t("adherenceRate", { percent: Math.round(adherence.rate * 100) }) : t("adherenceNoPlan")}
                  {adherence.recentRpe !== null && ` · ${t("adherenceRpe", { rpe: adherence.recentRpe })}`}
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        <GoalsSection profile={clientProfile} workouts={workouts} sets={sets} exercises={exercises} editable={false} />

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
                    {m.tgt ? <p className="text-xs text-muted-foreground">/ {m.tgt}</p> : null}
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        <section className="space-y-2">
          <SectionHeading>{tp("title")}</SectionHeading>
          {workouts.length === 0 ? (
            <p className="rounded-lg bg-card/60 py-6 text-center text-sm text-muted-foreground">{tp("noData")}</p>
          ) : (
            workouts.map((w) => (
              <ClientWorkoutCard
                key={w.id}
                workoutId={w.id!}
                title={w.title || tp("title")}
                date={w.date}
                cardio={isCardio(w) ? [w.distanceM ? formatDistance(w.distanceM, w.sport) : null, w.durationSec ? formatDuration(w.durationSec) : null].filter(Boolean).join(" · ") : undefined}
                setCount={sets.filter((s) => s.workoutId === w.id).length}
                sets={sets.filter((s) => s.workoutId === w.id)}
                exercises={exMap}
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
  cardio,
  sets,
  exercises,
}: {
  sets: WorkoutSet[];
  exercises: Map<number | undefined, Exercise>;
  workoutId: number;
  title: string;
  date: string;
  setCount: number;
  volume: number;
  cardio?: string;
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
              {date} · {cardio ?? t("setsCount", { count: setCount })}
            </p>
          </div>
          {!cardio && <span className="text-sm font-semibold text-accent-text">{volume}</span>}
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {open && (
          <div className="space-y-3 border-t border-border py-3">
            {!cardio && <SessionDetail sets={sets} exercises={exercises} />}
            <WorkoutNotes workoutId={workoutId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
