"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Goal, Plus, Trash2 } from "lucide-react";
import type { AthleteProfile, Exercise, Workout, WorkoutSet } from "@/db";
import { updateTrainingSchedule } from "@/hooks/useAthleteProfile";
import { localDate } from "@/lib/dates";
import { goalProgress, oneRepMaxHistory, type StrengthGoal } from "@/lib/goals";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const SELECT = "mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base";
const frDate = (date: string) => date.split("-").reverse().join("/");

/**
 * The athlete's strength goals: how far along each one is, when it was
 * reached, or when the trend says it will be. Editable by the athlete,
 * read-only for the coach.
 */
export function GoalsSection({
  profile,
  workouts,
  sets,
  exercises,
  editable,
}: {
  profile: AthleteProfile | undefined;
  workouts: Workout[];
  sets: WorkoutSet[];
  exercises: Exercise[];
  editable: boolean;
}) {
  const t = useTranslations("goals");
  const [adding, setAdding] = useState(false);
  const [exerciseId, setExerciseId] = useState<number | "">("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const goals = profile?.strengthGoals ?? [];
  const today = localDate();

  const resolve = (goal: StrengthGoal) =>
    exercises.find((e) => (goal.exerciseUuid && e.uuid === goal.exerciseUuid) || e.name === goal.exerciseName);
  const historyOf = (id: number | undefined) => (id === undefined ? [] : oneRepMaxHistory(id, workouts, sets));

  // Exercises already trained come first in the picker.
  const trained = new Set(sets.filter((s) => s.completed).map((s) => s.exerciseId));
  const choices = [...exercises].sort((a, b) => Number(trained.has(b.id!)) - Number(trained.has(a.id!)) || a.name.localeCompare(b.name));

  async function add() {
    const exercise = exercises.find((e) => e.id === exerciseId);
    const targetKg = Number(target.replace(",", "."));
    if (!exercise || !(targetKg > 0)) return;
    const best = Math.max(0, ...historyOf(exercise.id).map((p) => p.oneRepMax));
    const goal: StrengthGoal = {
      id: crypto.randomUUID(),
      exerciseUuid: exercise.uuid,
      exerciseName: exercise.name,
      targetKg,
      deadline: deadline || undefined,
      startKg: Math.round(best * 10) / 10,
      createdAt: new Date().toISOString(),
    };
    await updateTrainingSchedule({ strengthGoals: [...goals, goal] });
    setAdding(false);
    setExerciseId("");
    setTarget("");
    setDeadline("");
  }

  if (!editable && goals.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Goal className="h-5 w-5 text-accent-text" aria-hidden="true" />
          {t("title")}
        </h2>
        {editable && profile && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("add")}
          </Button>
        )}
      </div>

      {editable && !profile && (
        <Link href="/onboarding" className="block text-sm font-medium text-accent-text underline">
          {t("needProfile")}
        </Link>
      )}
      {editable && profile && goals.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}

      {goals.map((goal) => {
        const progress = goalProgress(goal, historyOf(resolve(goal)?.id), today);
        const late = goal.deadline && !progress.achievedOn && progress.onTrack === false;
        return (
          <Card key={goal.id}>
            <CardContent className="space-y-2 py-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{resolve(goal)?.name ?? goal.exerciseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("target", { kg: goal.targetKg })}
                    {goal.deadline && ` · ${t("deadline", { date: frDate(goal.deadline) })}`}
                  </p>
                </div>
                {editable && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t("deleteConfirm"))) updateTrainingSchedule({ strengthGoals: goals.filter((g) => g.id !== goal.id) });
                    }}
                    aria-label={t("delete")}
                    className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress.share * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={cn("h-full rounded-full", progress.achievedOn ? "bg-green-500" : late ? "bg-amber-500" : "bg-accent-500")}
                  style={{ width: `${Math.max(3, progress.share * 100)}%` }}
                />
              </div>

              <p className={cn("flex items-center gap-1.5 text-sm", progress.achievedOn ? "font-medium text-success-text" : "text-muted-foreground")}>
                {progress.achievedOn ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("achieved", { date: frDate(progress.achievedOn) })}
                  </>
                ) : (
                  <>
                    {t("current", { kg: progress.currentKg })}
                    {" · "}
                    {progress.projectedOn
                      ? t(late ? "projectedLate" : "projected", { date: frDate(progress.projectedOn) })
                      : t("notEnough")}
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              {t("exercise")}
              <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value ? Number(e.target.value) : "")} className={SELECT}>
                <option value="">—</option>
                {choices.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              {t("targetLabel")}
              <Input type="text" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="100" className="mt-1" />
            </label>
            <label className="block text-sm font-medium">
              {t("deadlineLabel")}
              <Input type="date" value={deadline} min={today} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
            </label>
            <p className="text-xs text-muted-foreground">{t("hint")}</p>
            <Button className="w-full" onClick={add} disabled={!exerciseId || !(Number(target.replace(",", ".")) > 0)}>
              {t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
