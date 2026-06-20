"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { saveAthleteProfile } from "@/hooks/useAthleteProfile";
import type { TrainingGoal, FitnessLevel, Sex, Equipment } from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const GOALS: TrainingGoal[] = ["strength", "hypertrophy", "endurance", "fat_loss", "general_fitness"];
const LEVELS: FitnessLevel[] = ["beginner", "intermediate", "advanced"];
const SEXES: Sex[] = ["male", "female", "other", "undisclosed"];
const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", "other"];

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();

  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [level, setLevel] = useState<FitnessLevel>("beginner");
  const [sex, setSex] = useState<Sex | undefined>(undefined);
  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [injuries, setInjuries] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  async function handleFinish() {
    if (!consent) return;
    setSaving(true);
    try {
      await saveAthleteProfile({
        goals,
        fitnessLevel: level,
        sex,
        heightCm: heightCm ? Number(heightCm) : undefined,
        birthDate: birthDate || undefined,
        injuries: injuries.trim() || undefined,
        equipment,
        consentHealthData: true,
        consentAt: new Date().toISOString(),
        userId: undefined,
        deletedAt: null,
      });
      router.replace("/");
    } finally {
      setSaving(false);
    }
  }

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm transition-colors",
      active
        ? "border-accent-500 bg-accent-50 font-medium text-accent-700 dark:bg-accent-950/40 dark:text-accent-300"
        : "border-border text-muted-foreground hover:bg-accent"
    );

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mx-auto max-w-lg space-y-5 p-4 pb-28">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>

        {/* Goals */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("goals")}</label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button key={g} onClick={() => toggle(goals, g, setGoals)} className={chip(goals.includes(g))}>
                {t(`goal_${g}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("fitnessLevel")}</label>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button key={l} onClick={() => setLevel(l)} className={chip(level === l)}>
                {t(`level_${l}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Sex */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("sex")}</label>
          <div className="flex flex-wrap gap-2">
            {SEXES.map((s) => (
              <button key={s} onClick={() => setSex(s)} className={chip(sex === s)}>
                {t(`sex_${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Height + birth date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("height")}</label>
            <Input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("birthDate")}</label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
        </div>

        {/* Injuries */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("injuries")}</label>
          <Input
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder={t("injuriesPlaceholder")}
          />
        </div>

        {/* Equipment */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("equipment")}</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => (
              <button key={e} onClick={() => toggle(equipment, e, setEquipment)} className={chip(equipment.includes(e))}>
                {t(`equip_${e}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Consent (Art. 9) */}
        <Card className="border-accent-200 dark:border-accent-900">
          <CardContent className="py-4">
            <button
              onClick={() => setConsent((c) => !c)}
              className="flex w-full items-start gap-3 text-left"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                  consent ? "border-accent-500 bg-accent-500 text-white" : "border-gray-400"
                )}
              >
                {consent && <Check className="h-3.5 w-3.5" />}
              </span>
              <span>
                <span className="block text-sm font-medium">{t("consentTitle")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{t("consentText")}</span>
              </span>
            </button>
          </CardContent>
        </Card>

        {!consent && <p className="text-xs text-muted-foreground">{t("consentRequired")}</p>}

        <Button className="w-full" disabled={!consent || saving} onClick={handleFinish}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("finish")}
        </Button>
      </div>
    </>
  );
}
