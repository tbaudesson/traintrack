"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { LESSONS_REFERENCE_KEY, parseLessonsReference, type LessonSport, type LessonsReference } from "@/lib/lessonsReference";
import { BODY_MUSCLES_KEY, parseBodyMuscles, type MuscleDef } from "@/lib/muscleMap";
import { MUSCLE_GROUPS_KEY, groupLabel, parseMuscleGroups, specificGroups, type MuscleGroupDef } from "@/lib/muscles";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { CHOICES_KEY, EQUIPMENT_KEY, MOVEMENTS_KEY, PAIN_AREAS_KEY, SWIM_STROKES_KEY, parseChoices, parseEquipment, parseMovements, parsePainAreas, parseSwimStrokes, type Choices, type EquipmentItem, type ListItem, type MovementItem, type PainAreaItem } from "@/lib/references";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Row = { id: string; fr: string; en: string; de: string };

/**
 * A list an admin keeps: each item's id (kept in the rows, so changed with
 * care) and its name in the three languages, in order, plus what a list adds
 * (a theme's "core", a muscle's group).
 */
export function ListEditor<R extends Row>({
  title,
  hint,
  rows,
  onChange,
  blank,
  extra,
  shown,
}: {
  title: string;
  hint?: string;
  rows: R[];
  onChange: (rows: R[]) => void;
  blank: R;
  extra?: (row: R, set: (change: Partial<R>) => void) => ReactNode;
  /** The rows to show (a search over a long list); all by default. */
  shown?: (row: R) => boolean;
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
      {rows.map((r, i) => (shown && !shown(r) ? null : (
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
      )))}
      <Button variant="outline" size="sm" onClick={() => onChange([...rows, { ...blank }])}>
        <Plus className="mr-1 size-4" aria-hidden="true" />
        {t("add")}
      </Button>
    </section>
  );
}

/** Read one app setting, edit it, save it only when it holds together. */
export function useSetting<T>(key: string, parse: (text: string | null | undefined) => T | null) {
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

export function Frame({ state, title, intro, invalid, saving, saved, onSave, children, missing, invalidText }: { state: string; title: string; intro: string; invalid: boolean; saving: boolean; saved: boolean; onSave: () => void; children: ReactNode; missing?: string; invalidText?: string }) {
  const t = useTranslations("references");
  const ts = useTranslations("sync");
  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{missing ?? t("missing")}</p>;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{intro}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("idHint")}</p>
      </div>
      {children}
      {invalid && <p role="alert" className="text-sm text-destructive">{invalidText ?? t("invalid")}</p>}
      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : saved ? <Check className="size-4" aria-hidden="true" /> : null}
        {saved ? t("saved") : t("save")}
      </Button>
    </div>
  );
}

const blankItem = { id: "", fr: "", en: "", de: "" };

/**
 * The group lessons' sports (tennis, vaulting…): for each, its name, whether
 * its lessons are given on a horse, and its themes, age bands, levels and
 * equipment. One sport edited at a time; a new one starts empty but named.
 */
export function LessonsReferenceTab() {
  const t = useTranslations("references");
  const s = useSetting<LessonsReference>(LESSONS_REFERENCE_KEY, parseLessonsReference);
  const v = s.value;
  const [current, setCurrent] = useState(0);
  const sport = v?.sports[current];
  const setSport = (change: Partial<LessonSport>) => v && s.change({ sports: v.sports.map((x, i) => (i === current ? { ...x, ...change } : x)) });
  return (
    <Frame state={s.state} title={t("lessonsTitle")} intro={t("lessonsIntro")} invalid={s.invalid} saving={s.saving} saved={s.saved} onSave={() => v && s.save(JSON.stringify(v, null, 2))}>
      {v && sport && (
        <>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("sports")}>
            {v.sports.map((x, i) => (
              <Button key={i} size="sm" variant={i === current ? "default" : "outline"} aria-pressed={i === current} onClick={() => setCurrent(i)}>
                {x.fr || x.id || "…"}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                s.change({ sports: [...v.sports, { ...blankItem, horses: false, themes: [], ageBands: [], levels: [], equipment: [] }] });
                setCurrent(v.sports.length);
              }}
            >
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {t("addSport")}
            </Button>
          </div>
          <Card>
            <CardContent className="grid gap-2 py-3 sm:grid-cols-4">
              {(["id", "fr", "en", "de"] as const).map((k) => (
                <label key={k} className="block space-y-1 text-xs">
                  <span className="font-medium">{t(`field_${k}`)}</span>
                  <Input value={sport[k]} onChange={(e) => setSport({ [k]: e.target.value })} />
                </label>
              ))}
              <label className="flex min-h-9 items-center gap-2 text-xs sm:col-span-4">
                <input type="checkbox" checked={sport.horses} onChange={(e) => setSport({ horses: e.target.checked })} className="size-4 accent-accent-600" />
                {t("onHorse")}
              </label>
              {v.sports.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-self-start text-destructive sm:col-span-4"
                  onClick={() => {
                    s.change({ sports: v.sports.filter((_, i) => i !== current) });
                    setCurrent(0);
                  }}
                >
                  <Trash2 className="mr-1 size-4" aria-hidden="true" />
                  {t("remove", { name: sport.fr || sport.id })}
                </Button>
              )}
            </CardContent>
          </Card>
          <ListEditor
            title={t("themes")}
            hint={t("themesHint")}
            rows={sport.themes}
            blank={{ ...blankItem, core: false }}
            onChange={(themes) => setSport({ themes })}
            extra={(r, set) => (
              <label className="flex min-h-9 items-center gap-2 text-xs">
                <input type="checkbox" checked={!!r.core} onChange={(e) => set({ core: e.target.checked })} className="size-4 accent-accent-600" />
                {t("core")}
              </label>
            )}
          />
          <ListEditor title={t("ageBands")} rows={sport.ageBands} blank={blankItem} onChange={(ageBands) => setSport({ ageBands })} />
          <ListEditor title={t("levels")} rows={sport.levels} blank={blankItem} onChange={(levels) => setSport({ levels })} />
          <ListEditor title={t("equipment")} rows={sport.equipment} blank={blankItem} onChange={(equipment) => setSport({ equipment })} />
        </>
      )}
    </Frame>
  );
}

