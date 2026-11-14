"use client";

import { sessionHref } from "@/lib/routes";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { History, Loader2, Trophy } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useExercises } from "@/hooks/useExercises";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { exerciseHistory } from "@/lib/exerciseHistory";
import { exerciseDescription, useExerciseLabel } from "@/lib/exerciseNames";
import { demoVideo } from "@/lib/demoVideos";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { VideoEmbed } from "@/components/domain/VideoEmbed";

type Metric = "oneRepMax" | "topKg" | "volume" | "bestReps";

/**
 * One exercise as one did it: the curve of the estimated 1RM, the heaviest
 * set or the volume, the records and when they were set, and every session
 * with its sets — the answer to "how much did I do last time?".
 */
export default function ExerciseHistoryPage() {
  const t = useTranslations("exerciseHistory");
  const xl = useExerciseLabel();
  const locale = useLocale();
  const { num, day } = useFormat();
  const exerciseId = Number(useParams().id);
  const exercises = useExercises();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const exercise = exercises.find((e) => e.id === exerciseId);
  const history = useMemo(() => exerciseHistory(exerciseId, workouts, sets), [exerciseId, workouts, sets]);
  const weighted = history.sessions.some((s) => s.topKg);
  const [metric, setMetric] = useState<Metric | null>(null);
  const shown: Metric = metric ?? (weighted ? "oneRepMax" : "bestReps");
  const data = useMemo(
    () => [...history.sessions].reverse().map((s) => ({ date: s.date, value: s[shown] ?? null })),
    [history, shown]
  );

  if (!exercise) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  const video = demoVideo(exercise.name, exercise.videoUrl);
  const { records } = history;
  const metrics: Metric[] = weighted ? ["oneRepMax", "topKg", "volume", "bestReps"] : ["bestReps"];

  return (
    <>
      <PageHeader title={xl(exercise.name)} showBack />
      <div className="space-y-5 p-4 pb-28">
        {history.sessions.length === 0 ? (
          <EmptyState icon={History} title={t("empty")} />
        ) : (
          <>
            {/* Records */}
            <section className="grid grid-cols-2 gap-2">
              {records.heaviest && (
                <Record label={t("heaviest")} value={`${num(records.heaviest.value.kg)} kg × ${records.heaviest.value.reps}`} date={day(records.heaviest.date)} />
              )}
              {records.oneRepMax && <Record label={t("oneRepMax")} value={`${num(records.oneRepMax.value)} kg`} date={day(records.oneRepMax.date)} />}
              {records.volume && <Record label={t("volume")} value={`${num(records.volume.value, 0)} kg`} date={day(records.volume.date)} />}
              {records.reps && <Record label={t("reps")} value={num(records.reps.value, 0)} date={day(records.reps.date)} />}
            </section>

            {/* Curve */}
            {history.sessions.length >= 2 && (
              <section className="t-surface space-y-3 rounded-2xl p-3">
                <div className="flex flex-wrap gap-1.5">
                  {metrics.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetric(m)}
                      aria-pressed={shown === m}
                      className={cn(
                        "min-h-9 rounded-full border px-3 text-xs font-medium",
                        shown === m ? "border-accent-500 bg-accent-500 text-white" : "border-border text-muted-foreground"
                      )}
                    >
                      {t(`metric_${m}`)}
                    </button>
                  ))}
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => day(d).slice(0, 5)} />
                      <YAxis tick={{ fontSize: 10 }} width={44} tickFormatter={(v: number) => num(v)} domain={["auto", "auto"]} />
                      <Tooltip labelFormatter={(d) => day(String(d))} formatter={(v) => [num(Number(v)), t(`metric_${shown}`)]} />
                      <Line type="monotone" dataKey="value" stroke="var(--accent-500)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Sessions */}
            <section className="space-y-2">
              <SectionHeading>{t("sessions", { count: history.sessions.length })}</SectionHeading>
              {history.sessions.map((s) => (
                <Link key={s.workoutId} href={sessionHref(s.workoutId)} className="t-surface block rounded-2xl p-3 ring-1 ring-foreground/5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{day(s.date)}</p>
                    {s.oneRepMax && <p className="text-xs text-muted-foreground">{t("estimated", { kg: num(s.oneRepMax) })}</p>}
                  </div>
                  {s.title && <p className="truncate text-xs text-muted-foreground">{s.title}</p>}
                  <p className="mt-1 text-sm tabular-nums">
                    {s.sets
                      .map((set) => `${set.weightKg ? `${num(set.weightKg)} × ` : ""}${set.reps}${set.rpe ? ` @${set.rpe}` : ""}`)
                      .join(" · ")}
                  </p>
                </Link>
              ))}
            </section>
          </>
        )}

        {(exerciseDescription(exercise, locale) || video) && (
          <section className="space-y-2">
            <SectionHeading>{t("howTo")}</SectionHeading>
            {exerciseDescription(exercise, locale) && <p className="text-sm text-muted-foreground">{exerciseDescription(exercise, locale)}</p>}
            {video && <VideoEmbed url={video} />}
          </section>
        )}
      </div>
    </>
  );
}

function Record({ label, value, date }: { label: string; value: string; date: string }) {
  return (
    <div className="t-surface rounded-2xl p-3 ring-1 ring-foreground/5">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{date}</p>
    </div>
  );
}
