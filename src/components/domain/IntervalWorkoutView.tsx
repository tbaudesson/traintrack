"use client";

import { TrimpLine } from "@/components/domain/TrimpLine";
import { SessionFeedback } from "@/components/domain/SessionFeedback";
import { useTranslations } from "next-intl";
import { Check, RotateCcw, Timer, Trash2 } from "lucide-react";
import type { Exercise, Workout, WorkoutSet } from "@/db";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteWorkout } from "@/hooks/useWorkouts";
import { BOXING_FOCUS, patternSeconds } from "@/lib/intervals";
import { roundLength } from "@/lib/boxing";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { useFormat } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { WorkoutNotes } from "@/components/domain/WorkoutNotes";

/**
 * A timed session once done: how long, in which rhythm, and how many
 * intervals of each exercise. Nothing to fill in; "Do it again" opens the
 * same session in the timer. Just finished, "Done" leads back home.
 */
export function IntervalWorkoutView({ workout, sets, exercises, justDone = false }: { workout: Workout; sets: WorkoutSet[]; exercises: Exercise[]; justDone?: boolean }) {
  const t = useTranslations("intervals");
  const xl = useExerciseLabel();
  const router = useRouter();
  const { day } = useFormat();
  const plan = workout.intervalPlan;
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  const byExercise = new Map<number, { count: number; seconds: number }>();
  for (const s of [...sets].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).filter((s) => s.completed)) {
    const c = byExercise.get(s.exerciseId) ?? { count: 0, seconds: 0 };
    c.count++;
    c.seconds += s.reps ?? 0;
    byExercise.set(s.exerciseId, c);
  }
  const effort = [...byExercise.values()].reduce((sum, c) => sum + c.seconds, 0);
  const minutes = Math.max(1, Math.round((workout.durationSec ?? 0) / 60));
  const rhythm = plan ? patternSeconds(plan.pattern) : null;
  // Boxing rounds: a round and its rest, each combination its own length.
  const boxing = plan?.focus === BOXING_FOCUS;
  const again = plan
    ? `/intervals?focus=${plan.focus}&dumbbells=${plan.dumbbells ? 1 : 0}&trx=${plan.trx ? 1 : 0}&pattern=${plan.pattern}&minutes=${plan.minutes}&seed=${plan.seed}`
    : "/intervals";

  return (
    <>
      <PageHeader title={workout.title || t("title")} showBack />
      <div className="space-y-4 p-4 pb-28">
        <div className="t-hero rounded-2xl p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" aria-hidden="true" />
            {day(workout.date)}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Fact value={`${minutes} min`} label={t("factDuration")} />
            <Fact value={`${Math.round(effort / 60)} min`} label={t("factEffort")} />
            <Fact value={String(sets.filter((s) => s.completed).length)} label={t("factIntervals")} />
          </div>
          {(workout.roundsDone || workout.avgHr) && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              {workout.roundsDone ? <Fact value={String(workout.roundsDone)} label={t("factRounds")} /> : null}
              {workout.avgHr ? <Fact value={`${workout.avgHr} · ${workout.maxHr ?? "—"}`} label={t("factHeart")} /> : null}
            </div>
          )}
          {workout.avgHr ? <div className="mt-3"><TrimpLine workout={workout} /></div> : null}
          {plan && rhythm && (
            <p className="mt-3 text-sm text-muted-foreground">
              {boxing
                ? `${t("focus_boxing")} · ${t("roundLabel", { round: roundLength(rhythm.work), rest: rhythm.rest })}`
                : `${t(`focus_${plan.focus}`)} · ${plan.dumbbells ? t("dumbbells") : t("bodyweight")} · ${t("patternLabel", rhythm)}`}
            </p>
          )}
        </div>

        <SessionFeedback workout={workout} />

        <ul className="space-y-1.5">
          {[...byExercise.entries()].map(([exerciseId, c]) => (
            <li key={exerciseId} className="t-surface flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-foreground/5">
              <span className="flex-1 text-sm font-medium">{xl(names.get(exerciseId))}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{t("timesSeconds", { count: c.count, seconds: boxing || !rhythm ? Math.round(c.seconds / c.count) : rhythm.work })}</span>
            </li>
          ))}
        </ul>

        {justDone && (
          <Button className="h-12 w-full rounded-full" onClick={() => router.push("/")}>
            <Check className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("finished")}
          </Button>
        )}

        <Link href={again} className="block">
          <Button variant={justDone ? "outline" : "default"} className="h-12 w-full rounded-full">
            <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("again")}
          </Button>
        </Link>

        <WorkoutNotes workoutId={workout.id!} />

        <Button
          variant="ghost"
          className="w-full text-destructive"
          onClick={async () => {
            if (!confirm(t("deleteConfirm"))) return;
            await deleteWorkout(workout.id!);
            router.push("/log");
          }}
        >
          <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("delete")}
        </Button>
      </div>
    </>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
