import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { parseRestrictionKey } from "@/lib/restrictions";

/**
 * The words for what a warning is about: an injured area ("shoulder"), or one
 * of the athlete's restrictions ("overhead movements", "Back Squat").
 */
export function useAreaLabel(): (area: string) => string {
  const tp = useTranslations("pain");
  const tr = useTranslations("restrictions");
  const te = useTranslations("exercises");
  const locale = useLocale();
  const exercises = useExercises();
  const xl = useExerciseLabel();
  return useCallback(
    (area: string) => {
      const r = parseRestrictionKey(area);
      const lower = (s: string) => (locale === "de" ? s : s.toLowerCase());
      if (!r) return lower(tp(`area_${area}`));
      if (r.kind === "movement") return tr(`movementShort_${r.value}`);
      if (r.kind === "muscle") return lower(te(`mg_${r.value}`));
      const e = exercises.find((x) => x.uuid === r.value || x.name === r.value);
      return e ? xl(e.name) : tr("anExercise");
    },
    [tp, tr, te, locale, exercises, xl]
  );
}
