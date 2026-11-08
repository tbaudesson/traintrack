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
import { Plus, Dumbbell, Calendar, Loader2, ClipboardList } from "lucide-react";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";
import { startWorkoutFromDay } from "@/lib/startWorkout";

export default function LogPage() {
  const t = useTranslations("log");
  const tPrograms = useTranslations("programs");
  const router = useRouter();
  const workouts = useWorkouts();
  const programs = useTrainablePrograms();
  const exercises = useExercises();
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().split("T")[0];

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

        {/* Start from a program */}
        {programs.length > 0 && (
          <section className="space-y-2">
            <SectionHeading>{t("selectExercise")}</SectionHeading>
            {programs.map((p) =>
              (p.structure ?? []).map((day, di) => (
                <DetailRow
                  key={`${p.id}-${di}`}
                  onClick={() => startFromProgramDay(p, di)}
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
