"use client";

import { useTranslations } from "next-intl";
import type { Exercise, WorkoutSet } from "@/db";
import { supersetLabels } from "@/lib/supersets";

/**
 * A finished session as the coach reads it: each exercise in order, with its
 * superset label (A1, A2…) and the sets done, "60×10 · 62.5×8 @8".
 */
export function SessionDetail({ sets, exercises }: { sets: WorkoutSet[]; exercises: Map<number | undefined, Exercise> }) {
  const t = useTranslations("teams");
  const work = sets
    .filter((s) => !s.isWarmup)
    .sort((a, b) => a.setNumber - b.setNumber || (a.id ?? 0) - (b.id ?? 0));
  const order: number[] = [];
  for (const s of work) if (!order.includes(s.exerciseId)) order.push(s.exerciseId);
  const groups = order.map((id) => work.find((s) => s.exerciseId === id)?.supersetGroup ?? null);
  const labels = supersetLabels(groups);

  if (!order.length) return null;
  return (
    <ul className="space-y-2">
      {order.map((exerciseId, i) => {
        const own = work.filter((s) => s.exerciseId === exerciseId);
        const done = own.filter((s) => s.completed);
        const linked = labels[i] !== "";
        return (
          <li key={exerciseId} className={linked ? "border-l-4 border-accent-500/60 pl-2" : "pl-3"}>
            <p className="text-sm font-medium">
              {linked && <span className="mr-1.5 text-xs font-bold text-accent-text">{labels[i]}</span>}
              {exercises.get(exerciseId)?.name ?? t("customExercise")}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {done.length
                ? done.map((s) => `${s.weightKg ? `${s.weightKg}×` : ""}${s.reps ?? "–"}${s.rpe ? ` @${s.rpe}` : ""}`).join(" · ")
                : t("notDone")}
              {done.length > 0 && done.length < own.length && ` · ${t("setsSkipped", { count: own.length - done.length })}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
