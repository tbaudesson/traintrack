"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, PartyPopper, Plus, TrendingUp } from "lucide-react";
import type { Exercise, Program, Workout, WorkoutSet } from "@/db";
import { useRouter } from "@/i18n/navigation";
import { createProgram } from "@/hooks/usePrograms";
import { useProgramTemplates } from "@/lib/templateService";
import { PROGRAM_TEMPLATES } from "@/lib/programTemplates";
import { nextPrograms, programReview, type MetricKind } from "@/lib/programReview";
import { nextMonday } from "@/lib/programWeek";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** A value as it is measured: kilos of estimated 1RM, reps, or seconds held. */
export function useMetric() {
  const t = useTranslations("review");
  const { num } = useFormat();
  return (kind: MetricKind, value: number) =>
    kind === "load" ? `${num(Math.round(value))} kg` : kind === "seconds" ? t("seconds", { n: Math.round(value) }) : t("reps", { n: Math.round(value) });
}

/**
 * What a program brought: sessions, kilos, the exercises that moved most.
 * Once a plan is over, what to follow next, on the same days from Monday.
 */
export function ProgramReviewCard({
  program,
  workouts,
  sets,
  exercises,
  today,
  canFollow,
}: {
  program: Program;
  workouts: Workout[];
  sets: WorkoutSet[];
  exercises: Exercise[];
  today: string;
  /** The athlete may add a program of their own (not a coach's copy). */
  canFollow: boolean;
}) {
  const t = useTranslations("review");
  const xl = useExerciseLabel();
  const { num, short } = useFormat();
  const metric = useMetric();
  const router = useRouter();
  const catalogue = useProgramTemplates();
  const [adding, setAdding] = useState<string | null>(null);
  const review = useMemo(() => programReview({ program, workouts, sets, exercises, today }), [program, workouts, sets, exercises, today]);
  const next = useMemo(
    () => (review.finished && canFollow ? nextPrograms(program, [...catalogue, ...PROGRAM_TEMPLATES.filter((x) => !catalogue.some((c) => c.name === x.name))]) : []),
    [review.finished, canFollow, program, catalogue]
  );
  if (review.sessions < 2 && !review.finished) return null;

  async function follow(name: string) {
    const tpl = next.find((x) => x.name === name);
    if (!tpl) return;
    setAdding(name);
    try {
      const id = await createProgram({
        name: tpl.name,
        description: tpl.description,
        structure: tpl.structure,
        startDate: nextMonday(today),
        weekdays: program.weekdays ?? null,
      });
      router.push(`/programs/${id}`);
    } finally {
      setAdding(null);
    }
  }

  return (
    <section id="bilan" className="t-surface scroll-mt-20 space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        {review.finished ? <PartyPopper className="h-5 w-5 text-accent-text" aria-hidden="true" /> : <TrendingUp className="h-5 w-5 text-accent-text" aria-hidden="true" />}
        {review.finished ? t("finishedTitle") : t("title")}
      </h2>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Figure value={review.planned ? `${Math.min(review.sessions, review.planned)}/${review.planned}` : String(review.sessions)} label={t("sessions")} />
        <Figure value={`${num(Math.round(review.volume / 100) / 10)} t`} label={t("volume")} />
        <Figure value={review.first ? short(review.first) : "–"} label={t("since")} />
      </div>
      {review.progress.length > 0 ? (
        <ul className="space-y-1.5">
          {review.progress.slice(0, 6).map((p) => (
            <li key={p.exerciseId} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{xl(p.name)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {metric(p.kind, p.from)} → {metric(p.kind, p.best)}
              </span>
              <span
                className={cn(
                  "w-14 shrink-0 text-right text-xs font-semibold tabular-nums",
                  p.change > 0 ? "text-success-text" : "text-muted-foreground"
                )}
              >
                {p.change > 0 ? `+${p.change} %` : "="}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noProgress")}</p>
      )}
      {review.progress.some((p) => p.kind === "load") && <p className="text-xs text-muted-foreground">{t("loadHint")}</p>}

      {next.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="text-sm font-semibold">{t("nextTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("nextHint")}</p>
          {next.map((x) => (
            <div key={x.name} className="flex items-center gap-2 rounded-xl bg-muted/60 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{x.name}</p>
                <p className="text-xs text-muted-foreground">{t(`level_${x.level}`)} · {t("perWeek", { count: x.daysPerWeek })}</p>
              </div>
              <Button size="sm" onClick={() => follow(x.name)} disabled={adding !== null}>
                {adding === x.name ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                <span className="ml-1">{t("follow")}</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-2">
      <p className="text-base font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
