"use client";

import { useLocale, useTranslations } from "next-intl";
import { PersonStanding, RotateCcw, Trash2 } from "lucide-react";
import type { Workout } from "@/db";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteWorkout } from "@/hooks/useWorkouts";
import { useMobilityGuidance } from "@/hooks/useMobilityGuidance";
import { useFormat } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { WorkoutNotes } from "@/components/domain/WorkoutNotes";
import { MobilityRating } from "@/components/domain/MobilityRating";

/**
 * A warm-up or stretch kept: when, how long, the moves done, how supple one
 * felt (changed any time), notes; done again or deleted from here.
 */
export function MobilityWorkoutView({ workout }: { workout: Workout }) {
  const t = useTranslations("mobilityLog");
  const tm = useTranslations("mobility");
  const locale = useLocale() as "fr" | "en" | "de";
  const router = useRouter();
  const { day } = useFormat();
  const guidance = useMobilityGuidance();
  const log = workout.mobility;
  const minutes = Math.max(1, Math.round((workout.durationSec ?? 0) / 60));
  const nameOf = (key: string) => guidance?.moves.find((m) => m.key === key)?.name[locale] ?? key;

  return (
    <>
      <PageHeader title={workout.title || tm("title")} showBack />
      <div className="space-y-4 p-4 pb-28">
        <div className="t-hero space-y-1 rounded-2xl p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <PersonStanding className="h-4 w-4" aria-hidden="true" />
            {day(workout.date)} · {minutes} min
          </p>
          {log && <p className="text-sm">{t("movesDone", { count: log.moves.length })}</p>}
        </div>

        {log && workout.id && (
          <div className="t-panel rounded-2xl p-4">
            <MobilityRating workoutId={workout.id} log={log} />
          </div>
        )}

        {log && log.moves.length > 0 && (
          <ol className="t-surface space-y-1 rounded-2xl p-3 text-sm ring-1 ring-foreground/5">
            {log.moves.map((k, i) => (
              <li key={k} className="flex gap-2">
                <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                {nameOf(k)}
              </li>
            ))}
          </ol>
        )}

        <WorkoutNotes workoutId={workout.id!} />

        {log && (
          <Link href={`/mobility?mode=${log.mode}`}>
            <Button variant="outline" className="w-full rounded-full">
              <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("again")}
            </Button>
          </Link>
        )}
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
