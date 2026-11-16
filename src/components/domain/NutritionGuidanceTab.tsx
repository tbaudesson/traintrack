"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Apple, Check, Loader2 } from "lucide-react";
import type { TrainingGoal } from "@/db";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { FAVORITE_SPORTS } from "@/lib/appTheme";
import type { DayType, PlanSlot } from "@/lib/mealPlan";
import { NUTRITION_GUIDANCE_KEY, parseGuidance, type NutritionGuidance, type Range } from "@/lib/sportNutrition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const DAYS: DayType[] = ["rest", "training", "long"];
const GOALS: TrainingGoal[] = ["fat_loss", "hypertrophy", "strength", "endurance", "general_fitness"];
type FuelKey = keyof NutritionGuidance["fuelling"];
const FUEL_MINUTES: FuelKey[] = ["sessionMinutes", "mealBefore", "snackBefore", "recoveryAfter", "duringFrom", "duringHighFrom", "waterFrom"];
const FUEL_RANGES: FuelKey[] = [
  "mealCarbsPerKg", "mealCarbsPerKgLong", "snackCarbs", "duringCarbsPerHour", "duringCarbsPerHourHigh", "waterPerHour",
  "recoveryProteinPerKg", "recoveryProteinBounds", "recoveryCarbsPerKgLong", "recoveryCarbsPerKg",
];

/**
 * The nutrition references by sport, as the app reads them (app settings):
 * every figure the meal ideas and the advice around a session use. Saved
 * only when they hold together.
 */
