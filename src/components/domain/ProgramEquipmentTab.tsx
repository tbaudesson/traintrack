"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Dumbbell, Loader2, Plus, Trash2 } from "lucide-react";
import type { Equipment } from "@/db";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { PROGRAM_EQUIPMENT_KEY, parseProgramEquipment, type ProgramEquipmentGuide } from "@/lib/programEquipment";
import { itemLabel } from "@/lib/references";
import { useEquipmentList } from "@/hooks/useReferences";
import { useLocale } from "next-intl";
import { useExercises } from "@/hooks/useExercises";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumbersInput } from "@/components/domain/NumbersInput";

type Row = { name: string; need: Equipment | ""; alternatives: string[] };
const select = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground";

/** One row per exercise: what it needs and what stands in for it. */
function toRows(g: ProgramEquipmentGuide): Row[] {
  const names = [...new Set([...Object.keys(g.needs), ...Object.keys(g.alternatives)])].sort();
  return names.map((name) => ({ name, need: g.needs[name] ?? "", alternatives: g.alternatives[name] ?? [] }));
}

function fromRows(rows: Row[], g: ProgramEquipmentGuide): ProgramEquipmentGuide {
  const kept = rows.filter((r) => r.name.trim());
  return {
    ...g,
    needs: Object.fromEntries(kept.filter((r) => r.need).map((r) => [r.name.trim(), r.need as Equipment])),
    alternatives: Object.fromEntries(kept.filter((r) => r.alternatives.length).map((r) => [r.name.trim(), r.alternatives])),
  };
}

/**
 * What the ready-made programs need, as the app reads it (app settings): the
 * equipment of each exercise, what stands in for it when the athlete lacks
 * that equipment, the equipment that does what another does, and what makes
 * a gym. Saved only when whole, every name from the library.
 */
export function ProgramEquipmentTab() {
  const t = useTranslations("equipmentAdmin");
  const locale = useLocale();
  const equipmentList = useEquipmentList();
  // The gear a program may need: neither none (bodyweight) nor the unsorted.
  const GEAR = (equipmentList ?? []).filter((e) => !e.noGear && !e.unspecified).map((e) => e.id);
  const ts = useTranslations("sync");
  const xl = useExerciseLabel();
  const library = useExercises().filter((e) => !e.isCustom);
  const [g, setG] = useState<ProgramEquipmentGuide | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [error, setError] = useState<{ key: "invalid" | "unknown" | "duplicate"; names?: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseProgramEquipment(s[PROGRAM_EQUIPMENT_KEY]);
        setG(parsed);
        if (parsed) setRows(toRows(parsed));
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing" || !g) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("missing")}</p>;

  const touched = () => {
    setError(null);
    setSaved(false);
  };
  const putG = (next: ProgramEquipmentGuide) => {
    setG(next);
    touched();
  };
  const setRow = (i: number, r: Row) => {
    setRows(rows.map((x, j) => (j === i ? r : x)));
    touched();
  };
  const toggle = (list: Equipment[], e: Equipment, on: boolean) => (on ? [...list, e] : list.filter((x) => x !== e));

  async function save() {
    if (!g) return;
    const names = rows.map((r) => r.name.trim()).filter(Boolean);
    const twice = names.filter((n, i) => names.indexOf(n) !== i);
    if (twice.length) return setError({ key: "duplicate", names: [...new Set(twice)].join(", ") });
    const next = fromRows(rows, g);
    const text = JSON.stringify(next);
    if (!parseProgramEquipment(text)) return setError({ key: "invalid" });
    // Programs and their alternatives name library exercises: any other name would never match.
    const all = [...names, ...rows.flatMap((r) => r.alternatives)];
    const unknown = library.length ? [...new Set(all.filter((n) => !library.some((x) => x.name === n)))] : [];
    if (unknown.length) return setError({ key: "unknown", names: unknown.join(", ") });
    await setAppSetting(PROGRAM_EQUIPMENT_KEY, text);
    setG(next);
    setSaved(true);
  }

  const needle = filter.trim().toLowerCase();
  const shown = rows.map((r, i) => [r, i] as const).filter(([r]) => !needle || r.name.toLowerCase().includes(needle) || xl(r.name).toLowerCase().includes(needle));

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Dumbbell className="h-4 w-4 text-accent-500" aria-hidden="true" /> {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("intro")}</p>
        </div>

        <fieldset className="space-y-1 rounded-xl border border-border p-3">
          <legend className="px-1 text-sm font-medium">{t("gym")}</legend>
          <p className="text-xs text-muted-foreground">{t("gymHint")}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {GEAR.map((e) => (
              <label key={e} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" className="size-4 accent-accent-600" checked={g.gym.includes(e)} onChange={(ev) => putG({ ...g, gym: toggle(g.gym, e, ev.target.checked) })} />
                {itemLabel(equipmentList, e, locale)}
              </label>
            ))}
          </div>
        </fieldset>

        <details className="rounded-xl border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">{t("standIns")}</summary>
          <p className="mt-2 text-xs text-muted-foreground">{t("standInsHint")}</p>
          <div className="mt-2 space-y-2">
            {GEAR.map((need) => (
              <div key={need}>
                <p className="text-xs font-medium">{itemLabel(equipmentList, need, locale)}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {GEAR.filter((e) => e !== need).map((e) => (
                    <label key={e} className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        className="size-4 accent-accent-600"
                        checked={(g.standIns[need] ?? []).includes(e)}
                        onChange={(ev) => {
                          const list = toggle(g.standIns[need] ?? [], e, ev.target.checked);
                          const standIns = { ...g.standIns };
                          if (list.length) standIns[need] = list;
                          else delete standIns[need];
                          putG({ ...g, standIns });
                        }}
                      />
                      {itemLabel(equipmentList, e, locale)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("exercises", { count: rows.length })}</p>
          <p className="text-xs text-muted-foreground">{t("exercisesHint")}</p>
          <Input aria-label={t("search")} placeholder={t("search")} value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9" />
        </div>
        <datalist id="equipment-library">
          {library.map((e) => (
            <option key={e.id} value={e.name}>{xl(e.name)}</option>
          ))}
        </datalist>
        {shown.map(([r, i]) => (
          <details key={i} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {r.name ? xl(r.name) : t("untitled")}{" "}
              <span className="text-xs text-muted-foreground">· {r.need ? itemLabel(equipmentList, r.need, locale) : t("noNeed")}</span>
            </summary>
            <div className="mt-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>{t("name")}</span>
                  <Input list="equipment-library" value={r.name} onChange={(e) => setRow(i, { ...r, name: e.target.value })} className="h-9" />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>{t("need")}</span>
                  <select className={select} value={r.need} onChange={(e) => setRow(i, { ...r, need: e.target.value as Row["need"] })}>
                    <option value="">{t("noNeed")}</option>
                    {GEAR.map((e) => (
                      <option key={e} value={e}>{itemLabel(equipmentList, e, locale)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block space-y-1 text-xs text-muted-foreground">
                <span>{t("alternatives")}</span>
                <NumbersInput commas label={t("alternatives")} value={r.alternatives} onChange={(alternatives) => setRow(i, { ...r, alternatives })} />
              </label>
              {r.alternatives.length > 0 && <p className="text-xs text-muted-foreground">{r.alternatives.map(xl).join(" → ")}</p>}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRows(rows.filter((_, j) => j !== i));
                  touched();
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("remove")}
              </Button>
            </div>
          </details>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setRows([...rows, { name: "", need: "", alternatives: [] }]);
            setFilter("");
            touched();
          }}
        >
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
