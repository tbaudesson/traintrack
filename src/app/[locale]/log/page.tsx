"use client";

import { sessionHref } from "@/lib/routes";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLighterToday } from "@/hooks/useLighterToday";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useTrainablePrograms } from "@/hooks/usePrograms";
import { useExercises } from "@/hooks/useExercises";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useStartActions } from "@/hooks/useStartActions";
import { useSessionOfTheDay } from "@/hooks/useSessionOfTheDay";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";
import { MyPrograms } from "@/components/domain/MyPrograms";
import { SportPicker } from "@/components/domain/SportPicker";
import { GpxImport } from "@/components/domain/GpxImport";
import { SessionPickerDialog, useDayDetail } from "@/components/domain/SessionPickerDialog";
import { daysToOffer, findWorkoutProgramDay, nextDayIndex } from "@/lib/startWorkout";
import { formatDistance, isCardio } from "@/lib/cardio";
import { kindOf } from "@/lib/activityProfile";
import { useProgramTemplates } from "@/lib/templateService";
import { PROGRAM_TEMPLATES } from "@/lib/programTemplates";
import { localDate } from "@/lib/dates";
import {
  Activity, ArrowRight, Calendar, ClipboardList, Dumbbell, FileSpreadsheet, Footprints, ListChecks, Loader2, PersonStanding, Plus, RotateCcw, Timer, Upload,
} from "lucide-react";

/**
 * The training hub: three ways to train first (the planned session, a free
 * one, an endurance outing), then the rest (programs, exercises, timed
 * sessions, imports), one's programs in progress, and the history. Every way
 * to start a session the app had before is still here.
 */
