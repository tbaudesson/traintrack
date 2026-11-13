"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useWorkouts, createWorkout } from "@/hooks/useWorkouts";
import { useTrainablePrograms } from "@/hooks/usePrograms";
import { useExercises } from "@/hooks/useExercises";
import type { Program } from "@/db";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Upload, Activity, Plus, Dumbbell, Calendar, Loader2, ClipboardList, RotateCcw } from "lucide-react";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";
import { daysToOffer, lastRepeatable, repeatWorkout, startWorkoutFromDay } from "@/lib/startWorkout";
import { describeTarget, formatDistance, isCardio } from "@/lib/cardio";
import { SportPicker } from "@/components/domain/SportPicker";
import { GpxImport } from "@/components/domain/GpxImport";
import type { Sport } from "@/db";
import { localDate } from "@/lib/dates";

export default function LogPage() {
  const t = useTranslations("log");
  const tPrograms = useTranslations("programs");
  const router = useRouter();
  const workouts = useWorkouts();
  const programs = useTrainablePrograms();
  const exercises = useExercises();
  const [busy, setBusy] = useState(false);
  const [sportOpen, setSportOpen] = useState(false);
  const tc = useTranslations("cardio");

  const today = localDate();
  const allSets = useAllWorkoutSets();
  const repeatable = lastRepeatable(workouts, allSets, today);

  async function repeatLast() {
    if (!repeatable) return;
    setBusy(true);
    const id = await repeatWorkout(repeatable, today);
    router.push(`/log/${id}`);
  }

  async function startCardio(sport: Sport) {
    setSportOpen(false);
    setBusy(true);
    const id = await createWorkout({ date: today, title: tc(`sport_${sport}`), kind: "cardio", sport });
    router.push(`/log/${id}`);
  }

  async function startEmpty() {
    setBusy(true);
    const id = await createWorkout({ date: today, title: t("newWorkout") });
    router.push(`/log/${id}`);
  }

  async function startFromProgramDay(program: Program, dayIndex: number) {
    setBusy(true);
    const id = await startWorkoutFromDay(program, dayIndex, exercises, today);
    router.push(`/log/${id}`);
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <Link href="/programs">
            <Button size="sm" variant="outline">
              <ClipboardList className="mr-1 h-4 w-4" />
              {tPrograms("title")}
            </Button>
          </Link>
        }
      />
      <div className="space-y-6 p-4 pb-24">
        <Button className="w-full" onClick={startEmpty} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />{t("newWorkout")}</>}
        </Button>

        {repeatable && (
          <DetailRow
            onClick={repeatLast}
            disabled={busy}
            icon={RotateCcw}
            title={t("repeatLast")}
            subtitle={`${repeatable.title || t("newWorkout")} · ${repeatable.date.split("-").reverse().join("/")}`}
          />
        )}

        <Button variant="outline" className="w-full" onClick={() => setSportOpen(true)} disabled={busy}>
          <Activity className="mr-1 h-4 w-4" aria-hidden="true" />
          {tc("newSession")}
        </Button>
        <GpxImport
          existing={workouts}
          onImported={({ workoutId }) => router.push(`/log/${workoutId}`)}
          trigger={(open) => (
            <Button variant="ghost" className="-mt-4 w-full text-accent-text" onClick={open} disabled={busy}>
              <Upload className="mr-1 h-4 w-4" aria-hidden="true" />
              {tc("importGpx")}
            </Button>
          )}
        />
        <SportPicker open={sportOpen} onOpenChange={setSportOpen} onPick={startCardio} />

        {/* Start from a program */}
        {programs.length > 0 && (
          <section className="space-y-2">
            <SectionHeading>{t("selectExercise")}</SectionHeading>
            {programs.map((p) =>
              daysToOffer(p, workouts).map(({ day, index: di }) => (
                <DetailRow
                  key={`${p.id}-${di}`}
                  onClick={() => startFromProgramDay(p, di)}
                  disabled={busy}
                  icon={Dumbbell}
                  title={`${p.name} — ${day.name}`}
                  subtitle={day.cardio ? describeTarget(day.cardio) : `${day.exercises.length} · ${t("addExercise")}`}
                />
              ))
            )}
          </section>
        )}

        {/* History */}
        <section className="space-y-2">
          <SectionHeading>{t("history")}</SectionHeading>
          {workouts.length === 0 ? (
            <EmptyState icon={Calendar} title={t("noWorkouts")} />
          ) : (
            workouts.map((w) => (
              <DetailRow
                key={w.id}
                onClick={() => router.push(`/log/${w.id}`)}
                icon={Calendar}
                tone="neutral"
                title={w.title || t("title")}
                subtitle={isCardio(w) && w.distanceM ? `${w.date} · ${formatDistance(w.distanceM, w.sport)}` : w.date}
              />
            ))
          )}
        </section>
      </div>
    </>
  );
}
