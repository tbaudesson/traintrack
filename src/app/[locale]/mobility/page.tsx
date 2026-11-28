"use client";

import { useTimedGuidance } from "@/hooks/useTimedGuidance";
import { usePainAreaName } from "@/hooks/useReferences";
import { useBoxingGuidance } from "@/hooks/useBoxingGuidance";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { unsortedIds, wholeBodyIds } from "@/lib/muscles";
import { BOXING_FOCUS } from "@/lib/intervals";
import { sessionHref } from "@/lib/routes";
import { useMobilityGuidance } from "@/hooks/useMobilityGuidance";
import { useMobilityRules } from "@/hooks/useInjuryRules";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createWorkout, useWorkout } from "@/hooks/useWorkouts";
import { localDate } from "@/lib/dates";
import { MobilityRating } from "@/components/domain/MobilityRating";
import { MobilityProgress } from "@/components/domain/MobilityProgress";
import { useWorkoutSets } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { useInjuries } from "@/hooks/useAthleteProfile";
import {
  buildMobilitySession,
  followsForm,
  MOBILITY_MODES,
  mobilityWarning,
  modesOf,
  sessionMuscles,
  type MobilityMode,
  type MobilityTarget,
} from "@/lib/mobility";
import { unlockAudio } from "@/lib/beep";
import { DemoButton, DemoDialog } from "@/components/domain/DemoDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceField } from "@/components/ui/choice";
import { IntervalPlayer } from "@/components/domain/IntervalPlayer";


/** The mode and the workout from the link: "?mode=stretch&workout=12". */
function fromLink(): { mode: MobilityMode; workoutId?: number; minutes?: number } {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("workout"));
    const asked = params.get("mode");
    // One's plan B asks for a length too; a length the references do not offer is set right after.
    const minutes = Number(params.get("minutes"));
    return { mode: MOBILITY_MODES.includes(asked as MobilityMode) ? (asked as MobilityMode) : "warmup", workoutId: id > 0 ? id : undefined, minutes: minutes > 0 ? minutes : undefined };
  } catch {
    return { mode: "warmup" };
  }
}

/**
 * Warm-up before a session, stretches after: moves for the muscles the
 * session works (read from it when it is given), played by the timer with a
 * cue for each. Once done it is kept (a workout of kind "mobility") with how
 * supple one felt, followed over time; it does not count as a training session.
 */