export function NutritionGuidanceTab() {
  const t = useTranslations("nutritionGuidance");
  const ts = useTranslations("sync");
  const tc = useTranslations("catalog");
  const tg = useTranslations("templates");
  const tn = useTranslations("nutrition");
  const [g, setG] = useState<NutritionGuidance | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseGuidance(s[NUTRITION_GUIDANCE_KEY]);
        setG(parsed);
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing" || !g) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("missing")}</p>;

  const change = (next: NutritionGuidance) => {
    setG(next);
    setError(false);
    setSaved(false);
  };
  const n = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));
  const field = (label: string, value: number, set: (v: number) => void, step = "0.1") => (
    <label className="block text-xs text-muted-foreground">
      {label}
      <Input type="number" inputMode="decimal" step={step} value={Number.isFinite(value) ? value : ""} onChange={(e) => set(n(e.target.value))} className="mt-0.5 h-9" />
    </label>
  );
  const pair = (label: string, value: Range, set: (v: Range) => void, step = "0.1") => (
    <div className="text-xs text-muted-foreground">
      {label}
      <div className="mt-0.5 grid grid-cols-2 gap-1">
        <Input aria-label={`${label} — ${t("min")}`} type="number" inputMode="decimal" step={step} value={Number.isFinite(value[0]) ? value[0] : ""} onChange={(e) => set([n(e.target.value), value[1]])} className="h-9" />
        <Input aria-label={`${label} — ${t("max")}`} type="number" inputMode="decimal" step={step} value={Number.isFinite(value[1]) ? value[1] : ""} onChange={(e) => set([value[0], n(e.target.value)])} className="h-9" />
      </div>
    </div>
  );

  async function save() {
    const text = JSON.stringify(g);
    if (!parseGuidance(text)) {
      setError(true);
      return;
    }
    await setAppSetting(NUTRITION_GUIDANCE_KEY, text);
    setSaved(true);
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Apple className="h-4 w-4 text-accent-500" aria-hidden="true" /> {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("intro")}</p>
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("sportsTitle")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {FAVORITE_SPORTS.map((sport) => (
              <label key={sport} className="flex items-center justify-between gap-2 text-sm">
                {tc(sport === "callisthenics" ? "cat_callisthenics" : `cat_${sport}`)}
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={g.sports[sport] ?? "general"}
                  onChange={(e) => change({ ...g, sports: { ...g.sports, [sport]: e.target.value } })}
                >
                  {Object.keys(g.families).map((f) => (
                    <option key={f} value={f}>{t.has(`family_${f}`) ? t(`family_${f}`) : f}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        {Object.entries(g.families).map(([id, f]) => {
          const setF = (next: Partial<typeof f>) => change({ ...g, families: { ...g.families, [id]: { ...f, ...next } } });
          return (
            <section key={id} className="space-y-2 rounded-xl bg-muted/40 p-3">
              <h3 className="text-sm font-semibold">{t.has(`family_${id}`) ? t(`family_${id}`) : id}</h3>
              <div className="grid grid-cols-2 gap-2">
                {field(t("protein"), f.protein, (v) => setF({ protein: v }), "0.05")}
                <label className="flex items-end gap-2 pb-2 text-xs text-muted-foreground">
                  <input type="checkbox" className="size-5 accent-accent-600" checked={f.endurance} onChange={(e) => setF({ endurance: e.target.checked })} />
                  {t("endurance")}
                </label>
              </div>
              {DAYS.map((d) => (
                <div key={d} className="grid grid-cols-[1fr_auto] items-end gap-2">
                  {pair(t("carbs", { day: t(`day_${d}`) }), f.carbs[d], (v) => setF({ carbs: { ...f.carbs, [d]: v } }), "0.5")}
                  <div className="w-24">{field(t("energy"), f.energy[d], (v) => setF({ energy: { ...f.energy, [d]: v } }), "0.01")}</div>
                </div>
              ))}
            </section>
          );
        })}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("goalsTitle")}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GOALS.map((goal) => (
              <label key={goal} className="block text-xs text-muted-foreground">
                {tg(`goal_${goal === "general_fitness" ? "general" : goal}`)}
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.05"
                  value={g.proteinForGoal[goal] ?? ""}
                  placeholder={t("none")}
                  onChange={(e) => {
                    const v = n(e.target.value);
                    const next = { ...g.proteinForGoal };
                    if (Number.isFinite(v)) next[goal] = v;
                    else delete next[goal];
                    change({ ...g, proteinForGoal: next });
                  }}
                  className="mt-0.5 h-9"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("targetsTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("activityHint")}</p>
          {g.targets.activity.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              {field(t("upToDays"), row.upToDays, (v) => change({ ...g, targets: { ...g.targets, activity: g.targets.activity.map((r, j) => (j === i ? { ...r, upToDays: v } : r)) } }), "1")}
              {field(t("activityFactor"), row.factor, (v) => change({ ...g, targets: { ...g.targets, activity: g.targets.activity.map((r, j) => (j === i ? { ...r, factor: v } : r)) } }), "0.025")}
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2 text-xs text-muted-foreground">
            <span />
            <span className="w-24">{t("goalAdjustment")}</span>
            <span className="w-24">{t("goalProtein")}</span>
            {GOALS.map((goal) => (
              <GoalRow
                key={goal}
                label={tg(`goal_${goal === "general_fitness" ? "general" : goal}`)}
                adjustment={g.targets.goalAdjustment[goal]}
                protein={g.targets.proteinPerKg[goal]}
                parse={n}
                onAdjustment={(v) => change({ ...g, targets: { ...g.targets, goalAdjustment: { ...g.targets.goalAdjustment, [goal]: v } } })}
                onProtein={(v) => change({ ...g, targets: { ...g.targets, proteinPerKg: { ...g.targets.proteinPerKg, [goal]: v } } })}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field(t("water"), g.targets.waterMlPerKg, (v) => change({ ...g, targets: { ...g.targets, waterMlPerKg: v } }), "1")}
            {field(t("defaultDays"), g.targets.defaultTrainingDays, (v) => change({ ...g, targets: { ...g.targets, defaultTrainingDays: v } }), "1")}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("mealsTitle")}</h3>
          {(["4", "3"] as const).map((count) => (
            <div key={count} className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("split", { count })}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {g.meals.split[count].map(([slot, share], i) => (
                  <div key={slot}>
                    {field(tn(`meal_${slot as PlanSlot}`), share, (v) =>
                      change({ ...g, meals: { ...g.meals, split: { ...g.meals.split, [count]: g.meals.split[count].map((x, j) => (j === i ? [x[0], v] : x)) } } }), "0.01")}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {field(t("longKm"), g.meals.longDay.distanceKm, (v) => change({ ...g, meals: { ...g.meals, longDay: { ...g.meals.longDay, distanceKm: v } } }), "1")}
            {field(t("longMinutes"), g.meals.longDay.minutes, (v) => change({ ...g, meals: { ...g.meals, longDay: { ...g.meals.longDay, minutes: v } } }), "5")}
            {field(t("proteinShareMax"), g.meals.proteinShareMax, (v) => change({ ...g, meals: { ...g.meals, proteinShareMax: v } }), "0.01")}
            {field(t("proteinShareDefault"), g.meals.proteinShareDefault, (v) => change({ ...g, meals: { ...g.meals, proteinShareDefault: v } }), "0.01")}
          </div>
          {pair(t("portionScale"), g.meals.portionScale, (v) => change({ ...g, meals: { ...g.meals, portionScale: v } }), "0.1")}
        </section>

        <section className="grid grid-cols-2 gap-2">
          <h3 className="col-span-2 text-sm font-semibold">{t("fatTitle")}</h3>
          {field(t("fatFloor"), g.fat.floorPerKg, (v) => change({ ...g, fat: { ...g.fat, floorPerKg: v } }), "0.05")}
          {field(t("fatShare"), g.fat.share, (v) => change({ ...g, fat: { ...g.fat, share: v } }), "0.01")}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("fuelTitle")}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FUEL_MINUTES.map((k) => <div key={k}>{field(t(`fuel_${k}`), g.fuelling[k] as number, (v) => change({ ...g, fuelling: { ...g.fuelling, [k]: v } }), "5")}</div>)}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {FUEL_RANGES.map((k) => (
              <div key={k}>{pair(t(`fuel_${k}`), g.fuelling[k] as Range, (v) => change({ ...g, fuelling: { ...g.fuelling, [k]: v } }), k.includes("PerKg") ? "0.05" : "5")}</div>
            ))}
          </div>
        </section>

        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t("invalid")}</p>}
        <Button onClick={save} className="w-full">
          {saved ? <><Check className="mr-1 h-4 w-4" aria-hidden="true" />{t("saved")}</> : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}

/** One goal's calories against the upkeep, and its protein. */
function GoalRow({ label, adjustment, protein, parse, onAdjustment, onProtein }: {
  label: string;
  adjustment: number;
  protein: number;
  parse: (v: string) => number;
  onAdjustment: (v: number) => void;
  onProtein: (v: number) => void;
}) {
  return (
    <>
      <span className="pb-2 text-sm text-foreground">{label}</span>
      <Input aria-label={`${label} — calories`} type="number" inputMode="decimal" step="0.01" value={Number.isFinite(adjustment) ? adjustment : ""} onChange={(e) => onAdjustment(parse(e.target.value))} className="h-9 w-24" />
      <Input aria-label={`${label} — g/kg`} type="number" inputMode="decimal" step="0.05" value={Number.isFinite(protein) ? protein : ""} onChange={(e) => onProtein(parse(e.target.value))} className="h-9 w-24" />
    </>
  );
}
