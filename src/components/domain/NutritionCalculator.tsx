"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";
import type { AthleteProfile } from "@/db";
import { localDate } from "@/lib/dates";
import { ageOn, nutritionPlan, type NutritionPlan } from "@/lib/nutritionCalc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Work out daily targets from the body, the goal and the training week, show
 * how, and hand them to the targets form to save.
 */
export function NutritionCalculator({
  profile,
  latestWeight,
  onApply,
}: {
  profile: AthleteProfile | undefined;
  latestWeight?: number;
  onApply: (plan: NutritionPlan) => void;
}) {
  const t = useTranslations("nutritionCalc");
  const to = useTranslations("onboarding");
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState(latestWeight ? String(latestWeight) : "");
  const [height, setHeight] = useState(profile?.heightCm ? String(profile.heightCm) : "");
  const [age, setAge] = useState(profile?.birthDate ? String(ageOn(profile.birthDate, localDate())) : "");

  const w = Number(weight.replace(",", "."));
  const h = Number(height);
  const a = Number(age);
  const ready = w > 30 && h > 120 && a >= 14 && a < 100;
  const goal = profile?.goals?.[0];
  const plan = ready
    ? nutritionPlan({ weightKg: w, heightCm: h, age: a, sex: profile?.sex, goal, trainingDays: profile?.trainingDays?.length ?? 3 })
    : null;

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Calculator className="mr-1 h-4 w-4" aria-hidden="true" />
        {t("open")}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl bg-muted/40 p-3">
      <p className="text-sm font-semibold">{t("title")}</p>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-muted-foreground">
          {t("weight")}
          <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-0.5 h-10" />
        </label>
        <label className="text-xs text-muted-foreground">
          {t("height")}
          <Input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} className="mt-0.5 h-10" />
        </label>
        <label className="text-xs text-muted-foreground">
          {t("age")}
          <Input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} className="mt-0.5 h-10" />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("from", {
          goal: goal ? to(`goal_${goal}`) : to("goal_general_fitness"),
          days: profile?.trainingDays?.length ?? 3,
        })}
      </p>

      {plan ? (
        <>
          <ul className="space-y-0.5 text-sm">
            <li>{t("bmr", { kcal: plan.bmr })}</li>
            <li>{t("maintenance", { kcal: plan.maintenance, factor: plan.activity })}</li>
            <li className="font-semibold">
              {t("target", { kcal: plan.calories, change: Math.round(plan.adjustment * 100) })}
            </li>
            <li className="text-muted-foreground">
              {t("macros", { protein: plan.protein, carbs: plan.carbs, fat: plan.fat, water: plan.water })}
            </li>
          </ul>
          <Button className="w-full" onClick={() => onApply(plan)}>{t("apply")}</Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("needData")}</p>
      )}
      <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}
