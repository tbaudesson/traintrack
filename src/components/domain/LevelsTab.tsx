"use client";

import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { LEVELS, LEVELS_KEY, levelName, parseLevels, type LevelItem, type LevelsReference, type StartLoad } from "@/lib/levels";
import { groupLabel } from "@/lib/muscles";
import { itemLabel } from "@/lib/references";
import { useEquipmentList } from "@/hooks/useReferences";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { Frame, useSetting } from "@/components/domain/ReferenceTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const select = "h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground";

/**
 * The three levels (app settings "levels"): each one's name in the three
 * languages, the reps and effort of a set nobody filled in, the VMA guessed
 * until the athlete gives theirs; then the first loads by equipment and
 * muscle group. The levels themselves are fixed; their values are not.
 */
export function LevelsTab() {
  const t = useTranslations("levelsAdmin");
  const tr = useTranslations("references");
  const locale = useLocale();
  const equipment = useEquipmentList();
  const groups = useMuscleGroups();
  const s = useSetting<LevelsReference>(LEVELS_KEY, parseLevels);
  const v = s.value;
  const setLevel = (i: number, change: Partial<LevelItem>) => v && s.change({ ...v, levels: v.levels.map((l, j) => (j === i ? { ...l, ...change } : l)) });
  const setLoad = (i: number, change: Partial<StartLoad>) => v && s.change({ ...v, startKg: v.startKg.map((r, j) => (j === i ? { ...r, ...change } : r)) });
  const num = (label: string, value: number, onChange: (n: number) => void, step = 1) => (
    <label className="block space-y-1 text-xs">
      <span className="font-medium">{label}</span>
      <Input type="number" inputMode="decimal" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
  return (
    <Frame
      state={s.state}
      title={t("title")}
      intro={t("intro")}
      missing={t("missing")}
      invalidText={t("invalid")}
      invalid={s.invalid}
      saving={s.saving}
      saved={s.saved}
      onSave={() => v && s.save(JSON.stringify(v, null, 2))}
    >
      {v && (
        <>
          <section className="space-y-2">
            <h3 className="text-base font-semibold">{t("levels")}</h3>
            <p className="text-xs text-muted-foreground">{t("levelsHint")}</p>
            {v.levels.map((l, i) => (
              <Card key={l.id}>
                <CardContent className="grid gap-2 py-3 sm:grid-cols-3">
                  <p className="font-mono text-xs text-muted-foreground sm:col-span-3">{l.id}</p>
                  {(["fr", "en", "de"] as const).map((k) => (
                    <label key={k} className="block space-y-1 text-xs">
                      <span className="font-medium">{tr(`field_${k}`)}</span>
                      <Input value={l[k]} onChange={(e) => setLevel(i, { [k]: e.target.value })} />
                    </label>
                  ))}
                  {num(t("reps"), l.reps, (reps) => setLevel(i, { reps }))}
                  {num(t("rpe"), l.rpe, (rpe) => setLevel(i, { rpe }), 0.5)}
                  {num(t("vma"), l.vma, (vma) => setLevel(i, { vma }), 0.5)}
                </CardContent>
              </Card>
            ))}
          </section>
          <section className="space-y-2">
            <h3 className="text-base font-semibold">{t("startKg")}</h3>
            <p className="text-xs text-muted-foreground">{t("startKgHint")}</p>
            {v.startKg.map((r, i) => (
              <Card key={i}>
                <CardContent className="grid gap-2 py-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium">{t("equipment")}</span>
                    <select className={`${select} w-full`} value={r.equipment} onChange={(e) => setLoad(i, { equipment: e.target.value })}>
                      {!equipment?.some((e) => e.id === r.equipment) && <option value={r.equipment}>{r.equipment}</option>}
                      {(equipment ?? []).filter((e) => !e.noGear).map((e) => (
                        <option key={e.id} value={e.id}>{itemLabel(equipment, e.id, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium">{t("muscle")}</span>
                    <select className={`${select} w-full`} value={r.muscle} onChange={(e) => setLoad(i, { muscle: e.target.value })}>
                      <option value="">{t("otherGroups")}</option>
                      {r.muscle && !groups?.some((g) => g.id === r.muscle) && <option value={r.muscle}>{r.muscle}</option>}
                      {(groups ?? []).filter((g) => !g.unspecified && !g.wholeBody).map((g) => (
                        <option key={g.id} value={g.id}>{groupLabel(groups, g.id, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                    {LEVELS.map((l) => (
                      <div key={l}>{num(`${levelName(v, l, locale)} (kg)`, r.kg[l], (kg) => setLoad(i, { kg: { ...r.kg, [l]: kg } }), 0.5)}</div>
                    ))}
                  </div>
                  <div className="sm:col-span-2">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => s.change({ ...v, startKg: v.startKg.filter((_, j) => j !== i) })}>
                      <Trash2 className="mr-1 size-4" aria-hidden="true" />
                      {t("removeLoad")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => s.change({ ...v, startKg: [...v.startKg, { equipment: equipment?.find((e) => !e.noGear)?.id ?? "barbell", muscle: "", kg: { beginner: 0, intermediate: 0, advanced: 0 } }] })}
            >
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {t("addLoad")}
            </Button>
          </section>
        </>
      )}
    </Frame>
  );
}
