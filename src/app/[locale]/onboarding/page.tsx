"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { saveAthleteProfile } from "@/hooks/useAthleteProfile";
import { createProgram } from "@/hooks/usePrograms";
import { useProgramTemplates } from "@/lib/templateService";
import { defaultTrainingDays, recommendPrograms } from "@/lib/onboarding";
import { nextMonday } from "@/lib/programWeek";
import { localDate } from "@/lib/dates";
import type { TrainingGoal, FitnessLevel, Sex, Equipment } from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Check, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const GOALS: TrainingGoal[] = ["strength", "hypertrophy", "endurance", "fat_loss", "general_fitness"];
const LEVELS: FitnessLevel[] = ["beginner", "intermediate", "advanced"];
const SEXES: Sex[] = ["male", "female", "other", "undisclosed"];
const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", "other"];
const GYM_SET: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight"];
const HOME_SET: Equipment[] = ["dumbbell", "bodyweight", "bands"];
const STEPS = 5;

const weekday = (locale: string, day: number) =>
  new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));

/**
 * Sign-up in five short steps: goal and level, the athlete, their equipment,
 * a ready-made program suggested from all that, and their week. It ends with
 * the profile, the week plan and the program dated, so the home screen is
 * ready on the first visit.
 */
export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tw = useTranslations("wizard");
  const tl = useTranslations("templates");
  const locale = useLocale();
  const router = useRouter();
  const catalogue = useProgramTemplates();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [level, setLevel] = useState<FitnessLevel>("beginner");
  const [sex, setSex] = useState<Sex | undefined>(undefined);
  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [injuries, setInjuries] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [programId, setProgramId] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [time, setTime] = useState("18:00");
  const [start, setStart] = useState(() => nextMonday(localDate()));
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const picks = useMemo(
    () => (goal ? recommendPrograms({ goal, level, equipment }, catalogue) : []),
    [goal, level, equipment, catalogue]
  );
  const chosen = picks.find((p) => p.id === programId);

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  function choose(id: string | null) {
    setProgramId(id);
    const program = picks.find((p) => p.id === id);
    if (program) setDays(defaultTrainingDays(program.daysPerWeek));
  }

  async function finish() {
    if (!consent || !goal) return;
    setSaving(true);
    try {
      await saveAthleteProfile({
        goals: [goal],
        fitnessLevel: level,
        sex,
        heightCm: heightCm ? Number(heightCm) : undefined,
        birthDate: birthDate || undefined,
        injuries: injuries.trim() || undefined,
        equipment,
        trainingDays: [...days].sort(),
        trainingTime: time,
        consentHealthData: true,
        consentAt: new Date().toISOString(),
        userId: undefined,
        deletedAt: null,
      });
      if (chosen) {
        await createProgram({ name: chosen.name, description: chosen.description, structure: chosen.structure, startDate: start });
      }
      router.replace("/");
    } finally {
      setSaving(false);
    }
  }

  const chip = (active: boolean) =>
    cn(
      "min-h-10 rounded-full border px-3 py-1.5 text-sm transition-colors",
      active
        ? "border-accent-500 bg-accent-50 font-medium text-accent-700 dark:bg-accent-950/40 dark:text-accent-300"
        : "border-border text-muted-foreground hover:bg-accent"
    );
  const canNext = step === 0 ? goal !== null : step === 4 ? consent && days.length > 0 : true;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mx-auto max-w-lg space-y-5 p-4 pb-28">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest text-accent-text uppercase">
            {tw("step", { step: step + 1, total: STEPS })}
          </p>
          <div className="flex gap-1.5">
            {Array.from({ length: STEPS }, (_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-accent-500" : "bg-muted")} />
            ))}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{tw(`title${step}`)}</h2>
          <p className="text-sm text-muted-foreground">{tw(`hint${step}`)}</p>
        </div>

        {step === 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button key={g} onClick={() => setGoal(g)} aria-pressed={goal === g} className={chip(goal === g)}>
                  {t(`goal_${g}`)}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("fitnessLevel")}</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button key={l} onClick={() => setLevel(l)} aria-pressed={level === l} className={chip(level === l)}>
                    {t(`level_${l}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("sex")}</p>
              <div className="flex flex-wrap gap-2">
                {SEXES.map((s) => (
                  <button key={s} onClick={() => setSex(s)} aria-pressed={sex === s} className={chip(sex === s)}>
                    {t(`sex_${s}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-medium">
                {t("height")}
                <Input type="number" inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("birthDate")}
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium">
              {t("injuries")}
              <Input value={injuries} onChange={(e) => setInjuries(e.target.value)} placeholder={t("injuriesPlaceholder")} />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setEquipment(GYM_SET)}>{tw("gym")}</Button>
              <Button variant="outline" onClick={() => setEquipment(HOME_SET)}>{tw("home")}</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((e) => (
                <button key={e} onClick={() => toggle(equipment, e, setEquipment)} aria-pressed={equipment.includes(e)} className={chip(equipment.includes(e))}>
                  {t(`equip_${e}`)}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <div className="space-y-2">
            {picks.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => choose(p.id)}
                aria-pressed={programId === p.id}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-colors",
                  programId === p.id ? "border-accent-500 bg-accent-50 dark:bg-accent-950/40" : "border-border"
                )}
              >
                <p className="flex items-center gap-2 font-semibold">
                  {i === 0 && <Sparkles className="h-4 w-4 text-accent-text" aria-hidden="true" />}
                  {p.name}
                  {programId === p.id && <Check className="ml-auto h-5 w-5 text-accent-text" aria-hidden="true" />}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tl(`goal_${p.goal}`)} · {tl(`level_${p.level}`)} · {tw("perWeek", { count: p.daysPerWeek })}
                  {i === 0 && ` · ${tw("best")}`}
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => choose(null)}
              aria-pressed={programId === null}
              className={cn("w-full rounded-2xl border p-3 text-sm", programId === null ? "border-accent-500 font-medium" : "border-border text-muted-foreground")}
            >
              {tw("later")}
            </button>
          </div>
        )}

        {step === 4 && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">{tw("days")}</p>
              <div className="grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggle(days, d, setDays)}
                    aria-pressed={days.includes(d)}
                    className={cn(
                      "min-h-11 rounded-lg border text-sm font-semibold",
                      days.includes(d) ? "border-accent-500 bg-accent-500 text-white" : "border-border text-muted-foreground"
                    )}
                  >
                    {weekday(locale, d)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm font-medium">
                {tw("time")}
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
              {chosen && (
                <label className="space-y-1 text-sm font-medium">
                  {tw("start")}
                  <Input type="date" value={start} min={localDate()} onChange={(e) => setStart(e.target.value)} />
                </label>
              )}
            </div>

            <Card className="border-accent-200 dark:border-accent-900">
              <CardContent className="py-4">
                <button onClick={() => setConsent((c) => !c)} className="flex w-full items-start gap-3 text-left">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      consent ? "border-accent-500 bg-accent-500 text-white" : "border-muted-foreground"
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
          </>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving}>
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              {tw("back")}
            </Button>
          )}
          {step < STEPS - 1 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)} disabled={!canNext}>
              {step === 1 || step === 2 ? tw("nextOrSkip") : tw("next")}
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={finish} disabled={!canNext || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("finish")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
