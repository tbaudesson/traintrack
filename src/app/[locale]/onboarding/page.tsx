"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { saveAthleteProfile } from "@/hooks/useAthleteProfile";
import { createProgram } from "@/hooks/usePrograms";
import { useProgramTemplates } from "@/lib/templateService";
import { defaultTrainingDays, GOAL_OF_SPORT, recommendPrograms } from "@/lib/onboarding";
import { FAVORITE_SPORTS, savePrefs, type FavoriteSport } from "@/lib/appTheme";
import { INJURY_AREAS } from "@/lib/injuries";
import type { PainArea } from "@/lib/pain";
import { CategoryIcon } from "@/components/domain/ProgramCatalog";
import { forgetJoined, joinedTeam } from "@/lib/inviteService";
import { nextMonday } from "@/lib/programWeek";
import { localDate } from "@/lib/dates";
import type { TrainingGoal, FitnessLevel, Sex, Equipment } from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Check, ArrowLeft, ArrowRight, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const GOALS: TrainingGoal[] = ["strength", "hypertrophy", "endurance", "fat_loss", "general_fitness"];
const LEVELS: FitnessLevel[] = ["beginner", "intermediate", "advanced"];
const SEXES: Sex[] = ["male", "female", "other", "undisclosed"];
const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", "other"];
const GYM_SET: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight"];
const HOME_SET: Equipment[] = ["dumbbell", "bodyweight", "bands"];
const STEPS = 4;

const weekday = (locale: string, day: number) =>
  new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));

/**
 * Sign-up in four short steps: sport and goal; level and injuries (the rest
 * optional); equipment; a ready-made program of that sport and its week. It
 * ends with the profile, the sport, and the program in the planning on its
 * days, so the home screen is ready on the first visit.
 */
export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tw = useTranslations("wizard");
  const tl = useTranslations("templates");
  const tcat = useTranslations("catalog");
  const tpain = useTranslations("pain");
  const locale = useLocale();
  const router = useRouter();
  const catalogue = useProgramTemplates();

  // Joined through a coach's link: the coach's program replaces the suggestions.
  const [joined] = useState(joinedTeam);
  const fromCoach = !!joined?.programName;
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<FavoriteSport | null>(null);
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [areas, setAreas] = useState<PainArea[]>([]);
  const [more, setMore] = useState(false);
  const [level, setLevel] = useState<FitnessLevel>("beginner");
  const [sex, setSex] = useState<Sex | undefined>(undefined);
  const [heightCm, setHeightCm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [injuries, setInjuries] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [programId, setProgramId] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>(() => (joined?.weekdays?.length ? [...joined.weekdays].sort() : [1, 3, 5]));
  const [time, setTime] = useState("18:00");
  const [start, setStart] = useState(() => nextMonday(localDate()));
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const picks = useMemo(
    () => (goal ? recommendPrograms({ goal, level, equipment, sport }, catalogue) : []),
    [goal, level, equipment, sport, catalogue]
  );
  const chosen = picks.find((p) => p.id === programId);

  function toggle<T>(arr: T[], v: T, set: (x: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  /** A sport suggests its usual goal, which the athlete can change. */
  function pickSport(next: FavoriteSport) {
    setSport(next);
    setGoal(GOAL_OF_SPORT[next]);
    setProgramId(null);
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
        injuryAreas: areas.length ? areas.map((area) => ({ area, since: localDate() })) : null,
        equipment,
        trainingDays: [...days].sort(),
        trainingTime: time,
        consentHealthData: true,
        consentAt: new Date().toISOString(),
        userId: undefined,
        deletedAt: null,
      });
      if (sport) savePrefs({ sport });
      // The program goes into the planning, on the days chosen.
      forgetJoined();
      if (chosen && !fromCoach) {
        await createProgram({ name: chosen.name, description: chosen.description, structure: chosen.structure, startDate: start, weekdays: [...days].sort() });
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
  const canNext = step === 0 ? goal !== null : step === 3 ? consent && days.length > 0 : true;

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
            <div className="grid grid-cols-2 gap-2">
              {FAVORITE_SPORTS.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => pickSport(sp)}
                  aria-pressed={sport === sp}
                  className={cn(
                    "flex min-h-14 items-center gap-2.5 rounded-2xl border p-2.5 text-left text-sm font-medium transition-colors",
                    sport === sp ? "border-accent-500 bg-accent-50 dark:bg-accent-950/40" : "border-border"
                  )}
                >
                  <CategoryIcon category={sp} />
                  {tcat(`cat_${sp}`)}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{tw("goal")}</p>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <button key={g} onClick={() => setGoal(g)} aria-pressed={goal === g} className={chip(goal === g)}>
                    {t(`goal_${g}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
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
            <div className="space-y-2">
              <p className="text-sm font-medium">{tw("injuries")}</p>
              <p className="text-xs text-muted-foreground">{tw("injuriesHint")}</p>
              <div className="flex flex-wrap gap-2">
                {INJURY_AREAS.map((a) => (
                  <button key={a} onClick={() => toggle(areas, a, setAreas)} aria-pressed={areas.includes(a)} className={chip(areas.includes(a))}>
                    {tpain(`area_${a}`)}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="flex min-h-10 items-center gap-1 text-sm font-medium text-accent-text"
            >
              {tw("aboutMore")}
              <ChevronDown className={cn("h-4 w-4 transition-transform", more && "rotate-180")} aria-hidden="true" />
            </button>
            {more && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("sex")}</p>
                  <div className="flex flex-wrap gap-2">
                    {SEXES.map((x) => (
                      <button key={x} onClick={() => setSex(x)} aria-pressed={sex === x} className={chip(sex === x)}>
                        {t(`sex_${x}`)}
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
              </div>
            )}
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
          <>
          {fromCoach ? (
            <div className="t-surface space-y-1 rounded-2xl p-4 ring-1 ring-accent-500/40">
              <p className="text-sm text-muted-foreground">{tw("fromCoach", { coach: joined!.coachName ?? joined!.teamName })}</p>
              <p className="font-semibold">{joined!.programName}</p>
              {joined!.startDate && <p className="text-sm text-muted-foreground">{tw("fromCoachStart", { date: new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${joined!.startDate}T00:00:00Z`)) })}</p>}
              <p className="text-xs text-muted-foreground">{tw("fromCoachDays")}</p>
            </div>
          ) : (
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
              {chosen && !fromCoach && (
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
              {step === 2 ? tw("nextOrSkip") : tw("next")}
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
