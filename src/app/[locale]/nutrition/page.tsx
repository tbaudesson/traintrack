"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useNutritionForDate,
  addNutritionEntry,
  deleteNutritionEntry,
  sumMacros,
} from "@/hooks/useNutrition";
import { useAthleteProfile, updateNutritionTargets } from "@/hooks/useAthleteProfile";
import type { Meal } from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Settings2, Loader2 } from "lucide-react";

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

function MacroRing({ label, value, target, unit }: { label: string; value: number; target?: number; unit: string }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" opacity={0.25} />
          {target ? (
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
              strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" className="text-indigo-500"
            />
          ) : null}
        </svg>
        <span className="absolute text-xs font-bold">{Math.round(value)}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {target ? <span className="text-[10px] text-muted-foreground">/ {target}{unit}</span> : null}
    </div>
  );
}

export default function NutritionPage() {
  const t = useTranslations("nutrition");
  const today = new Date().toISOString().split("T")[0];
  const entries = useNutritionForDate(today);
  const profile = useAthleteProfile();
  const totals = sumMacros(entries);
  const targets = profile?.nutritionTargets;

  const [adding, setAdding] = useState(false);
  const [editTargets, setEditTargets] = useState(false);
  const [name, setName] = useState("");
  const [meal, setMeal] = useState<Meal>("breakfast");
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const [carb, setCarb] = useState("");
  const [fat, setFat] = useState("");
  const [busy, setBusy] = useState(false);

  // target edit fields
  const [tCal, setTCal] = useState(targets?.calories?.toString() ?? "");
  const [tPro, setTPro] = useState(targets?.protein?.toString() ?? "");
  const [tCarb, setTCarb] = useState(targets?.carbs?.toString() ?? "");
  const [tFat, setTFat] = useState(targets?.fat?.toString() ?? "");

  async function handleAdd() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addNutritionEntry({
        date: today,
        meal,
        name: name.trim(),
        calories: cal ? Number(cal) : undefined,
        proteinG: pro ? Number(pro) : undefined,
        carbsG: carb ? Number(carb) : undefined,
        fatG: fat ? Number(fat) : undefined,
      });
      setName(""); setCal(""); setPro(""); setCarb(""); setFat("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTargets() {
    await updateNutritionTargets({
      calories: tCal ? Number(tCal) : undefined,
      protein: tPro ? Number(tPro) : undefined,
      carbs: tCarb ? Number(tCarb) : undefined,
      fat: tFat ? Number(tFat) : undefined,
    });
    setEditTargets(false);
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <Button size="sm" variant="outline" onClick={() => setEditTargets((v) => !v)}>
            <Settings2 className="mr-1 h-4 w-4" />
            {t("targets")}
          </Button>
        }
      />
      <div className="space-y-5 p-4 pb-24">
        {/* Totals */}
        <Card>
          <CardContent className="py-4">
            <p className="mb-3 text-sm font-semibold text-muted-foreground">{t("today")}</p>
            <div className="flex justify-around">
              <MacroRing label={t("calories")} value={totals.calories} target={targets?.calories} unit="" />
              <MacroRing label={t("protein")} value={totals.protein} target={targets?.protein} unit="g" />
              <MacroRing label={t("carbs")} value={totals.carbs} target={targets?.carbs} unit="g" />
              <MacroRing label={t("fat")} value={totals.fat} target={targets?.fat} unit="g" />
            </div>
          </CardContent>
        </Card>

        {editTargets && (
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-sm font-semibold">{t("targets")}</p>
              <div className="grid grid-cols-2 gap-2">
                <LabeledInput label={t("calories")} value={tCal} onChange={setTCal} />
                <LabeledInput label={t("protein")} value={tPro} onChange={setTPro} />
                <LabeledInput label={t("carbs")} value={tCarb} onChange={setTCarb} />
                <LabeledInput label={t("fat")} value={tFat} onChange={setTFat} />
              </div>
              <Button onClick={handleSaveTargets} className="w-full">{t("saveTargets")}</Button>
            </CardContent>
          </Card>
        )}

        {/* Add food */}
        {adding ? (
          <Card>
            <CardContent className="space-y-3 py-4">
              <Input placeholder={t("foodName")} value={name} onChange={(e) => setName(e.target.value)} />
              <div className="flex flex-wrap gap-1.5">
                {MEALS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMeal(m)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${meal === m ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40" : "border-border text-muted-foreground"}`}
                  >
                    {t(`meal_${m}`)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <LabeledInput label={t("calories")} value={cal} onChange={setCal} />
                <LabeledInput label="P" value={pro} onChange={setPro} />
                <LabeledInput label="C" value={carb} onChange={setCarb} />
                <LabeledInput label="F" value={fat} onChange={setFat} />
              </div>
              <Button onClick={handleAdd} disabled={busy || !name.trim()} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("add")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Button className="w-full" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("addFood")}
          </Button>
        )}

        {/* Entries by meal */}
        {entries.length === 0 ? (
          <p className="rounded-lg bg-card/60 py-6 text-center text-sm text-muted-foreground">{t("noEntries")}</p>
        ) : (
          MEALS.filter((m) => entries.some((e) => e.meal === m)).map((m) => (
            <section key={m} className="space-y-1.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`meal_${m}`)}</h2>
              {entries.filter((e) => e.meal === m).map((e) => (
                <Card key={e.id}>
                  <CardContent className="flex items-center gap-3 py-2.5">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(e.calories ?? 0)} kcal · P{Math.round(e.proteinG ?? 0)} C{Math.round(e.carbsG ?? 0)} F{Math.round(e.fatG ?? 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => e.id && deleteNutritionEntry(e.id)}
                      className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </section>
          ))
        )}
      </div>
    </>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-[10px] text-muted-foreground">
      {label}
      <Input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 h-9" />
    </label>
  );
}
