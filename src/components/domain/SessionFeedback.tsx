"use client";

import { useTranslations } from "next-intl";
import type { Workout } from "@/db";
import { updateWorkout } from "@/hooks/useWorkouts";
import { cn } from "@/lib/utils";

const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const FEELINGS = [1, 2, 3, 4, 5] as const;
const FACE: Record<number, string> = { 1: "😣", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };

/**
 * The end of any session, whatever the sport: how hard it was as a whole
 * (session RPE, 1-10, Foster's scale: it weighs the session in the training
 * load) and how it went. Two taps, changed any time; a tap on the chosen
 * value takes it back.
 */
export function SessionFeedback({ workout, className }: { workout: Pick<Workout, "id" | "sessionRpe" | "feeling">; className?: string }) {
  const t = useTranslations("feedback");
  if (!workout.id) return null;
  const id = workout.id;
  const rpe = workout.sessionRpe ?? null;
  const feeling = workout.feeling ?? null;

  return (
    <section className={cn("t-panel space-y-3 rounded-2xl p-4", className)} aria-labelledby={`feedback-${id}`}>
      <h2 id={`feedback-${id}`} className="text-sm font-semibold">{t("title")}</h2>

      <fieldset className="space-y-1.5">
        <legend className="text-xs text-muted-foreground">{t("rpe")}</legend>
        <div className="grid grid-cols-10 gap-1">
          {RPE.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={rpe === n}
              aria-label={t("rpeValue", { n, label: t(`rpe_${n}`) })}
              onClick={() => updateWorkout(id, { sessionRpe: rpe === n ? null : n })}
              className={cn(
                "grid min-h-10 place-items-center rounded-lg border text-sm font-semibold transition-colors",
                rpe === n ? "border-accent-600 bg-accent-600 text-white" : "border-border hover:bg-muted"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">{rpe ? t(`rpe_${rpe}`) : t("rpeHint")}</p>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="text-xs text-muted-foreground">{t("feeling")}</legend>
        <div className="grid grid-cols-5 gap-1">
          {FEELINGS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={feeling === n}
              aria-label={t(`feeling_${n}`)}
              onClick={() => updateWorkout(id, { feeling: feeling === n ? null : n })}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center rounded-lg border text-lg transition-colors",
                feeling === n ? "border-accent-600 bg-accent-50 dark:bg-accent-900/30" : "border-border hover:bg-muted"
              )}
            >
              <span aria-hidden="true">{FACE[n]}</span>
            </button>
          ))}
        </div>
        <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">{feeling ? t(`feeling_${feeling}`) : ""}</p>
      </fieldset>
    </section>
  );
}
