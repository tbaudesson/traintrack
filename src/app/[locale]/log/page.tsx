"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useWorkouts, createWorkout } from "@/hooks/useWorkouts";
import { usePrograms } from "@/hooks/usePrograms";
import { useExercises, createCustomExercise } from "@/hooks/useExercises";
import { addWorkoutSet } from "@/hooks/useWorkoutSets";
import type { ProgramDay } from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Dumbbell, Calendar, ChevronRight, Loader2 } from "lucide-react";

export default function LogPage() {
  const t = useTranslations("log");
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
      let ex = exercises.find(
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
      <PageHeader title={t("title")} />
      <div className="space-y-6 p-4 pb-24">
        <Button className="w-full" onClick={startEmpty} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />{t("newWorkout")}</>}
        </Button>

        {/* Start from a program */}
        {programs.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{t("selectExercise")}</h2>
            {programs.map((p) =>
              (p.structure ?? []).map((day, di) => (
                <Card key={`${p.id}-${di}`} className="active:scale-[0.99]">
                  <CardContent className="py-0">
                    <button
                      onClick={() => startFromProgramDay(p.name, day)}
                      disabled={busy}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                        <Dumbbell className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{p.name} — {day.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {day.exercises.length} · {t("addExercise")}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </button>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        )}

        {/* History */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("history")}</h2>
          {workouts.length === 0 ? (
            <p className="rounded-lg bg-card/60 py-6 text-center text-sm text-muted-foreground">{t("noWorkouts")}</p>
          ) : (
            workouts.map((w) => (
              <Card key={w.id}>
                <CardContent className="py-0">
                  <button
                    onClick={() => router.push(`/log/${w.id}`)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{w.title || t("title")}</p>
                      <p className="text-xs text-muted-foreground">{w.date}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </button>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>
    </>
  );
}
