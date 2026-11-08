"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useWorkouts, createWorkout } from "@/hooks/useWorkouts";
import { usePrograms } from "@/hooks/usePrograms";
import { useExercises, createCustomExercise } from "@/hooks/useExercises";
import { addWorkoutSet } from "@/hooks/useWorkoutSets";
import type { ProgramDay } from "@/db";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Dumbbell, Calendar, Loader2, ClipboardList } from "lucide-react";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";

export default function LogPage() {
  const t = useTranslations("log");
  const tPrograms = useTranslations("programs");
  const router = useRouter();
  const workouts = useWorkouts();
  const programs = usePrograms();
  const exercises = useExercises();
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  async function startEmpty() {
    setBusy(true);
    const id = await createWorkout({ date: today, title: t("newWorkout") });
    router.push(`/log/${id}`);
  }

  async function startFromProgramDay(programName: string, day: ProgramDay) {
    setBusy(true);
    const id = await createWorkout({ date: today, title: `${programName} — ${day.name}` });
    // Pre-fill sets from the program day's exercises
    for (const pe of day.exercises) {
      // Resolve the exercise by uuid or name; create a custom one if missing
      const ex = exercises.find(
        (e) => (pe.exerciseUuid && e.uuid === pe.exerciseUuid) || e.name.toLowerCase() === pe.exerciseName.toLowerCase()
      );
      let exerciseId = ex?.id;
      if (!exerciseId) {
        exerciseId = await createCustomExercise({ name: pe.exerciseName, muscleGroup: "other" });
      }
      const sets = Math.max(1, pe.targetSets || 1);
      for (let i = 1; i <= sets; i++) {
        await addWorkoutSet({
          workoutId: id,
          exerciseId,
          setNumber: i,
          restSec: pe.restSec,
          completed: false,
        });
      }
    }
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

        {/* Start from a program */}
        {programs.length > 0 && (
          <section className="space-y-2">
            <SectionHeading>{t("selectExercise")}</SectionHeading>
            {programs.map((p) =>
              (p.structure ?? []).map((day, di) => (
                <DetailRow
                  key={`${p.id}-${di}`}
                  onClick={() => startFromProgramDay(p.name, day)}
                  disabled={busy}
                  icon={Dumbbell}
                  title={`${p.name} — ${day.name}`}
                  subtitle={`${day.exercises.length} · ${t("addExercise")}`}
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
                subtitle={w.date}
              />
            ))
          )}
        </section>
      </div>
    </>
  );
}
