"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CalendarClock, Gauge, Loader2 } from "lucide-react";
import { getCurrentUserIdSync } from "@/db";
import { useRouter } from "@/i18n/navigation";
import { createProgram, usePrograms } from "@/hooks/usePrograms";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { isTestProgram, RETEST_WEEKS, testsDue, testStructure } from "@/lib/levelTests";
import { exerciseSeries } from "@/lib/programReview";
import { findWorkoutProgramDay, startWorkoutFromDay } from "@/lib/startWorkout";
import { localDate } from "@/lib/dates";
import { sessionHref } from "@/lib/routes";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useMetric } from "@/components/domain/ProgramReviewCard";
import { RequireFeature } from "@/components/domain/UpgradeNotice";

/**
 * Level tests: the main lifts and the bodyweight basics, done again every six
 * weeks, each result next to the ones before. The lifts give the estimated
 * 1RM the programs in percentages use.
 */
function TestsPageContent() {
  const t = useTranslations("tests");
  const xl = useExerciseLabel();
  const { short, day } = useFormat();
  const metric = useMetric();
  const router = useRouter();
  const programs = usePrograms();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const exercises = useExercises();
  const today = localDate();
  const [busy, setBusy] = useState<number | "create" | null>(null);

  const me = getCurrentUserIdSync();
  const program = programs.find((p) => isTestProgram(p) && (!p.ownerUserId || p.ownerUserId === me) && !p.assignedToUserId);
  const due = program ? testsDue({ program, workouts, today }) : null;
  const series = program ? exerciseSeries({ program, workouts, sets, exercises }) : [];

  async function create() {
    setBusy("create");
    try {
      await createProgram({
        name: t("programName"),
        description: t("programDescription"),
        structure: testStructure({ strength: t("dayStrength"), bodyweight: t("dayBodyweight") }),
      });
    } finally {
      setBusy(null);
    }
  }

  async function start(index: number) {
    if (!program) return;
    const running = workouts.find((w) => w.date === today && findWorkoutProgramDay([program], w)?.index === index);
    if (running?.id) return router.push(sessionHref(running.id));
    setBusy(index);
    try {
      const id = await startWorkoutFromDay(program, index, exercises, today);
      router.push(sessionHref(id));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="space-y-5 p-4 pb-28">
        <section className="t-hero space-y-3 rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-text">
              <Gauge className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">{t("intro", { weeks: RETEST_WEEKS })}</p>
          </div>
          {!program ? (
            <Button size="lg" className="w-full rounded-full" onClick={create} disabled={busy !== null}>
              {busy === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("create")}
            </Button>
          ) : (
            <>
              {due && (
                <p className={cn("flex items-center gap-2 text-sm font-medium", due.due ? "text-accent-text" : "text-muted-foreground")}>
                  <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                  {due.due ? t("dueNow", { date: day(due.last) }) : t("dueOn", { date: day(due.next) })}
                </p>
              )}
              <div className="grid gap-2">
                {program.structure.map((d, index) => (
                  <Button key={index} variant={index === 0 ? "default" : "outline"} className="justify-between rounded-full" onClick={() => start(index)} disabled={busy !== null}>
                    <span>{t("start", { name: d.name })}</span>
                    {busy === index ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("how")}</p>
            </>
          )}
        </section>

        {program && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">{t("results")}</h2>
            {series.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noResults")}</p>
            ) : (
              <ul className="space-y-2">
                {series.map((x) => {
                  const points = x.points.slice(-3);
                  const last = points.at(-1)!;
                  const before = points.at(-2);
                  const change = before && before.value > 0 ? Math.round(((last.value - before.value) / before.value) * 100) : null;
                  return (
                    <li key={x.exerciseId} className="t-surface rounded-2xl p-3 ring-1 ring-foreground/5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{xl(x.name)}</p>
                        {change !== null && (
                          <span className={cn("text-xs font-semibold tabular-nums", change > 0 ? "text-success-text" : change < 0 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
                            {change > 0 ? `+${change}` : change} %
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex gap-2">
                        {points.map((p) => (
                          <div key={p.date} className={cn("flex-1 rounded-lg p-1.5 text-center", p === last ? "bg-accent-500/15" : "bg-muted/60")}>
                            <p className="text-sm font-bold tabular-nums">{metric(x.kind, p.value)}</p>
                            <p className="text-xs text-muted-foreground">{short(p.date)}</p>
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {series.some((x) => x.kind === "load") && <p className="text-xs text-muted-foreground">{t("loadHint")}</p>}
          </section>
        )}
      </div>
    </>
  );
}

export default function TestsPage() {
  return (
    <RequireFeature feature="level_tests" namespace="tests">
      <TestsPageContent />
    </RequireFeature>
  );
}
