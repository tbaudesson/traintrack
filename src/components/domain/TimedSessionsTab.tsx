"use client";

import { groupLabel } from "@/lib/muscles";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Plus, Timer, Trash2 } from "lucide-react";
import type { MuscleGroup } from "@/db";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import {
  FITNESS_LEVELS,
  TIMED_KEY,
  parseTimed,
  timedLabel,
  type IntervalExercise,
  type IntervalKind,
  type TimedGuidance,
} from "@/lib/intervals";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput, NumbersInput } from "@/components/domain/NumbersInput";
import { ListEditor } from "@/components/domain/ReferenceTabs";

const select = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground";

/**
 * What timed sessions are built from, as the app reads it (app settings):
 * the lengths and rhythms offered, the rests, how many exercises a round
 * takes, the order of the efforts by focus, the rhythm by level, and the
 * exercises drawn from (names of the library, which holds their translations,
 * descriptions and demos). Saved only when whole.
 */
export function TimedSessionsTab() {
  const t = useTranslations("timedAdmin");
  const ti = useTranslations("intervals");
  const locale = useLocale();
  const tl = (list: { id: string; fr: string; en: string; de: string }[] | undefined, id: string) => timedLabel(list, id, locale);
  const groups = useMuscleGroups();
  const groupIds = (groups ?? []).map((g) => g.id);
  const gl = (id: string | null | undefined) => groupLabel(groups, id, locale);
  const ts = useTranslations("sync");
  const xl = useExerciseLabel();
  const library = useExercises().filter((e) => !e.isCustom);
  const [g, setG] = useState<TimedGuidance | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [error, setError] = useState<{ key: "invalid" | "unknown"; names?: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseTimed(s[TIMED_KEY]);
        setG(parsed);
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing" || !g) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("missing")}</p>;

  const put = (next: TimedGuidance) => {
    setG(next);
    setError(null);
    setSaved(false);
  };
  const setExercise = (i: number, e: IntervalExercise) => put({ ...g, exercises: g.exercises.map((x, j) => (j === i ? e : x)) });

  async function save() {
    if (!g) return;
    const text = JSON.stringify(g);
    if (!parseTimed(text)) return setError({ key: "invalid" });
    // The library holds the translations and the demos: a name it lacks would show untranslated.
    const unknown = library.length ? g.exercises.filter((e) => !library.some((x) => x.name === e.name)).map((e) => e.name) : [];
    if (unknown.length) return setError({ key: "unknown", names: unknown.join(", ") });
    await setAppSetting(TIMED_KEY, text);
    setSaved(true);
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Timer className="h-4 w-4 text-accent-500" aria-hidden="true" /> {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("intro")}</p>
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <NumbersInput label={t("minutes")} value={g.minutes} onChange={(minutes) => put({ ...g, minutes })} />
          <NumbersInput asText label={t("patterns")} value={g.patterns} onChange={(patterns) => put({ ...g, patterns })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label={t("roundRestSec")} value={g.roundRestSec} onChange={(roundRestSec) => put({ ...g, roundRestSec })} />
            <NumberInput label={t("getReadySec")} value={g.getReadySec} onChange={(getReadySec) => put({ ...g, getReadySec })} />
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">{t("perRound")}</p>
          {g.perRound.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <NumberInput label={t("upToMinutes")} value={r.upToMinutes} onChange={(n) => put({ ...g, perRound: g.perRound.map((x, j) => (j === i ? { ...x, upToMinutes: n } : x)) })} />
              <NumberInput label={t("count")} value={r.count} onChange={(n) => put({ ...g, perRound: g.perRound.map((x, j) => (j === i ? { ...x, count: n } : x)) })} />
              <Button variant="ghost" size="sm" aria-label={t("remove")} onClick={() => put({ ...g, perRound: g.perRound.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => put({ ...g, perRound: [...g.perRound, { upToMinutes: Math.max(...g.minutes, 0), count: 6 }] })}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("addStep")}
          </Button>
        </div>

        {/* What a circuit can work, the kinds of effort and the equipment: ids kept in the exercises below. */}
        <ListEditor title={t("focuses")} hint={t("listHint")} rows={g.focuses} blank={{ id: "", fr: "", en: "", de: "" }} onChange={(focuses) => put({ ...g, focuses })} />
        <ListEditor title={t("kinds")} hint={t("listHint")} rows={g.kinds} blank={{ id: "", fr: "", en: "", de: "" }} onChange={(kinds) => put({ ...g, kinds })} />
        <ListEditor
          title={t("equipmentList")}
          hint={t("equipmentHint")}
          rows={g.equipment}
          blank={{ id: "", fr: "", en: "", de: "", base: false }}
          onChange={(equipment) => put({ ...g, equipment })}
          extra={(row, set) => (
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" className="size-4 accent-accent-600" checked={row.base} onChange={(ev) => set({ base: ev.target.checked })} />
              {t("base")}
            </label>
          )}
        />

        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">{t("rhythm")}</p>
          <p className="text-xs text-muted-foreground">{t("rhythmHint")}</p>
          {g.focuses.map(({ id: f }) => (
            <NumbersInput
              key={f}
              asText
              label={tl(g.focuses, f)}
              value={g.rhythm[f] ?? []}
              onChange={(kinds) => put({ ...g, rhythm: { ...g.rhythm, [f]: kinds as IntervalKind[] } })}
            />
          ))}
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">{t("patternForLevel")}</p>
          <div className="grid grid-cols-3 gap-2">
            {FITNESS_LEVELS.map((l) => (
              <label key={l} className="space-y-1 text-xs text-muted-foreground">
                <span>{t(`level_${l}`)}</span>
                <select className={select} value={g.patternForLevel[l]} onChange={(e) => put({ ...g, patternForLevel: { ...g.patternForLevel, [l]: e.target.value } })}>
                  {g.patterns.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <p className="text-sm font-medium">{t("exercises", { count: g.exercises.length })}</p>
        <datalist id="timed-library">
          {library.map((e) => (
            <option key={e.id} value={e.name}>{xl(e.name)}</option>
          ))}
        </datalist>
        {g.exercises.map((e, i) => (
          <details key={i} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {e.name ? xl(e.name) : t("untitled")}{" "}
              <span className="text-xs text-muted-foreground">· {e.focus.map((f) => tl(g.focuses, f)).join(", ")} · {tl(g.kinds, e.kind)}</span>
            </summary>
            <div className="mt-3 space-y-2">
              <label className="block space-y-1 text-xs text-muted-foreground">
                <span>{t("name")}</span>
                <Input list="timed-library" value={e.name} onChange={(ev) => setExercise(i, { ...e, name: ev.target.value })} className="h-9" />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>{t("muscleGroup")}</span>
                  <select className={select} value={e.muscleGroup} onChange={(ev) => setExercise(i, { ...e, muscleGroup: ev.target.value as MuscleGroup })}>
                    {groupIds.map((m) => (
                      <option key={m} value={m}>{gl(m)}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>{ti("equipment")}</span>
                  <select className={select} value={e.equipment} onChange={(ev) => setExercise(i, { ...e, equipment: ev.target.value as IntervalExercise["equipment"] })}>
                    {g.equipment.map(({ id: q }) => (
                      <option key={q} value={q}>{tl(g.equipment, q)}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>{t("kind")}</span>
                  <select className={select} value={e.kind} onChange={(ev) => setExercise(i, { ...e, kind: ev.target.value as IntervalKind })}>
                    {g.kinds.map(({ id: k }) => (
                      <option key={k} value={k}>{tl(g.kinds, k)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {g.focuses.map(({ id: f }) => (
                  <label key={f} className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" className="size-4 accent-accent-600" checked={e.focus.includes(f)} onChange={(ev) => setExercise(i, { ...e, focus: ev.target.checked ? [...e.focus, f] : e.focus.filter((x) => x !== f) })} />
                    {tl(g.focuses, f)}
                  </label>
                ))}
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" className="size-4 accent-accent-600" checked={!!e.sides} onChange={(ev) => setExercise(i, { ...e, sides: ev.target.checked || undefined })} />
                  {t("sides")}
                </label>
              </div>
              <Button variant="ghost" size="sm" onClick={() => put({ ...g, exercises: g.exercises.filter((_, j) => j !== i) })}>
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("remove")}
              </Button>
            </div>
          </details>
        ))}

        <Button variant="outline" className="w-full" onClick={() => put({ ...g, exercises: [...g.exercises, { name: "", muscleGroup: (groups ?? []).find((x) => x.wholeBody)?.id ?? groupIds[0] ?? "", equipment: g.equipment.find((q) => q.base)?.id ?? g.equipment[0]?.id ?? "", focus: g.focuses[0] ? [g.focuses[0].id] : [], kind: g.kinds[0]?.id ?? "" }] })}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("add")}
        </Button>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t(error.key, { names: error.names ?? "" })}</p>}
        <Button onClick={save} className="w-full">
          {saved ? <><Check className="mr-1 h-4 w-4" aria-hidden="true" />{t("saved")}</> : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