/** The muscles of the body map, each in a group. */
export function BodyMusclesTab() {
  const t = useTranslations("references");
  const locale = useLocale();
  const groups = specificGroups(useMuscleGroups());
  const s = useSetting<MuscleDef[]>(BODY_MUSCLES_KEY, parseBodyMuscles);
  const v = s.value;
  return (
    <Frame state={s.state} title={t("musclesTitle")} intro={t("musclesIntro")} invalid={s.invalid} saving={s.saving} saved={s.saved} onSave={() => v && s.save(JSON.stringify(v, null, 2))}>
      {v && (
        <ListEditor
          title={t("muscles")}
          rows={v}
          blank={{ ...blankItem, group: groups[0]?.id ?? "" } as MuscleDef}
          onChange={(rows) => s.change(rows)}
          extra={(r, set) => (
            <label className="block space-y-1 text-xs">
              <span className="font-medium">{t("group")}</span>
              <select
                value={r.group}
                onChange={(e) => set({ group: e.target.value as MuscleDef["group"] })}
                className="h-10 w-full rounded-lg border border-border bg-transparent px-2 text-sm"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{groupLabel(groups, g.id, locale)}</option>
                ))}
              </select>
            </label>
          )}
        />
      )}
    </Frame>
  );
}

/** The muscle groups of the exercises, in order, with their roles. */
export function MuscleGroupsTab() {
  const t = useTranslations("references");
  const s = useSetting<MuscleGroupDef[]>(MUSCLE_GROUPS_KEY, parseMuscleGroups);
  const v = s.value;
  const role = (r: MuscleGroupDef, set: (c: Partial<MuscleGroupDef>) => void, key: "wholeBody" | "unspecified" | "noRecovery" | "endurance") => (
    <label className="flex min-h-9 items-center gap-2 text-xs">
      <input type="checkbox" checked={r[key]} onChange={(e) => set({ [key]: e.target.checked })} className="size-4 accent-accent-600" />
      {t(`role_${key}`)}
    </label>
  );
  return (
    <Frame state={s.state} title={t("groupsTitle")} intro={t("groupsIntro")} invalid={s.invalid} saving={s.saving} saved={s.saved} onSave={() => v && s.save(JSON.stringify(v, null, 2))}>
      {v && (
        <ListEditor
          title={t("groups")}
          hint={t("groupsHint")}
          rows={v}
          blank={{ ...blankItem, wholeBody: false, unspecified: false, noRecovery: false, endurance: false }}
          onChange={(rows) => s.change(rows)}
          extra={(r, set) => (
            <div className="flex flex-wrap gap-x-4">
              {role(r, set, "wholeBody")}
              {role(r, set, "unspecified")}
              {role(r, set, "noRecovery")}
              {role(r, set, "endurance")}
            </div>
          )}
        />
      )}
    </Frame>
  );
}

/** One list of Admin > Lists, saved on its own. */
function ListTab<R extends Row>({ settingKey, parse, title, intro, blank, extra }: { settingKey: string; parse: (text: string | null | undefined) => R[] | null; title: string; intro: string; blank: R; extra?: (row: R, set: (change: Partial<R>) => void) => ReactNode }) {
  const t = useTranslations("references");
  const s = useSetting<R[]>(settingKey, parse);
  const v = s.value;
  return (
    <Frame state={s.state} title={title} intro={intro} invalid={s.invalid} saving={s.saving} saved={s.saved} onSave={() => v && s.save(JSON.stringify(v, null, 2))}>
      {v && <ListEditor title={t("items")} rows={v} blank={blank} onChange={(rows) => s.change(rows)} extra={extra} />}
    </Frame>
  );
}

