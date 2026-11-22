"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Exercise, ExerciseLevel, LocalizedList, Movement, MuscleGroup } from "@/db";
import { LEVELS, MOVEMENTS } from "@/lib/movements";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

type Lang = "fr" | "en" | "de";
const LANGS: Lang[] = ["fr", "en", "de"];

/** The lines for one's language, or English, or the first language filled. */
export function localList(list: LocalizedList | null | undefined, locale: string): string[] {
  if (!list) return [];
  return list[locale as Lang]?.length ? list[locale as Lang]! : list.en?.length ? list.en : LANGS.map((l) => list[l] ?? []).find((x) => x.length) ?? [];
}

/** What the library says of an exercise: its level, its movements, the muscles it also works, its key points and usual faults. */
export function ExerciseDetails({ ex, library }: { ex: Exercise; library: Exercise[] }) {
  const t = useTranslations("restrictions");
  const te = useTranslations("exercises");
  const locale = useLocale();
  const xl = useExerciseLabel();
  const cues = localList(ex.cues, locale);
  const mistakes = localList(ex.mistakes, locale);
  const parent = ex.variantOf ? library.find((e) => e.uuid === ex.variantOf) : undefined;
  const tags = [
    ex.level ? t(`level_${ex.level}`) : null,
    ...(ex.movements ?? []).map((m) => t(`movement_${m}`)),
  ].filter(Boolean) as string[];
  if (!tags.length && !ex.secondaryMuscles?.length && !cues.length && !mistakes.length && !parent) return null;
  return (
    <div className="space-y-2 text-sm">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((x) => <span key={x} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{x}</span>)}
        </div>
      )}
      {!!ex.secondaryMuscles?.length && (
        <p className="text-xs text-muted-foreground">{t("secondary")} : {ex.secondaryMuscles.map((m) => te(`mg_${m}`)).join(", ")}</p>
      )}
      {parent && <p className="text-xs text-muted-foreground">{t("variantOf")} : {xl(parent.name)}</p>}
      {cues.length > 0 && (
        <div>
          <p className="text-xs font-semibold">{t("cues")}</p>
          <ul className="list-disc pl-5 text-muted-foreground">{cues.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}
      {mistakes.length > 0 && (
        <div>
          <p className="text-xs font-semibold">{t("mistakes")}</p>
          <ul className="list-disc pl-5 text-muted-foreground">{mistakes.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export interface DetailsDraft {
  level: ExerciseLevel | null;
  movements: Movement[];
  secondaryMuscles: MuscleGroup[];
  cues: Record<Lang, string>;
  mistakes: Record<Lang, string>;
  variantOf: string | null;
}

export const draftOf = (ex: Exercise): DetailsDraft => ({
  level: ex.level ?? null,
  movements: ex.movements ?? [],
  secondaryMuscles: ex.secondaryMuscles ?? [],
  cues: { fr: (ex.cues?.fr ?? []).join("\n"), en: (ex.cues?.en ?? []).join("\n"), de: (ex.cues?.de ?? []).join("\n") },
  mistakes: { fr: (ex.mistakes?.fr ?? []).join("\n"), en: (ex.mistakes?.en ?? []).join("\n"), de: (ex.mistakes?.de ?? []).join("\n") },
  variantOf: ex.variantOf ?? null,
});

/** Lines typed into lists: empty lines and languages left blank dropped. */
export function listsOf(text: Record<Lang, string>): LocalizedList {
  const out: LocalizedList = {};
  for (const l of LANGS) {
    const lines = text[l].split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8).map((x) => x.slice(0, 200));
    if (lines.length) out[l] = lines;
  }
  return out;
}

/** The admin's fields for those details. */
export function ExerciseDetailsEditor({ value, onChange, library, self }: { value: DetailsDraft; onChange: (v: DetailsDraft) => void; library: Exercise[]; self: Exercise }) {
  const t = useTranslations("restrictions");
  const te = useTranslations("exercises");
  const xl = useExerciseLabel();
  const chip = (on: boolean) => cn("min-h-9 rounded-full border px-2.5 text-xs font-medium", on ? "border-accent-500 bg-accent-500 text-white" : "border-border hover:bg-muted");
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  return (
    <div className="space-y-3 rounded-lg bg-muted/40 p-2">
      <p className="text-xs font-semibold text-muted-foreground">{t("details")}</p>
      <div>
        <p className="mb-1 text-xs">{t("levelLabel")}</p>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => (
            <button key={l} type="button" aria-pressed={value.level === l} onClick={() => onChange({ ...value, level: value.level === l ? null : l })} className={chip(value.level === l)}>
              {t(`level_${l}`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs">{t("movements")}</p>
        <div className="flex flex-wrap gap-1.5">
          {MOVEMENTS.map((m) => (
            <button key={m} type="button" aria-pressed={value.movements.includes(m)} onClick={() => onChange({ ...value, movements: toggle(value.movements, m).slice(0, 6) })} className={chip(value.movements.includes(m))}>
              {t(`movement_${m}`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs">{t("secondary")}</p>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_GROUPS.filter((g) => g !== self.muscleGroup).map((g) => (
            <button key={g} type="button" aria-pressed={value.secondaryMuscles.includes(g)} onClick={() => onChange({ ...value, secondaryMuscles: toggle(value.secondaryMuscles, g) })} className={chip(value.secondaryMuscles.includes(g))}>
              {te(`mg_${g}`)}
            </button>
          ))}
        </div>
      </div>
      {(["cues", "mistakes"] as const).map((field) => (
        <div key={field} className="space-y-1">
          <p className="text-xs">{t(field)} <span className="text-muted-foreground">({t("linesHint")})</span></p>
          {LANGS.map((l) => (
            <Textarea
              key={l}
              rows={2}
              aria-label={`${t(field)} (${l.toUpperCase()})`}
              placeholder={l.toUpperCase()}
              value={value[field][l]}
              onChange={(e) => onChange({ ...value, [field]: { ...value[field], [l]: e.target.value } })}
            />
          ))}
        </div>
      ))}
      <label className="block text-xs">
        {t("variantOf")}
        <select
          value={value.variantOf ?? ""}
          onChange={(e) => onChange({ ...value, variantOf: e.target.value || null })}
          className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
        >
          <option value="">—</option>
          {library.filter((e) => !e.isCustom && e.uuid !== self.uuid).map((e) => <option key={e.id} value={e.uuid}>{xl(e.name)}</option>)}
        </select>
      </label>
    </div>
  );
}
