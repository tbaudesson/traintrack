"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Exercise, ExerciseLevel, LocalizedList, Movement, Muscle, MuscleGroup } from "@/db";
import { BodyMap } from "@/components/domain/BodyMap";
import { muscleName, musclesByGroup } from "@/lib/muscleMap";
import { useBodyMuscles, useBodyRef } from "@/hooks/useBodyMuscles";
import { LEVELS } from "@/lib/movements";
import { itemLabel } from "@/lib/references";
import { useMovements } from "@/hooks/useReferences";
import { groupLabel } from "@/lib/muscles";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { useLessonsReference } from "@/hooks/useLessonsReference";
import { refLabel, sportOf } from "@/lib/lessonsReference";
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
  const movementList = useMovements();
  const locale = useLocale();
  const xl = useExerciseLabel();
  const cues = localList(ex.cues, locale);
  const mistakes = localList(ex.mistakes, locale);
  const parent = ex.variantOf ? library.find((e) => e.uuid === ex.variantOf) : undefined;
  const tags = [
    ex.level ? t(`level_${ex.level}`) : null,
    ...(ex.movements ?? []).map((m) => itemLabel(movementList, m, locale)),
  ].filter(Boolean) as string[];
  const tb = useTranslations("bodyMap");
  const muscles = useBodyMuscles() ?? [];
  const groups = useMuscleGroups();
  const mn = (m: Muscle) => muscleName(muscles, m, locale);
  const target = ex.targetMuscles ?? [];
  const assist = ex.assistMuscles ?? [];
  // Made for group lessons: its sport, theme, minutes, ages and kit.
  const lessons = useLessonsReference();
  const sport = lessons && ex.sport ? sportOf(lessons, ex.sport) : undefined;
  const lessonLine = ex.sport
    ? [
        refLabel(lessons?.sports, ex.sport, locale),
        ex.theme ? refLabel(sport?.themes, ex.theme, locale) : null,
        ex.minutes ? `${ex.minutes} min` : null,
        ex.ages?.length ? ex.ages.map((a) => refLabel(sport?.ageBands, a, locale)).join(", ") : null,
        ex.gear?.length ? ex.gear.map((g) => refLabel(sport?.equipment, g, locale)).join(", ") : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  if (!tags.length && !target.length && !ex.secondaryMuscles?.length && !cues.length && !mistakes.length && !parent && !lessonLine) return null;
  return (
    <div className="space-y-2 text-sm">
      {lessonLine && <p className="text-xs font-medium text-accent-text">{lessonLine}</p>}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((x) => <span key={x} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{x}</span>)}
        </div>
      )}
      {target.length > 0 ? (
        <div className="flex items-center gap-3">
          <BodyMap
            load={new Map<Muscle, number>([...assist.map((m) => [m, 0.3] as const), ...target.map((m) => [m, 1] as const)])}
            className="h-32 w-40 shrink-0 gap-0.5"
          />
          <div className="space-y-1 text-xs">
            <p><span className="font-semibold">{tb("worked")} :</span> {target.map(mn).join(", ")}</p>
            {assist.length > 0 && <p className="text-muted-foreground">{tb("workedToo")} : {assist.map(mn).join(", ")}</p>}
          </div>
        </div>
      ) : (
        !!ex.secondaryMuscles?.length && <p className="text-xs text-muted-foreground">{t("secondary")} : {ex.secondaryMuscles.map((m) => groupLabel(groups, m, locale)).join(", ")}</p>
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
  /** For group lessons: none, or its sport with its theme, minutes, ages and kit. */
  lesson: { sport: string | null; theme: string | null; minutes: number | null; ages: string[]; gear: string[] };
  level: ExerciseLevel | null;
  movements: Movement[];
  secondaryMuscles: MuscleGroup[];
  targetMuscles: Muscle[];
  assistMuscles: Muscle[];
  cues: Record<Lang, string>;
  mistakes: Record<Lang, string>;
  variantOf: string | null;
}

export const draftOf = (ex: Exercise): DetailsDraft => ({
  lesson: { sport: ex.sport ?? null, theme: ex.theme ?? null, minutes: ex.minutes ?? null, ages: ex.ages ?? [], gear: ex.gear ?? [] },
  level: ex.level ?? null,
  movements: ex.movements ?? [],
  secondaryMuscles: ex.secondaryMuscles ?? [],
  targetMuscles: ex.targetMuscles ?? [],
  assistMuscles: ex.assistMuscles ?? [],
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
  const movementList = useMovements();
  const tb = useTranslations("bodyMap");
  const locale = useLocale();
  const bodyRef = useBodyRef();
  const bodyMuscles = bodyRef?.muscles ?? [];
  const groups = useMuscleGroups();
  const xl = useExerciseLabel();
  const chip = (on: boolean) => cn("min-h-9 rounded-full border px-2.5 text-xs font-medium", on ? "border-accent-500 bg-accent-500 text-white" : "border-border hover:bg-muted");
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  return (
    <div className="space-y-3 rounded-lg bg-muted/40 p-2">
      <LessonFieldsEditor value={value.lesson} onChange={(lesson) => onChange({ ...value, lesson })} />
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
          {(movementList ?? []).map(({ id: m }) => (
            <button key={m} type="button" aria-pressed={value.movements.includes(m)} onClick={() => onChange({ ...value, movements: toggle(value.movements, m).slice(0, 6) })} className={chip(value.movements.includes(m))}>
              {itemLabel(movementList, m, locale)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs">{t("secondary")}</p>
        <div className="flex flex-wrap gap-1.5">
          {(groups ?? []).map((g) => g.id).filter((g) => g !== self.muscleGroup).map((g) => (
            <button key={g} type="button" aria-pressed={value.secondaryMuscles.includes(g)} onClick={() => onChange({ ...value, secondaryMuscles: toggle(value.secondaryMuscles, g) })} className={chip(value.secondaryMuscles.includes(g))}>
              {groupLabel(groups, g, locale)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs">{tb("adminLabel")}</p>
        <p className="mb-1.5 text-xs text-muted-foreground">{tb("adminHint")}</p>
        <div className="space-y-1.5">
          {(bodyRef ? musclesByGroup(bodyRef) : []).map(({ group, muscles: ofGroup }) => (
            <div key={group} className="flex flex-wrap gap-1.5">
              {ofGroup.map((m) => {
                const role = value.targetMuscles.includes(m) ? "target" : value.assistMuscles.includes(m) ? "assist" : null;
                // A tap: main, then secondary, then none.
                const next = () => {
                  const targetMuscles = value.targetMuscles.filter((x) => x !== m);
                  const assistMuscles = value.assistMuscles.filter((x) => x !== m);
                  if (!role) targetMuscles.push(m);
                  else if (role === "target") assistMuscles.push(m);
                  onChange({ ...value, targetMuscles: targetMuscles.slice(0, 8), assistMuscles: assistMuscles.slice(0, 10) });
                };
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={next}
                    aria-label={`${muscleName(bodyMuscles, m, locale)} : ${role === "target" ? tb("adminMain") : role === "assist" ? tb("adminAlso") : tb("stateNone")}`}
                    className={cn(chip(role === "target"), role === "assist" && "border-accent-500 bg-accent-500/15 text-accent-text")}
                  >
                    {muscleName(bodyMuscles, m, locale)}
                  </button>
                );
              })}
            </div>
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

/**
 * What makes an exercise one for group lessons: its sport (none: not for
 * lessons), its theme there, its suggested minutes, the ages it suits and
 * the kit it needs, from the sport's lists.
 */
export function LessonFieldsEditor({ value, onChange }: { value: DetailsDraft["lesson"]; onChange: (v: DetailsDraft["lesson"]) => void }) {
  const t = useTranslations("lessons");
  const locale = useLocale();
  const lessons = useLessonsReference();
  if (!lessons) return null;
  const sport = value.sport ? sportOf(lessons, value.sport) : undefined;
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const chip = (on: boolean) => cn("min-h-9 rounded-full border px-2.5 text-xs", on ? "border-accent-500 bg-accent-500 text-white" : "border-border");
  return (
    <div className="space-y-2 rounded-lg border border-border p-2">
      <p className="text-xs font-semibold">{t("forLessons")}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("sport")}>
        <button type="button" aria-pressed={!value.sport} onClick={() => onChange({ sport: null, theme: null, minutes: null, ages: [], gear: [] })} className={chip(!value.sport)}>
          {t("notForLessons")}
        </button>
        {lessons.sports.map((x) => (
          <button key={x.id} type="button" aria-pressed={value.sport === x.id} onClick={() => onChange({ ...value, sport: x.id, theme: x.themes[0]?.id ?? null, minutes: value.minutes ?? 10 })} className={chip(value.sport === x.id)}>
            {refLabel(lessons.sports, x.id, locale)}
          </button>
        ))}
      </div>
      {sport && (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("drillCategory")}>
            {sport.themes.map(({ id }) => (
              <button key={id} type="button" aria-pressed={value.theme === id} onClick={() => onChange({ ...value, theme: id })} className={chip(value.theme === id)}>
                {refLabel(sport.themes, id, locale)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            {t("drillMinutes")}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={value.minutes ?? ""}
              onChange={(e) => onChange({ ...value, minutes: e.target.value ? Math.min(60, Math.max(1, Math.round(Number(e.target.value)) || 1)) : null })}
              className="h-9 w-16 rounded-md border border-border bg-transparent px-1 text-center"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("drillAges")}>
            {sport.ageBands.map(({ id }) => (
              <button key={id} type="button" aria-pressed={value.ages.includes(id)} onClick={() => onChange({ ...value, ages: toggle(value.ages, id) })} className={chip(value.ages.includes(id))}>
                {refLabel(sport.ageBands, id, locale)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("drillEquipment")}>
            {sport.equipment.map(({ id }) => (
              <button key={id} type="button" aria-pressed={value.gear.includes(id)} onClick={() => onChange({ ...value, gear: toggle(value.gear, id) })} className={chip(value.gear.includes(id))}>
                {refLabel(sport.equipment, id, locale)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