const ROLES = ["noGear", "noWarmup", "unspecified", "gym", "home"] as const;

/**
 * The lists the app offers and reads (app settings): the equipment with its
 * roles, load step and bar; the movements with their words in a sentence;
 * the swim strokes; the values of the choices.
 */
export function ListsTab() {
  const t = useTranslations("references");
  const [which, setWhich] = useState<"equipment" | "movements" | "areas" | "strokes" | "choices">("equipment");
  const num = (label: string, value: number, onChange: (n: number) => void, step = 0.5) => (
    <label className="flex items-center gap-2 text-xs">
      {label}
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-9 w-20" />
    </label>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("listsTitle")}>
        {(["equipment", "movements", "areas", "strokes", "choices"] as const).map((k) => (
          <Button key={k} size="sm" variant={which === k ? "default" : "outline"} aria-pressed={which === k} onClick={() => setWhich(k)}>
            {t(`list_${k}`)}
          </Button>
        ))}
      </div>
      {which === "equipment" && (
        <ListTab<EquipmentItem>
          settingKey={EQUIPMENT_KEY}
          parse={parseEquipment}
          title={t("list_equipment")}
          intro={t("equipmentIntro")}
          blank={{ ...blankItem, noGear: false, noWarmup: false, unspecified: false, gym: false, home: false, stepKg: 2.5, barKg: 0 }}
          extra={(r, set) => (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {ROLES.map((role) => (
                <label key={role} className="flex min-h-9 items-center gap-2 text-xs">
                  <input type="checkbox" checked={r[role]} onChange={(e) => set({ [role]: e.target.checked } as Partial<EquipmentItem>)} className="size-4 accent-accent-600" />
                  {t(`equip_${role}`)}
                </label>
              ))}
              {num(t("stepKg"), r.stepKg, (n) => set({ stepKg: n }))}
              {num(t("barKg"), r.barKg, (n) => set({ barKg: n }), 1)}
            </div>
          )}
        />
      )}
      {which === "movements" && (
        <ListTab<MovementItem>
          settingKey={MOVEMENTS_KEY}
          parse={parseMovements}
          title={t("list_movements")}
          intro={t("movementsIntro")}
          blank={{ ...blankItem, shortFr: "", shortEn: "", shortDe: "" }}
          extra={(r, set) => (
            <div className="grid gap-2 sm:grid-cols-3">
              {(["shortFr", "shortEn", "shortDe"] as const).map((k) => (
                <label key={k} className="block space-y-1 text-xs">
                  <span className="font-medium">{t(k)}</span>
                  <Input value={r[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<MovementItem>)} />
                </label>
              ))}
            </div>
          )}
        />
      )}
      {which === "areas" && (
        <ListTab<PainAreaItem>
          settingKey={PAIN_AREAS_KEY}
          parse={parsePainAreas}
          title={t("list_areas")}
          intro={t("areasIntro")}
          blank={{ ...blankItem, unspecified: false }}
          extra={(r, set) => (
            <label className="flex min-h-9 items-center gap-2 text-xs">
              <input type="checkbox" checked={r.unspecified} onChange={(e) => set({ unspecified: e.target.checked })} className="size-4 accent-accent-600" />
              {t("areaUnspecified")}
            </label>
          )}
        />
      )}
      {which === "strokes" && <ListTab<ListItem> settingKey={SWIM_STROKES_KEY} parse={parseSwimStrokes} title={t("list_strokes")} intro={t("strokesIntro")} blank={blankItem} />}
      {which === "choices" && <ChoicesEditor />}
    </div>
  );
}

/** The values the choices offer, as numbers separated by commas. */
function ChoicesEditor() {
  const t = useTranslations("references");
  const s = useSetting<Choices>(CHOICES_KEY, parseChoices);
  const v = s.value;
  const [texts, setTexts] = useState<Record<keyof Choices, string> | null>(null);
  const shown = texts ?? (v ? (Object.fromEntries(Object.entries(v).map(([k, list]) => [k, (list as number[]).join(", ")])) as Record<keyof Choices, string>) : null);
  const parse = (text: string) => text.split(/[,\s]+/).filter(Boolean).map(Number);
  return (
    <Frame
      state={s.state}
      title={t("list_choices")}
      intro={t("choicesIntro")}
      invalid={s.invalid}
      saving={s.saving}
      saved={s.saved}
      onSave={() => shown && s.save(JSON.stringify(Object.fromEntries(Object.entries(shown).map(([k, text]) => [k, parse(text)])), null, 2))}
    >
      {shown && (
        <div className="space-y-2">
          {(["restDefaults", "restWarmups", "poolLengths", "cardioMinutes", "intensitySteps"] as const).map((k) => (
            <label key={k} className="block space-y-1 text-xs">
              <span className="font-medium">{t(`choice_${k}`)}</span>
              <Input value={shown[k]} onChange={(e) => setTexts({ ...shown, [k]: e.target.value })} />
            </label>
          ))}
        </div>
      )}
    </Frame>
  );
}
