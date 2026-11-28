import { useCallback } from "react";
import { useLocale } from "next-intl";
import { LEVELS_KEY, levelName, parseLevels, type LevelsReference } from "@/lib/levels";
import { useAppGuidance } from "./useAppGuidance";

/** The levels as the admin keeps them (Admin > Levels); null until read once. */
export const useLevels = (): LevelsReference | null => useAppGuidance(LEVELS_KEY, parseLevels);

/** A level's name in the app's language (its id while the reference is not read). */
export function useLevelName(): (level: string | null | undefined) => string {
  const levels = useLevels();
  const locale = useLocale();
  return useCallback((level) => levelName(levels, level, locale), [levels, locale]);
}
