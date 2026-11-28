"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Plus, Swords, Trash2 } from "lucide-react";
import type { MuscleGroup } from "@/db";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { BOXING_KEY, mainKind, parseBoxing, type BoxingCombo, type BoxingGuidance, type BoxingKind } from "@/lib/boxing";
import { timedLabel } from "@/lib/intervals";
import { ListEditor } from "@/components/domain/ReferenceTabs";
import { FITNESS_LEVELS } from "@/lib/intervals";
import { groupLabel } from "@/lib/muscles";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput, NumbersInput } from "@/components/domain/NumbersInput";
import { useLevelName } from "@/hooks/useLevels";

const select = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground";

/**
 * What boxing rounds are built from, as the app reads it (app settings): the
 * lengths and round formats offered, the usual format by level, how long a
 * combination lasts, the order of the kinds in a round, and the combinations
 * (names of the library, which holds their translations, descriptions,
 * videos and injury rules). Saved only when whole.
 */
export function BoxingRoundsTab() {
  const t = useTranslations("boxingAdmin");
  const tt = useTranslations("timedAdmin");
  const levelName = useLevelName();
  const locale = useLocale();
  const groups = useMuscleGroups();
  const groupIds = (groups ?? []).map((g) => g.id);
  const gl = (id: string | null | undefined) => groupLabel(groups, id, locale);
  const ts = useTranslations("sync");
  const xl = useExerciseLabel();
  const library = useExercises().filter((e) => !e.isCustom);
  const [g, setG] = useState<BoxingGuidance | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [error, setError] = useState<{ key: "invalid" | "unknown"; names?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseBoxing(s[BOXING_KEY]);
        setG(parsed);
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing" || !g) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("missing")}</p>;

  const put = (next: BoxingGuidance) => {
    setG(next);
    setError(null);
    setSaved(false);
  };
  const setCombo = (i: number, c: BoxingCombo) => put({ ...g, combos: g.combos.map((x, j) => (j === i ? c : x)) });

  async function save() {
    if (!g) return;
    const text = JSON.stringify(g, null, 2);
    if (!parseBoxing(text)) return setError({ key: "invalid" });
    // The library holds the translations, the videos and the injury rules: a name it lacks would show bare.
    const unknown = library.length ? g.combos.filter((c) => !library.some((x) => x.name === c.name)).map((c) => c.name) : [];
    if (unknown.length) return setError({ key: "unknown", names: unknown.join(", ") });
    setSaving(true);
    try {
      await setAppSetting(BOXING_KEY, text);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Swords className="h-4 w-4 text-accent-500" aria-hidden="true" /> {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("intro")}</p>
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <NumbersInput label={t("minutes")} value={g.minutes} onChange={(minutes) => put({ ...g, minutes })} />
          <NumbersInput asText label={t("formats")} value={g.formats} onChange={(formats) => put({ ...g, formats })} />
          <NumberInput label={t("comboSec")} value={g.comboSec} onChange={(comboSec) => put({ ...g, comboSec })} />
          <NumbersInput asText label={t("rhythm")} value={g.rhythm} onChange={(rhythm) => put({ ...g, rhythm: rhythm as BoxingGuidance["rhythm"] })} />
          <p className="text-xs text-muted-foreground">{t("rhythmHint")}</p>
        </div>

        {/* The kinds of combination: one closes each round, one fills a round when another has nothing left. */}
        <ListEditor
          title={t("kinds")}
          hint={t("kindsHint")}
          rows={g.kinds}
          blank={{ id: "", fr: "", en: "", de: "" }}
          onChange={(kinds) => put({ ...g, kinds })}
          extra={(row, set) => (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" className="size-4 accent-accent-600" checked={!!row.finisher} onChange={(ev) => set({ finisher: ev.target.checked || undefined })} />
                {t("finisher")}
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" className="size-4 accent-accent-600" checked={!!row.main} onChange={(ev) => set({ main: ev.target.checked || undefined })} />
                {t("main")}
              </label>
            </div>
          )}
        />

        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">{t("formatForLevel")}</p>
          <div className="grid grid-cols-3 gap-2">
            {FITNESS_LEVELS.map((l) => (
              <label key={l} className="space-y-1 text-xs text-muted-foreground">
                <span>{levelName(l)}</span>
                <select className={select} value={g.formatForLevel[l]} onChange={(e) => put({ ...g, formatForLevel: { ...g.formatForLevel, [l]: e.target.value } })}>
                  {g.formats.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <p className="text-sm font-medium">{t("combos", { count: g.combos.length })}</p>
        <datalist id="boxing-library">
          {library.map((e) => (
            <option key={e.id} value={e.name}>{xl(e.name)}</option>
          ))}
        </datalist>
        {g.combos.map((c, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-border p-3">
            <label className="block space-y-1 text-xs text-muted-foreground">
              <span>{tt("name")}{c.name ? ` · ${xl(c.name)}` : ""}</span>
              <Input list="boxing-library" value={c.name} onChange={(ev) => setCombo(i, { ...c, name: ev.target.value })} className="h-9" />
            </label>
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>{tt("muscleGroup")}</span>
                <select className={select} value={c.muscleGroup} onChange={(ev) => setCombo(i, { ...c, muscleGroup: ev.target.value as MuscleGroup })}>
                  {groupIds.map((m) => (
                    <option key={m} value={m}>{gl(m)}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>{tt("kind")}</span>
                <select className={select} value={c.kind} onChange={(ev) => setCombo(i, { ...c, kind: ev.target.value as BoxingKind })}>
                  {g.kinds.map(({ id: k }) => (
                    <option key={k} value={k}>{timedLabel(g.kinds, k, locale)}</option>
                  ))}
                </select>
              </label>
              <Button variant="ghost" size="sm" aria-label={t("remove", { name: c.name ? xl(c.name) : "" })} onClick={() => put({ ...g, combos: g.combos.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={() => put({ ...g, combos: [...g.combos, { name: "", muscleGroup: g.combos[0]?.muscleGroup ?? groupIds[0] ?? "", kind: mainKind(g) ?? g.kinds[0]?.id ?? "" }] })}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("add")}
        </Button>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t(error.key, { names: error.names ?? "" })}</p>}
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" /> : saved ? <Check className="mr-1 h-4 w-4" aria-hidden="true" /> : null}
          {saved ? t("saved") : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