export default function TrainPage() {
  const t = useTranslations("log");
  const th = useTranslations("home");
  const tc = useTranslations("cardio");
  const ti = useTranslations("intervals");
  const tmo = useTranslations("mobility");
  const tn = useTranslations("nav");
  const { day } = useFormat();
  const router = useRouter();
  const { user } = useAuth();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const programs = useTrainablePrograms();
  const exercises = useExercises();
  const profile = useAthleteProfile();
  const catalogue = useProgramTemplates();
  const prefs = useAppPrefs();
  const { hasFeature } = useFeatureAccess();
  const lighterToday = useLighterToday();
  const dayDetail = useDayDetail();
  const [sportOpen, setSportOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);

  const today = localDate();
  const actions = useStartActions({
    today,
    workouts,
    sets,
    exercises,
    profile,
    lighter: lighterToday.start,
    onStart: () => {
      setChoosing(false);
      setSportOpen(false);
    },
  });
  const { starting, repeatable, startDay, startFree, repeatLast, startCardio } = actions;
  const { session } = useSessionOfTheDay({ programs, workouts, today, profile, userId: user?.id, sport: prefs.sport, catalogue });
  const trainable = programs.filter((p) => (p.structure ?? []).length > 0);
  const templates = catalogue.filter((tpl) => !programs.some((p) => p.name === tpl.name));
  const runner = prefs.sport === "running" || prefs.sport2 === "running";

  function startPlanned() {
    if (session?.workoutId) router.push(sessionHref(session.workoutId));
    else if (session) startDay(session.program, session.index);
    else setChoosing(true);
  }

  const card = "t-surface flex min-w-0 flex-col gap-3 rounded-2xl p-4 ring-1 ring-foreground/5";
  const label = "text-xs font-semibold tracking-widest text-accent-text uppercase";

  return (
    <>
      <PageHeader title={t("hubTitle")} />
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24">
        {/* Three ways to train. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <section className="t-hero flex min-w-0 flex-col gap-3 rounded-3xl p-5" aria-labelledby="hub-planned">
            <p id="hub-planned" className={label}>{t("planned")}</p>
            {session ? (
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-2xl leading-tight font-bold tracking-tight break-words">{session.day.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {session.program.name} · {dayDetail(session.day)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("plannedNone")}</p>
            )}
            <div className="mt-auto space-y-2">
              <Button onClick={startPlanned} disabled={starting} className="w-full rounded-full">
                {starting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : session ? (
                  <>
                    {session.workoutId ? th("continue") : th("start")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                ) : (
                  th("chooseSession")
                )}
              </Button>
              {session && (
                <button
                  type="button"
                  onClick={() => setChoosing(true)}
                  className="flex min-h-11 w-full items-center justify-center gap-1.5 text-sm font-semibold text-accent-text"
                >
                  <ListChecks className="size-4" aria-hidden="true" />
                  {t("chooseOther")}
                </button>
              )}
            </div>
          </section>

          <section className={card} aria-labelledby="hub-free">
            <p id="hub-free" className={label}>{t("free")}</p>
            <p className="text-sm text-muted-foreground">{t("freeHint")}</p>
            <div className="mt-auto space-y-2">
              <Button className="w-full rounded-full" onClick={startFree} disabled={starting}>
                <Plus className="size-4" aria-hidden="true" />
                {t("newWorkout")}
              </Button>
              {repeatable && (
                <DetailRow
                  onClick={repeatLast}
                  disabled={starting}
                  icon={RotateCcw}
                  tone="neutral"
                  title={t("repeatLast")}
                  subtitle={`${repeatable.title || t("newWorkout")} · ${day(repeatable.date)}`}
                />
              )}
            </div>
          </section>

          <section className={card} aria-labelledby="hub-endurance">
            <p id="hub-endurance" className={label}>{t("endurance")}</p>
            <p className="text-sm text-muted-foreground">{t("enduranceHint")}</p>
            <div className="mt-auto space-y-2">
              <Button variant="outline" className="w-full rounded-full" onClick={() => setSportOpen(true)} disabled={starting}>
                <Activity className="size-4" aria-hidden="true" />
                {tc("newSession")}
              </Button>
              {hasFeature("running") && (
                <DetailRow href="/running" icon={Footprints} tone="neutral" title={th("runIntervals")} subtitle={th("runIntervalsHint")} />
              )}
              <GpxImport
                existing={workouts}
                onImported={({ workoutId }) => router.push(sessionHref(workoutId))}
                trigger={(open) => (
                  <Button variant="ghost" className="w-full text-accent-text" onClick={open} disabled={starting}>
                    <Upload className="size-4" aria-hidden="true" />
                    {tc("importGpx")}
                  </Button>
                )}
              />
            </div>
          </section>
        </div>

        {/* The rest, one tap away. */}
        <section className="space-y-2">
          <SectionHeading>{t("also")}</SectionHeading>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <DetailRow href="/programs" icon={ClipboardList} tone="neutral" title={tn("programs")} />
            <DetailRow href="/exercises" icon={Dumbbell} tone="neutral" title={tn("exercises")} />
            <DetailRow href="/intervals" icon={Timer} tone="neutral" title={ti("title")} subtitle={ti("hint")} />
            <DetailRow href="/mobility" icon={PersonStanding} tone="neutral" title={tmo("title")} subtitle={tmo("hint")} />
            {hasFeature("excel_import") && <DetailRow href="/programs" icon={FileSpreadsheet} tone="neutral" title={t("importProgram")} />}
          </div>
        </section>

        {/* The programs in progress. */}
        <MyPrograms
          programs={programs}
          workouts={workouts}
          catalogue={[...catalogue, ...PROGRAM_TEMPLATES]}
          today={today}
          favorite={prefs.sport}
          onContinue={(program) => {
            const running = workouts.find((w) => w.date === today && findWorkoutProgramDay([program], w));
            if (running?.id) router.push(sessionHref(running.id));
            else startDay(program, nextDayIndex(program, workouts, today));
          }}
        />

        {/* Every day of one's programs, as this page offered before. */}
        {trainable.length > 0 && (
          <details className="t-surface rounded-2xl px-4 py-1 ring-1 ring-foreground/5">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
              <Calendar className="size-4 text-accent-text" aria-hidden="true" />
              {t("allProgramDays")}
            </summary>
            <div className="space-y-2 pt-1 pb-3">
              {trainable.map((p) =>
                daysToOffer(p, workouts, today).map(({ day: d, index }) => (
                  <DetailRow
                    key={`${p.id}-${index}`}
                    onClick={() => startDay(p, index)}
                    disabled={starting}
                    icon={d.cardio ? Activity : Dumbbell}
                    title={`${p.name} — ${d.name}`}
                    subtitle={dayDetail(d)}
                  />
                ))
              )}
            </div>
          </details>
        )}

        {/* History */}
        <section className="space-y-2">
          <SectionHeading>{t("history")}</SectionHeading>
          {workouts.length === 0 ? (
            <EmptyState icon={Calendar} title={t("noWorkouts")} />
          ) : (
            workouts.map((w) => (
              <DetailRow
                key={w.id}
                onClick={() => router.push(sessionHref(w.id))}
                icon={Calendar}
                tone="neutral"
                title={w.title || t("title")}
                subtitle={
                  isCardio(w) && w.distanceM
                    ? `${day(w.date)} · ${formatDistance(w.distanceM, w.sport)}`
                    : w.kind === "interval" && w.durationMin
                      ? `${day(w.date)} · ${w.durationMin} min`
                      : day(w.date)
                }
              />
            ))
          )}
        </section>
      </div>

      <SportPicker open={sportOpen} onOpenChange={setSportOpen} onPick={startCardio} />
      <SessionPickerDialog
        open={choosing}
        onOpenChange={setChoosing}
        programs={trainable}
        templates={templates}
        workouts={workouts}
        today={today}
        actions={actions}
        activity={kindOf(prefs.sport) ?? "strength"}
        allSports={prefs.allSports}
        runner={runner}
        onEndurance={() => setSportOpen(true)}
      />
    </>
  );
}
