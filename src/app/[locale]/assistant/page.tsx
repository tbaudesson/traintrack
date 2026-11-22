"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Check, ListPlus, MinusCircle, Repeat, Sparkles, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCoach } from "@/hooks/useCoach";
import { useInsights } from "@/hooks/useInsights";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { usePainReports } from "@/hooks/usePain";
import { useReadiness } from "@/hooks/useReadiness";
import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { localDate } from "@/lib/dates";
import type { CoachProposal } from "@/lib/coach";
import { PageHeader } from "@/components/layout/PageHeader";
import { WeekFitCard } from "@/components/domain/WeekFitCard";
import { AskCoach } from "@/components/domain/AskCoach";
import { SectionHeading } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { InsightAction, InsightCard, MoreInsights } from "@/components/domain/InsightCard";

const ICON = { skipped: Repeat, progress: ListPlus, shortened: MinusCircle, missedDay: CalendarDays } as const;

/**
 * The assistant: what one's sessions say, and what to change in one's
 * programs because of them. Every proposal shows what it saw and the exact
 * change; nothing changes until "Apply", and an applied change stays in the
 * program's history, to go back.
 */
export default function AssistantPage() {
  const t = useTranslations("assistant");
  const locale = useLocale();
  const router = useRouter();
  const xl = useExerciseLabel();
  const today = localDate();
  const { proposals, ignore, apply, planned, workouts: allWorkouts, profile: me } = useCoach();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const pains = usePainReports();
  const readiness = useReadiness();
  const profile = useAthleteProfileOrNull();
  const exercises = useExercises();
  const reading = useInsights({ today, workouts, sets, pains, readiness, profile });
  const exerciseName = (id: number) => exercises.find((e) => e.id === id)?.name;
  const [done, setDone] = useState<{ id: string; programId: number } | null>(null);
  const weekday = (d: number) => new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(Date.UTC(2026, 10, 15 + d, 12)));

  /** What the proposal would change, in words. */
  const changeText = (p: CoachProposal) => {
    const c = p.change;
    switch (c.type) {
      case "replace":
        return t("change_replace", { from: xl(c.from), to: xl(c.to) });
      case "remove":
        return t("change_remove", { exercise: xl(c.exercise) });
      case "addSet":
        return t("change_addSet", { exercise: xl(c.exercise) });
      case "trimDay":
        return t("change_trimDay");
      case "moveWeekday":
        return t("change_moveWeekday", { from: weekday(c.from), to: weekday(c.to) });
    }
  };
  const evidenceText = (p: CoachProposal) =>
    p.evidence.map((e) => t(`why_${e.key}`, e.key === "missedDay" ? { ...e.values, weekday: weekday(Number(e.values.weekday)) } : e.values)).join(" ");

  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-28">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>

        {/* This week's time, and the planning fitted to it. */}
        <WeekFitCard planned={planned} workouts={allWorkouts} profile={me} today={today} />

        <section className="space-y-3" aria-labelledby="assistant-programs">
          <SectionHeading id="assistant-programs">{t("programsTitle")}</SectionHeading>
          {done && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{t("applied")}</span>
              <Link href={`/programs/${done.programId}`} className="font-semibold underline">{t("seeProgram")}</Link>
            </p>
          )}
          {proposals.length === 0 ? (
            <p className="t-panel rounded-2xl p-4 text-sm text-muted-foreground">{t("nothing")}</p>
          ) : (
            proposals.map((p) => {
              const Icon = ICON[p.kind];
              return (
                <article key={p.id} className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5" aria-label={t(`kind_${p.kind}`)}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-text dark:bg-accent-900/30">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{t(`kind_${p.kind}`)}</p>
                      <p className="text-xs text-muted-foreground">{[p.program, p.day].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">{t("why")} </span>
                    {evidenceText(p)}
                  </p>
                  <p className="rounded-xl bg-muted/60 p-3 text-sm">
                    <span className="font-medium">{t("proposal")} </span>
                    {changeText(p)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 rounded-full"
                      onClick={async () => {
                        const programId = await apply(p);
                        if (programId) setDone({ id: p.id, programId });
                      }}
                    >
                      <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                      {t("apply")}
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-full" onClick={() => ignore(p)}>
                      <X className="mr-1 h-4 w-4" aria-hidden="true" />
                      {t("ignore")}
                    </Button>
                  </div>
                </article>
              );
            })
          )}
          <p className="text-xs text-muted-foreground">{t("control")}</p>
        </section>

        {/* The insight card carries its own heading ("What your last 4 weeks say"). */}
        <section className="space-y-3" aria-label={t("readingTitle")}>
          {reading.insights[0] ? (
            <>
              <InsightCard insight={reading.insights[0]} period={reading.period} exerciseName={exerciseName} canShow={() => true} onShowChart={() => router.push("/progress")}>
                <InsightAction insight={reading.insights[0]} exerciseName={exerciseName} />
              </InsightCard>
              <MoreInsights items={reading.insights.slice(1)} exerciseName={exerciseName} />
            </>
          ) : (
            <p className="t-panel rounded-2xl p-4 text-sm text-muted-foreground">{t("noReading")}</p>
          )}
        </section>

        {/* Optional: a question in one's own words, answered by Claude from one's data. */}
        <AskCoach proposals={proposals} />

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("how")}
        </p>
      </div>
    </>
  );
}
