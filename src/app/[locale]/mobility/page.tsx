"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Play } from "lucide-react";
import type { MuscleGroup } from "@/db";
import { Link } from "@/i18n/navigation";
import { useWorkout } from "@/hooks/useWorkouts";
import { useWorkoutSets } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { useInjuries } from "@/hooks/useAthleteProfile";
import {
  MOBILITY_EXERCISES,
  MOBILITY_MINUTES,
  TARGET_MUSCLES,
  buildMobilitySession,
  mobilityWarning,
  sessionMuscles,
  type MobilityMode,
  type MobilityTarget,
} from "@/lib/mobility";
import { unlockAudio } from "@/lib/beep";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceField } from "@/components/ui/choice";
import { IntervalPlayer } from "@/components/domain/IntervalPlayer";

const FOCUS_MUSCLES: Record<string, MuscleGroup[]> = { full: ["full_body"], abs: ["core"], lower: ["legs", "core"] };

/** The mode and the workout from the link: "?mode=stretch&workout=12". */
function fromLink(): { mode: MobilityMode; workoutId?: number } {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("workout"));
    return { mode: params.get("mode") === "stretch" ? "stretch" : "warmup", workoutId: id > 0 ? id : undefined };
  } catch {
    return { mode: "warmup" };
  }
}

/**
 * Warm-up before a session, stretches after: moves for the muscles the
 * session works (read from it when it is given), played by the timer with a
 * cue for each. Nothing is saved: it is the start or the end of a session.
 */
export default function MobilityPage() {
  const t = useTranslations("mobility");
  const tinj = useTranslations("injuries");
  const tpain = useTranslations("pain");
  const locale = useLocale();
  const [link, setLink] = useState<{ mode: MobilityMode; workoutId?: number } | null>(null);
  const [mode, setMode] = useState<MobilityMode>("warmup");
  const [target, setTarget] = useState<MobilityTarget | "session">("full");
  const [minutes, setMinutes] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const read = fromLink();
    /* eslint-disable react-hooks/set-state-in-effect -- the link is read on the client only */
    setLink(read);
    setMode(read.mode);
    setMinutes(read.mode === "stretch" ? 10 : 5);
    if (read.workoutId) setTarget("session");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const workout = useWorkout(link?.workoutId);
  const sets = useWorkoutSets(link?.workoutId);
  const exercises = useExercises();

  // What the session works: its exercises, its timed plan, or the legs for a run.
  const fromSession = useMemo(() => {
    if (!workout) return [];
    if (workout.kind === "cardio") return ["legs", "core"] as MuscleGroup[];
    if (workout.kind === "interval" && workout.intervalPlan) return FOCUS_MUSCLES[workout.intervalPlan.focus] ?? ["full_body"];
    const groups = new Map(exercises.map((e) => [e.id, e.muscleGroup]));
    return sessionMuscles(sets.map((s) => groups.get(s.exerciseId)));
  }, [workout, sets, exercises]);

  const muscles = useMemo(
    () => (target === "session" ? (fromSession.length ? fromSession : TARGET_MUSCLES.full) : TARGET_MUSCLES[target]),
    [target, fromSession]
  );
  const injuries = useInjuries();
  const session = useMemo(() => buildMobilitySession(mode, minutes, muscles, locale, injuries), [mode, minutes, muscles, locale, injuries]);
  const leftOut = MOBILITY_EXERCISES.filter((e) => e.mode === mode && mobilityWarning(e.key, injuries)?.level === "avoid").length;
  const areaWords = (areas: string[]) => areas.map((a) => (locale === "de" ? tpain(`area_${a}`) : tpain(`area_${a}`).toLowerCase())).join(", ");
  const back = link?.workoutId ? `/log/${link.workoutId}` : "/";

  if (!link) return <PageHeader title={t("title")} showBack />;

  if (finished) {
    return (
      <>
        <PageHeader title={t(mode === "warmup" ? "warmupTitle" : "stretchTitle")} showBack />
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success-text" aria-hidden="true" />
          <p className="text-xl font-bold">{t(mode === "warmup" ? "warmupDone" : "stretchDone")}</p>
          <Link href={back}>
            <Button size="lg" className="rounded-full">{t(link.workoutId ? (mode === "warmup" ? "toSession" : "backToSession") : "home")}</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t(mode === "warmup" ? "warmupTitle" : "stretchTitle")} showBack />
      <div className="space-y-6 p-4 pb-28">
        <ChoiceField label={t("mode")}>
          {(["warmup", "stretch"] as const).map((m) => (
            <Choice
              key={m}
              on={mode === m}
              onClick={() => {
                setMode(m);
                setMinutes(m === "stretch" ? 10 : 5);
              }}
            >
              {t(`mode_${m}`)}
            </Choice>
          ))}
        </ChoiceField>
        <p className="-mt-3 text-xs text-muted-foreground">{t(`modeHint_${mode}`)}</p>

        <ChoiceField label={t("target")}>
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
        </ChoiceField>

        <ChoiceField label={t("duration")}>
          {MOBILITY_MINUTES[mode].map((m) => (
            <Choice key={m} on={minutes === m} onClick={() => setMinutes(m)}>
              {m} min
            </Choice>
          ))}
        </ChoiceField>

        <section className="space-y-2">
          <SectionHeading>{t("moves", { count: session.exercises.length })}</SectionHeading>
          {leftOut > 0 && (
            <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{t("leftOut", { count: leftOut })}</p>
          )}
          <ol className="t-surface space-y-2 rounded-2xl p-3 ring-1 ring-foreground/5">
            {session.exercises.map((e, n) => (
              <li key={e.key} className="flex gap-2 text-sm">
                <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{n + 1}</span>
                <span className="flex-1">
                  <span className="font-medium">{e.name[locale as "fr" | "de" | "en"] ?? e.name.en}</span>
                  {e.sides && <span className="text-xs text-muted-foreground"> · {t("bothSides")}</span>}
                  {mobilityWarning(e.key, injuries) && (
                    <span className="mt-0.5 block text-xs font-medium text-amber-700 dark:text-amber-300">
                      {tinj("caution", { areas: areaWords(mobilityWarning(e.key, injuries)!.areas) })}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <Button
          size="lg"
          className="h-14 w-full rounded-full text-base"
          onClick={() => {
            unlockAudio();
            setPlaying(true);
          }}
        >
          <Play className="mr-2 h-5 w-5" aria-hidden="true" />
          {t("start")}
        </Button>
      </div>

      {playing && (
        <IntervalPlayer
          session={session}
          labels={{ work: t(mode === "warmup" ? "work_warmup" : "work_stretch"), rest: t("transition") }}
          onEnd={({ done }) => {
            setPlaying(false);
            if (done.length > 0) setFinished(true);
          }}
        />
      )}
    </>
  );
}
