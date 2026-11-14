"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Plus, RefreshCw, SlidersHorizontal, Utensils } from "lucide-react";
import type { NutritionEntry } from "@/db";
import { useAuth } from "@/contexts/AuthContext";
import { updateTrainingSchedule, useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { addNutritionEntry } from "@/hooks/useNutrition";
import { useTrainablePrograms } from "@/hooks/usePrograms";
import { useWorkouts } from "@/hooks/useWorkouts";
import { localDate } from "@/lib/dates";
import { useFormat } from "@/lib/format";
import { DEFAULT_MEAL_PREFS, DIETS, EXCLUSIONS, INGREDIENTS, type Exclusion, type Ingredient, type MealPrefs } from "@/lib/mealCatalog";
import { daySeed, dayTypeOf, planDay, type PlanSlot } from "@/lib/mealPlan";
import { plannedPrograms, scheduleSessions } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Meal ideas for today, from the targets and the kind of day (a long or hard
 * session asks for more, a rest day for less), in the diet chosen. Each idea
 * can be swapped, and added to the log in one tap.
 */
export function MealPlanCard({ targets, entries, onSetTargets }: { targets?: { calories?: number; protein?: number }; entries: NutritionEntry[]; onSetTargets: () => void }) {
  const t = useTranslations("mealPlan");
  const tm = useTranslations("meals");
  const tf = useTranslations("food");
  const tn = useTranslations("nutrition");
  const { num } = useFormat();
  const { user } = useAuth();
  const profile = useAthleteProfileOrNull();
  const programs = useTrainablePrograms();
  const workouts = useWorkouts();
  const today = localDate();
  const prefs: MealPrefs = { ...DEFAULT_MEAL_PREFS, ...(profile?.mealPrefs ?? {}) };
  const [swaps, setSwaps] = useState<Partial<Record<PlanSlot, number>>>({});
  const [editing, setEditing] = useState(false);

  // Today's sessions: those planned, and those done or begun.
  const type = useMemo(() => {
    const planned = plannedPrograms({ programs, me: user?.id, trainingDays: profile?.trainingDays ?? [], from: today, moves: profile?.scheduleMoves });
    const sessions = scheduleSessions({ planned, workouts, from: today, to: today, today }).map((s) => ({
      cardio: s.index >= 0 ? s.program.structure[s.index]?.cardio : null,
      strength: true,
    }));
    const done = workouts
      .filter((w) => w.date === today)
      .map((w) => ({ cardio: w.kind === "cardio" ? { distanceKm: (w.distanceM ?? 0) / 1000, durationMin: (w.durationSec ?? 0) / 60 } : null, strength: true }));
    return dayTypeOf([...sessions, ...done]);
  }, [programs, user?.id, profile?.trainingDays, profile?.scheduleMoves, workouts, today]);

  if (!targets?.calories) {
    return (
      <section className="t-surface space-y-2 rounded-2xl p-4 ring-1 ring-foreground/5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Utensils className="h-4 w-4 text-accent-text" aria-hidden="true" />
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("needTargets")}</p>
        <Button size="sm" variant="outline" onClick={onSetTargets}>
          {t("setTargets")}
        </Button>
      </section>
    );
  }

  const plan = planDay({
    calories: targets.calories,
    protein: targets.protein ?? Math.round((targets.calories * 0.25) / 4),
    type,
    prefs,
    seed: daySeed(today),
    swaps,
  });
  const added = (name: string, slot: PlanSlot) => entries.some((e) => e.name === name && e.meal === slot);

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Utensils className="h-4 w-4 text-accent-text" aria-hidden="true" />
            {t("title")}
          </h2>
          <p className="text-xs text-muted-foreground">
            <span className={cn("font-semibold", type === "long" ? "text-accent-text" : "")}>{t(`day_${type}`)}</span>
            {" · "}
            {t("target", { calories: num(plan.calories), protein: plan.protein })}
          </p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label={t("prefs")}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {plan.meals.length === 0 && <p className="text-sm text-muted-foreground">{t("nothing")}</p>}
      <ul className="space-y-2.5">
        {plan.meals.map((m) => {
          const name = tm(m.meal.id);
          const done = added(name, m.slot);
          return (
            <li key={m.slot} className="space-y-1 rounded-xl bg-muted/50 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {m.slot === "snack" && type !== "rest" ? t("snackTraining") : tn(`meal_${m.slot}`)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t("macros", { calories: m.macros.calories, protein: m.macros.proteinG, carbs: m.macros.carbsG })}
                </p>
              </div>
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">
                {m.items
                  .map(([k, g]) => {
                    const unit = (INGREDIENTS[k] as Ingredient).unitG;
                    return `${tf(k)} ${g} g${unit && unit >= 50 ? ` (${t("pieces", { n: num(g / unit) })})` : ""}`;
                  })
                  .join(" · ")}
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setSwaps((s) => ({ ...s, [m.slot]: (s[m.slot] ?? 0) + 1 }))}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  {t("other")}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={done}
                  onClick={() =>
                    addNutritionEntry({ date: today, meal: m.slot, name, calories: m.macros.calories, proteinG: m.macros.proteinG, carbsG: m.macros.carbsG, fatG: m.macros.fatG })
                  }
                >
                  {done ? <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
                  {done ? t("added") : t("add")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("prefs")}</DialogTitle>
          </DialogHeader>
          <MealPrefsForm
            initial={prefs}
            onSave={async (next) => {
              await updateTrainingSchedule({ mealPrefs: next });
              setSwaps({});
              setEditing(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}

function MealPrefsForm({ initial, onSave }: { initial: MealPrefs; onSave: (prefs: MealPrefs) => void }) {
  const t = useTranslations("mealPlan");
  const [prefs, setPrefs] = useState(initial);
  const toggle = (x: Exclusion) =>
    setPrefs((p) => ({ ...p, exclude: p.exclude.includes(x) ? p.exclude.filter((e) => e !== x) : [...p.exclude, x] }));
  const chip = (on: boolean) => cn("min-h-10 rounded-lg px-3 text-sm font-medium", on ? "bg-accent-600 text-white" : "bg-muted");
  return (
    <div className="space-y-4">
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">{t("diet")}</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {DIETS.map((d) => (
            <button key={d} type="button" aria-pressed={prefs.diet === d} onClick={() => setPrefs((p) => ({ ...p, diet: d }))} className={chip(prefs.diet === d)}>
              {t(`diet_${d}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">{t("exclude")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {EXCLUSIONS.map((x) => (
            <button key={x} type="button" aria-pressed={prefs.exclude.includes(x)} onClick={() => toggle(x)} className={chip(prefs.exclude.includes(x))}>
              {t(`no_${x}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">{t("mealsPerDay")}</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {([3, 4] as const).map((n) => (
            <button key={n} type="button" aria-pressed={prefs.meals === n} onClick={() => setPrefs((p) => ({ ...p, meals: n }))} className={chip(prefs.meals === n)}>
              {t(`meals_${n}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <Button className="w-full" onClick={() => onSave(prefs)}>
        {t("save")}
      </Button>
    </div>
  );
}
