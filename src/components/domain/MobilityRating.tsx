"use client";

import { useTranslations } from "next-intl";
import type { MobilityLog } from "@/db";
import { updateWorkout } from "@/hooks/useWorkouts";
import { cn } from "@/lib/utils";

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * How supple one feels after a warm-up or a stretch, 1 (stiff) to 5 (very
 * supple): a feeling, followed over time on the mobility page. A tap on the
 * chosen level takes it back.
 */
export function MobilityRating({ workoutId, log }: { workoutId: number; log: MobilityLog }) {
  const t = useTranslations("mobilityLog");
  const rating = log.rating ?? null;
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-semibold">{t("ratingTitle")}</legend>
      <div className="grid grid-cols-5 gap-1">
        {LEVELS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={rating === n}
            aria-label={t("ratingValue", { n, label: t(`rating_${n}`) })}
            onClick={() => updateWorkout(workoutId, { mobility: { ...log, rating: rating === n ? null : n } })}
            className={cn(
              "min-h-11 rounded-lg border text-sm font-semibold transition-colors",
              rating === n ? "border-accent-600 bg-accent-600 text-white" : "border-border hover:bg-muted"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">{rating ? t(`rating_${rating}`) : t("ratingHint")}</p>
    </fieldset>
  );
}
