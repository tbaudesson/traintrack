import { useCallback, useMemo } from "react";
import { useExercises } from "@/hooks/useExercises";
import { useLocale } from "next-intl";

type Lang = "fr" | "de";
const lang = (locale: string): Lang | null => (locale === "fr" || locale === "de" ? locale : null);

type Translated = { nameFr?: string | null; nameDe?: string | null; descriptionFr?: string | null; descriptionDe?: string | null };

/**
 * An exercise's name in the app's language: its translation in the library
 * (name_fr / name_de, seeded by migration 064 and edited by an admin), else
 * the name itself (custom and English names).
 */
export function exerciseLabel(name: string | undefined, locale: string, row?: Translated): string {
  if (!name) return "?";
  const l = lang(locale);
  if (!l) return name;
  return (l === "fr" ? row?.nameFr : row?.nameDe) || name;
}

/** An exercise's description in the app's language, when there is one. */
export function exerciseDescription(
  ex: (Translated & { name?: string; description?: string }) | undefined,
  locale: string
): string | undefined {
  if (!ex) return undefined;
  const l = lang(locale);
  if (!l) return ex.description;
  return (l === "fr" ? ex.descriptionFr : ex.descriptionDe) || ex.description;
}

/** The label function for the current language, reading the library's translations. */
export function useExerciseLabel(): (name: string | undefined) => string {
  const locale = useLocale();
  const exercises = useExercises();
  const rows = useMemo(() => {
    const map = new Map<string, Translated>();
    for (const e of exercises) if (!e.isCustom || !map.has(e.name)) map.set(e.name, e);
    return map;
  }, [exercises]);
  return useCallback((name: string | undefined) => exerciseLabel(name, locale, name ? rows.get(name) : undefined), [locale, rows]);
}