export default function MobilityPage() {
  const t = useTranslations("mobility");
  // The countdown before the first step; without the reference yet, none.
  const timed = useTimedGuidance();
  const boxing = useBoxingGuidance();
  const muscleGroups = useMuscleGroups();
  const readySec = timed?.getReadySec ?? 0;
  const tinj = useTranslations("injuries");
  const areaName = usePainAreaName();
  const locale = useLocale();
  const [link, setLink] = useState<{ mode: MobilityMode; workoutId?: number; minutes?: number } | null>(null);
  const [mode, setMode] = useState<MobilityMode>("warmup");
  const [target, setTarget] = useState<MobilityTarget | "session">("full");
  const [minutes, setMinutes] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  // The session kept once done: its id, to say how supple one feels.
  const [saved, setSaved] = useState<number | null>(null);
  const savedWorkout = useWorkout(saved ?? undefined);
  const [demo, setDemo] = useState<{ name: string; video: string | null; cue?: string } | null>(null);

  useEffect(() => {
    const read = fromLink();
    /* eslint-disable react-hooks/set-state-in-effect -- the link is read on the client only */
    setLink(read);
    setMode(read.mode);
    if (read.minutes) setMinutes(read.minutes);
    if (read.workoutId) setTarget("session");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const workout = useWorkout(link?.workoutId);
  const sets = useWorkoutSets(link?.workoutId);
  const exercises = useExercises();

  // What the session works: its exercises, its timed plan, or the legs for a run.
  const fromSession = useMemo(() => {
    if (!workout) return [];
    // An outing: the groups the admin marks as worked in endurance.
    if (workout.kind === "cardio") return (muscleGroups ?? []).filter((g) => g.endurance).map((g) => g.id);
    // A timed session: the groups of the exercises of its focus (the rounds' for boxing), else the whole body.
    if (workout.kind === "interval" && workout.intervalPlan) {
      const focus = workout.intervalPlan.focus;
      const worked = focus === BOXING_FOCUS ? (boxing?.combos ?? []).map((c) => c.muscleGroup) : (timed?.exercises ?? []).filter((e) => (e.focus as string[]).includes(focus)).map((e) => e.muscleGroup);
      const specific = sessionMuscles(worked, unsortedIds(muscleGroups));
      return specific.length ? specific : wholeBodyIds(muscleGroups);
    }
    const groups = new Map(exercises.map((e) => [e.id, e.muscleGroup]));
    return sessionMuscles(sets.map((s) => groups.get(s.exerciseId)), unsortedIds(muscleGroups));
  }, [workout, sets, exercises, muscleGroups, timed, boxing]);

  const mobility = useMobilityGuidance();
  /** The length offered first: the shortest for a warm-up (a session follows), the middle one otherwise. */
  const defaultMinutes = (m: MobilityMode) => {
    const list = mobility?.minutes[m] ?? [];
    return (m === "warmup" ? list[0] : list[Math.floor(list.length / 2)]) ?? 5;
  };
  // A length the reference does not offer for this mode (none read yet, or an
  // older copy kept on the device): the mode's usual one, once it is known.
  useEffect(() => {
    const list = mobility?.minutes[mode] ?? [];
    if (!list.length || list.includes(minutes)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the reference, read on the client
    setMinutes((mode === "warmup" ? list[0] : list[Math.floor(list.length / 2)]) ?? list[0]);
  }, [mobility, mode, minutes]);
  const muscles = useMemo(
    () => (target === "session" ? (fromSession.length ? fromSession : (mobility?.targets.full ?? [])) : (mobility?.targets[target] ?? [])),
    [target, fromSession, mobility]
  );
  const injuries = useInjuries();
  const mobilityRules = useMobilityRules();
  const session = useMemo(
    () => (mobility ? buildMobilitySession(mobility, mode, minutes, muscles, locale, injuries, mobilityRules, wholeBodyIds(muscleGroups)) : { exercises: [], steps: [], totalSec: 0 }),
    [mobility, mode, minutes, muscles, locale, injuries, mobilityRules, muscleGroups]
  );
  const leftOut = (mobility?.moves ?? []).filter((e) => e.mode === mode && mobilityWarning(mobilityRules, e.key, injuries)?.level === "avoid").length;
  const areaWords = (areas: string[]) => areas.map((a) => (locale === "de" ? areaName(a) : areaName(a).toLowerCase())).join(", ");
  const back = link?.workoutId ? sessionHref(link.workoutId) : "/";

  if (!link) return <PageHeader title={t("title")} showBack />;

  if (finished) {
    return (
      <>
        <PageHeader title={t(`${mode}Title`)} showBack />
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success-text" aria-hidden="true" />
          <p className="text-xl font-bold">{t(`${mode}Done`)}</p>
          {saved && savedWorkout?.mobility && (
            <div className="w-full max-w-sm text-left">
              <MobilityRating workoutId={saved} log={savedWorkout.mobility} />
            </div>
          )}
          <Link href={back}>
            <Button size="lg" className="rounded-full">{t(link.workoutId ? (mode === "warmup" ? "toSession" : "backToSession") : "home")}</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t(`${mode}Title`)} showBack />
      <div className="space-y-6 p-4 pb-28">
        <ChoiceField label={t("mode")}>
          {(mobility ? modesOf(mobility) : (["warmup", "stretch"] as const)).map((m) => (
            <Choice
              key={m}
              on={mode === m}
              onClick={() => {
                setMode(m);
                setMinutes(defaultMinutes(m));
              }}
            >
              {t(`mode_${m}`)}
            </Choice>
          ))}
        </ChoiceField>
        <p className="-mt-3 text-xs text-muted-foreground">{t(`modeHint_${mode}`)}</p>

        {/* A form is followed in its order: no muscles to aim at. */}
        {!followsForm(mode) && <ChoiceField label={t("target")}>
          {link.workoutId && (
            <Choice on={target === "session"} onClick={() => setTarget("session")}>
              {t("target_session")}
            </Choice>
          )}
          {(["full", "upper", "lower"] as const).map((m) => (
            <Choice key={m} on={target === m} onClick={() => setTarget(m)}>
              {t(`target_${m}`)}
            </Choice>
          ))}
        </ChoiceField>}

        <ChoiceField label={t("duration")}>
          {(mobility?.minutes[mode] ?? []).map((m) => (
            <Choice key={m} on={minutes === m} onClick={() => setMinutes(m)}>
              {m} min
            </Choice>
          ))}
        </ChoiceField>

        <section className="space-y-2">
          <SectionHeading>{t("moves", { count: session.exercises.length })}</SectionHeading>
          {!mobility && <p role="status" className="text-sm text-muted-foreground">{t("notLoaded")}</p>}
          {leftOut > 0 && (
            <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{t("leftOut", { count: leftOut })}</p>
          )}
          <ol className="t-surface space-y-2 rounded-2xl p-3 ring-1 ring-foreground/5">
            {session.exercises.map((e, n) => (
              <li key={e.key} className="flex items-start gap-2 text-sm">
                <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{n + 1}</span>
                <span className="flex-1">
                  <span className="font-medium">{e.name[locale as "fr" | "de" | "en"] ?? e.name.en}</span>
                  {e.sides && <span className="text-xs text-muted-foreground"> · {t("bothSides")}</span>}
                  {mobilityWarning(mobilityRules, e.key, injuries) && (
                    <span className="mt-0.5 block text-xs font-medium text-amber-700 dark:text-amber-300">
                      {tinj("caution", { areas: areaWords(mobilityWarning(mobilityRules, e.key, injuries)!.areas) })}
                    </span>
                  )}
                </span>
                {e.video && (
                  <DemoButton
                    onClick={() => setDemo({ name: e.name[locale as "fr" | "de" | "en"] ?? e.name.en, video: e.video ?? null, cue: e.cue[locale as "fr" | "de" | "en"] ?? e.cue.en })}
                  />
                )}
              </li>
            ))}
          </ol>
        </section>

        <Button
          size="lg"
          className="h-14 w-full rounded-full text-base"
          onClick={() => {
            unlockAudio({ voice: true });
            setPlaying(true);
          }}
        >
          <Play className="mr-2 h-5 w-5" aria-hidden="true" />
          {t("start")}
        </Button>
        {/* One's follow-up, under the session to start. */}
        <MobilityProgress />
      </div>

      <DemoDialog demo={demo} onClose={() => setDemo(null)} />

      {playing && (
        <IntervalPlayer
          session={session}
          getReadySec={readySec}
          labels={{ work: t(`work_${mode}`), rest: t("transition") }}
          onEnd={async ({ done, elapsedSec }) => {
            setPlaying(false);
            if (done.length === 0) return;
            const moves = [...new Set(done.map((i) => session.steps[i]).flatMap((step) => (step?.type === "work" ? [step.exercise.key] : [])))];
            const id = await createWorkout({
              date: localDate(),
              title: t(`${mode}Title`),
              kind: "mobility",
              durationSec: Math.max(1, Math.round(elapsedSec)),
              mobility: { mode, minutes, target, moves },
            });
            setSaved(id);
            setFinished(true);
          }}
        />
      )}
    </>
  );
}
