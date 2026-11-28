import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { parseRestrictionKey } from "@/lib/restrictions";
import { groupLabel } from "@/lib/muscles";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { useMovements, usePainAreaName } from "@/hooks/useReferences";
import { movementShort } from "@/lib/references";

/**
 * The words for what a warning is about: an injured area ("shoulder"), or one
 * of the athlete's restrictions ("overhead movements", "Back Squat").
 */
export function useAreaLabel(): (area: string) => string {
  const areaName = usePainAreaName();
  const tr = useTranslations("restrictions");
  const groups = useMuscleGroups();
  const movementList = useMovements();
  const locale = useLocale();
  const exercises = useExercises();
  const xl = useExerciseLabel();
  return useCallback(
    (area: string) => {
      const r = parseRestrictionKey(area);
      const lower = (s: string) => (locale === "de" ? s : s.toLowerCase());
      if (!r) return lower(areaName(area));
      if (r.kind === "movement") return movementShort(movementList, r.value, locale);
      if (r.kind === "muscle") return lower(groupLabel(groups, r.value, locale));
      const e = exercises.find((x) => x.uuid === r.value || x.name === r.value);
      return e ? xl(e.name) : tr("anExercise");
    },
    [areaName, tr, groups, movementList, locale, exercises, xl]
  );
}
