import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BOXING_FOCUS, TIMED_KEY, parseTimed, timedLabel, type PlanFocus, type TimedGuidance } from "@/lib/intervals";
import { useAppGuidance } from "./useAppGuidance";

/** What timed sessions are built from, as the admin keeps it; null until read once. */
export const useTimedGuidance = (): TimedGuidance | null => useAppGuidance(TIMED_KEY, parseTimed);

/** A timed session's focus in the app's language: the reference's circuits, or boxing. */
export function usePlanFocusLabel() {
  const g = useTimedGuidance();
  const t = useTranslations("intervals");
  const locale = useLocale();
  return useCallback((focus: PlanFocus) => (focus === BOXING_FOCUS ? t("focus_boxing") : timedLabel(g?.focuses, focus, locale)), [g, t, locale]);
}
