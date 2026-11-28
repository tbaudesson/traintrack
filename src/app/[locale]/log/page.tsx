"use client";

import { sessionHref } from "@/lib/routes";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLighterToday } from "@/hooks/useLighterToday";
import { useWorkoutsRead } from "@/hooks/useWorkouts";
import { trainableOf, useProgramsRead } from "@/hooks/usePrograms";
import { useExercises } from "@/hooks/useExercises";
import { useAthleteProfile, useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useStartActions } from "@/hooks/useStartActions";
import { useSessionOfTheDay } from "@/hooks/useSessionOfTheDay";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";
import { MyPrograms } from "@/components/domain/MyPrograms";
import { SportPicker } from "@/components/domain/SportPicker";
import { GpxImport } from "@/components/domain/GpxImport";
import { SessionPickerDialog, useDayDetail } from "@/components/domain/SessionPickerDialog";
import { daysToOffer, findWorkoutProgramDay, nextDayIndex } from "@/lib/startWorkout";
import { kindOf } from "@/lib/activityProfile";
import { useProgramTemplates, useTemplateCatalogue } from "@/lib/templateService";
import { localDate } from "@/lib/dates";
import {
  Activity, ArrowRight, Calendar, ClipboardList, Dumbbell, FileSpreadsheet, Footprints, History, ListChecks, Loader2, PersonStanding, Plus, RotateCcw, Timer, Upload,
} from "lucide-react";

/**
 * The training hub: three ways to train first (the planned session, a free
 * one, an endurance outing), then the rest (programs, exercises, timed
 * sessions, imports, the history on its own page), one's programs in
 * progress. Every way to start a session the app had before is still here.
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
  const workoutsRead = useWorkoutsRead();
  const workouts = useMemo(() => workoutsRead ?? [], [workoutsRead]);
  const sets = useAllWorkoutSets();
  const programsRead = useProgramsRead();
  const programs = useMemo(() => trainableOf(programsRead ?? []), [programsRead]);
  const exercises = useExercises();
  const profile = useAthleteProfile();
  // Until the sessions, the programs and the planning are read, today's session is not known:
  // the main button waits, so it never shows "Choose" and then opens a session under the finger.
  const profileRead = useAthleteProfileOrNull();
  const ready = workoutsRead !== undefined && programsRead !== undefined && profileRead !== undefined;
  const catalogue = useProgramTemplates();
  // Every language's, to know a program by its name.
  const allTemplates = useTemplateCatalogue();
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

  // Today's session, finished: viewed, no longer swapped for another.
  const sessionFinished = !!session?.workoutId && !!workouts.find((w) => w.id === session.workoutId)?.finishedAt;

  function startPlanned() {
    if (session?.workoutId) router.push(sessionHref(session.workoutId));
    else if (session) startDay(session.program, session.index);
    else setChoosing(true);
  }

  const card = "t-action-card t-panel flex min-w-0 flex-col gap-4 rounded-2xl p-5";
  const label = "t-kicker";

  return (
    <>
      <PageHeader title={t("hubTitle")} />
      <div className="mx-auto max-w-5xl space-y-8 p-4 pb-24 md:px-6 md:pt-7">
        {/* Three ways to train. */}
        <div className="t-command-grid grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <section className="t-hero t-action-card t-action-card-primary flex min-w-0 flex-col gap-4 rounded-2xl p-5 md:min-h-80 md:p-6" aria-labelledby="hub-planned">
            <Dumbbell className="t-action-decoration pointer-events-none absolute -right-4 top-10 size-32 -rotate-12 text-white/[0.045]" aria-hidden="true" />
            <p id="hub-planned" className={label}>{t("planned")}</p>
            {session ? (
              <div className="min-w-0">
                <h2 className="t-display mt-2 line-clamp-3 text-3xl break-words">{session.day.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {session.program.name} · {dayDetail(session.day)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("plannedNone")}</p>
            )}
            <div className="mt-auto space-y-2">
              <Button onClick={startPlanned} disabled={starting || !ready} aria-busy={!ready} className="w-full">
                {starting || !ready ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : session ? (
                  <>
                    {session.workoutId ? (sessionFinished ? th("viewSession") : th("continue")) : th("start")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                ) : (
                  th("chooseSession")
                )}
              </Button>
              {session && !sessionFinished && (
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
              <Button className="w-full" onClick={startFree} disabled={starting}>
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
              <Button variant="outline" className="w-full" onClick={() => setSportOpen(true)} disabled={starting}>
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DetailRow href="/programs" icon={ClipboardList} tone="neutral" title={tn("programs")} />
            <DetailRow href="/exercises" icon={Dumbbell} tone="neutral" title={tn("exercises")} />
            <DetailRow href="/intervals" icon={Timer} tone="neutral" title={ti("title")} subtitle={ti("hint")} />
            <DetailRow href="/mobility" icon={PersonStanding} tone="neutral" title={tmo("title")} subtitle={tmo("hint")} />
            <DetailRow href="/history" icon={History} tone="neutral" title={t("history")} subtitle={t("historyHint")} />
            {hasFeature("excel_import") && <DetailRow href="/programs" icon={FileSpreadsheet} tone="neutral" title={t("importProgram")} />}
          </div>
        </section>

        {/* The programs in progress. */}
        <MyPrograms
          programs={programs}
          workouts={workouts}
          catalogue={allTemplates}
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
          <details className="t-panel rounded-xl px-4 py-1">
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
        favorite={prefs.sport}
      />
    </>
  );
}
