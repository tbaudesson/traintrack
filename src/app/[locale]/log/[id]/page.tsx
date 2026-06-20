"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useWorkout } from "@/hooks/useWorkouts";
import { useWorkoutSets, addWorkoutSet, updateWorkoutSet, deleteWorkoutSet } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Check, Trash2, Timer, X, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SessionLoggerPage() {
  const t = useTranslations("log");
  const params = useParams();
  const router = useRouter();
  const workoutId = Number(params.id);
  const workout = useWorkout(workoutId);
  const sets = useWorkoutSets(workoutId);
  const exercises = useExercises();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [rest, setRest] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  // Group sets by exercise, preserving insertion order
  const groups = useMemo(() => {
    const m = new Map<number, typeof sets>();
    for (const s of sets) {
      if (!m.has(s.exerciseId)) m.set(s.exerciseId, []);
      m.get(s.exerciseId)!.push(s);
    }
    return [...m.entries()];
  }, [sets]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startRest(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setRest(seconds);
    timerRef.current = setInterval(() => {
      setRest((r) => {
        if (r === null) return null;
        if (r <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return null;
        }
        return r - 1;
      });
    }, 1000);
  }

  async function addExercise(exerciseId: number) {
    await addWorkoutSet({ workoutId, exerciseId, setNumber: 1, completed: false });
    setPickerOpen(false);
  }

  async function addSet(exerciseId: number, lastSetNumber: number) {
    await addWorkoutSet({ workoutId, exerciseId, setNumber: lastSetNumber + 1, completed: false });
  }

  async function toggleDone(setId: number, completed: boolean, restSec?: number) {
    await updateWorkoutSet(setId, { completed: !completed });
    if (!completed) startRest(restSec && restSec > 0 ? restSec : 90);
  }

  return (
    <>
      <PageHeader
        title={workout?.title || t("title")}
        showBack
        actions={
          <Button size="sm" onClick={() => router.push("/log")}>
            {t("finishWorkout")}
          </Button>
        }
      />

      <div className="space-y-4 p-4 pb-28">
        {groups.length === 0 && (
          <p className="rounded-lg bg-card/60 py-8 text-center text-sm text-muted-foreground">
            {t("noExercises")}
          </p>
        )}

        {groups.map(([exerciseId, exSets]) => {
          const ex = exMap.get(exerciseId);
          const last = exSets[exSets.length - 1];
          return (
            <Card key={exerciseId}>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-indigo-500" />
                  <h3 className="flex-1 font-semibold">{ex?.name ?? "?"}</h3>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem_2rem] items-center gap-2 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>{t("set")}</span>
                  <span>{t("weight")}</span>
                  <span>{t("reps")}</span>
                  <span>{t("rpe")}</span>
                  <span></span>
                  <span></span>
                </div>

                {exSets.map((s) => (
                  <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem_2rem] items-center gap-2">
                    <span className="text-center text-sm font-medium text-muted-foreground">{s.setNumber}</span>
                    <NumCell value={s.weightKg} onChange={(v) => s.id && updateWorkoutSet(s.id, { weightKg: v })} />
                    <NumCell value={s.reps} onChange={(v) => s.id && updateWorkoutSet(s.id, { reps: v })} />
                    <NumCell value={s.rpe} onChange={(v) => s.id && updateWorkoutSet(s.id, { rpe: v })} />
                    <button
                      onClick={() => s.id && toggleDone(s.id, s.completed, s.restSec)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md border",
                        s.completed
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => s.id && deleteWorkoutSet(s.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => addSet(exerciseId, last?.setNumber ?? 0)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("addSet")}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("addExercise")}
        </Button>
      </div>

      {/* Rest timer */}
      {rest !== null && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-indigo-600 px-5 py-2.5 text-white shadow-lg">
          <Timer className="h-4 w-4" />
          <span className="font-mono text-lg font-semibold tabular-nums">
            {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
          </span>
          <button onClick={() => setRest(null)} className="opacity-80 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Exercise picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("selectExercise")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {exercises.map((e) => (
              <button
                key={e.id}
                onClick={() => e.id && addExercise(e.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <Dumbbell className="h-4 w-4 text-indigo-500" />
                {e.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NumCell({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      defaultValue={value ?? ""}
      onBlur={(e) => {
        const v = e.target.value === "" ? undefined : Number(e.target.value);
        onChange(v);
      }}
      className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-center text-sm outline-none focus:border-indigo-500"
    />
  );
}
