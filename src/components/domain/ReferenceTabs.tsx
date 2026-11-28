"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { TENNIS_REFERENCE_KEY, parseTennisReference, type TennisReference } from "@/lib/tennisReference";
import { BODY_MUSCLES_KEY, parseBodyMuscles, type MuscleDef } from "@/lib/muscleMap";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Row = { id: string; fr: string; en: string; de: string };

/**
 * A list an admin keeps: each item's id (kept in the rows, so changed with
 * care) and its name in the three languages, in order, plus what a list adds
 * (a theme's "core", a muscle's group).
 */
function ListEditor<R extends Row>({
  title,
  hint,
  rows,
  onChange,
  blank,
  extra,
}: {
  title: string;
  hint?: string;
  rows: R[];
  onChange: (rows: R[]) => void;
  blank: R;
  extra?: (row: R, set: (change: Partial<R>) => void) => ReactNode;
}) {
  const t = useTranslations("references");
  const set = (i: number, change: Partial<R>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...change } : r)));
  const move = (i: number, by: number) => {
    const next = [...rows];
    const [r] = next.splice(i, 1);
    next.splice(i + by, 0, r);
    onChange(next);
  };
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {rows.map((r, i) => (
        <Card key={i}>
          <CardContent className="grid gap-2 py-3 sm:grid-cols-4">
            {(["id", "fr", "en", "de"] as const).map((k) => (
              <label key={k} className="block space-y-1 text-xs">
                <span className="font-medium">{t(`field_${k}`)}</span>
                <Input value={r[k]} onChange={(e) => set(i, { [k]: e.target.value } as Partial<R>)} />
              </label>
            ))}
            {extra && <div className="sm:col-span-4">{extra(r, (c) => set(i, c))}</div>}
            <div className="flex gap-1 sm:col-span-4">
              <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("moveUp", { name: r.fr || r.id })}>
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon-sm" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={t("moveDown", { name: r.fr || r.id })}>
                <ArrowDown className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                <Trash2 className="mr-1 size-4" aria-hidden="true" />
                {t("remove", { name: r.fr || r.id })}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...rows, { ...blank }])}>
        <Plus className="mr-1 size-4" aria-hidden="true" />
        {t("add")}
      </Button>
    </section>
  );
}

/** Read one app setting, edit it, save it only when it holds together. */
function useSetting<T>(key: string, parse: (text: string | null | undefined) => T | null) {
  const [value, setValue] = useState<T | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parse(s[key]);
        setValue(parsed);
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, [key, parse]);
  const change = (v: T) => {
    setValue(v);
    setSaved(false);
    setInvalid(false);
  };
  async function save(text: string) {
    if (!parse(text)) return setInvalid(true);
    setSaving(true);
    try {
      await setAppSetting(key, text);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }
  return { value, state, change, save, saving, saved, invalid };
}

function Frame({ state, title, intro, invalid, saving, saved, onSave, children }: { state: string; title: string; intro: string; invalid: boolean; saving: boolean; saved: boolean; onSave: () => void; children: ReactNode }) {
  const t = useTranslations("references");
  const ts = useTranslations("sync");
  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("missing")}</p>;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{intro}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("idHint")}</p>
      </div>
      {children}
      {invalid && <p role="alert" className="text-sm text-destructive">{t("invalid")}</p>}
      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : saved ? <Check className="size-4" aria-hidden="true" /> : null}
        {saved ? t("saved") : t("save")}
      </Button>
    </div>
  );
}

const blankItem = { id: "", fr: "", en: "", de: "" };

/** The tennis notebook's themes, age bands, levels and equipment. */
export function TennisReferenceTab() {
  const t = useTranslations("references");
  const s = useSetting<TennisReference>(TENNIS_REFERENCE_KEY, parseTennisReference);
  const v = s.value;
  return (
    <Frame state={s.state} title={t("tennisTitle")} intro={t("tennisIntro")} invalid={s.invalid} saving={s.saving} saved={s.saved} onSave={() => v && s.save(JSON.stringify(v, null, 2))}>
      {v && (
        <>
          <ListEditor
            title={t("themes")}
            hint={t("themesHint")}
            rows={v.themes}
            blank={{ ...blankItem, core: false }}
            onChange={(themes) => s.change({ ...v, themes })}
            extra={(r, set) => (
              <label className="flex min-h-9 items-center gap-2 text-xs">
                <input type="checkbox" checked={!!r.core} onChange={(e) => set({ core: e.target.checked })} className="size-4 accent-accent-600" />
                {t("core")}
              </label>
            )}
          />
          <ListEditor title={t("ageBands")} rows={v.ageBands} blank={blankItem} onChange={(ageBands) => s.change({ ...v, ageBands })} />
          <ListEditor title={t("levels")} rows={v.levels} blank={blankItem} onChange={(levels) => s.change({ ...v, levels })} />
          <ListEditor title={t("equipment")} rows={v.equipment} blank={blankItem} onChange={(equipment) => s.change({ ...v, equipment })} />
        </>
      )}
    </Frame>
  );
}

const GROUPS = MUSCLE_GROUPS.filter((g) => g !== "full_body" && g !== "other");

/** The muscles of the body map, each in a group. */
export function BodyMusclesTab() {
  const t = useTranslations("references");
  const te = useTranslations("exercises");
  const s = useSetting<MuscleDef[]>(BODY_MUSCLES_KEY, parseBodyMuscles);
  const v = s.value;
  return (
    <Frame state={s.state} title={t("musclesTitle")} intro={t("musclesIntro")} invalid={s.invalid} saving={s.saving} saved={s.saved} onSave={() => v && s.save(JSON.stringify(v, null, 2))}>
      {v && (
        <ListEditor
          title={t("muscles")}
          rows={v}
          blank={{ ...blankItem, group: "chest" } as MuscleDef}
          onChange={(rows) => s.change(rows)}
          extra={(r, set) => (
            <label className="block space-y-1 text-xs">
              <span className="font-medium">{t("group")}</span>
              <select
                value={r.group}
                onChange={(e) => set({ group: e.target.value as MuscleDef["group"] })}
                className="h-10 w-full rounded-lg border border-border bg-transparent px-2 text-sm"
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>{te(`mg_${g}`)}</option>
                ))}
              </select>
            </label>
          )}
        />
      )}
    </Frame>
  );
}
