"use client";

import { sessionHref } from "@/lib/routes";
import { useInjuryRules } from "@/hooks/useInjuryRules";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Play, Shuffle, Timer } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useExercises, createCustomExercise } from "@/hooks/useExercises";
import { createWorkout, updateWorkout } from "@/hooks/useWorkouts";
import { addWorkoutSet } from "@/hooks/useWorkoutSets";
import {
  injuryPool,
  roundsDone,
  INTERVAL_FOCUSES,
  BOXING_FOCUS,
  PLAN_FOCUSES,
  buildIntervalSession,
  defaultPattern,
  patternSeconds,
  type IntervalFocus,
  type IntervalExercise,
  type IntervalPattern,
  type IntervalPlan,
  type TimedGuidance,
} from "@/lib/intervals";
import { useTimedGuidance } from "@/hooks/useTimedGuidance";
import { useBoxingGuidance } from "@/hooks/useBoxingGuidance";
import { boxingFormat, boxingPool, buildBoxingSession, roundLength, type BoxingGuidance } from "@/lib/boxing";
import { useHeartRateMonitor } from "@/hooks/useHeartRateMonitor";
import { HeartRateCard } from "@/components/domain/HeartRateCard";
import { localDate } from "@/lib/dates";
import { unlockAudio } from "@/lib/beep";
import { exerciseDescription, useExerciseLabel } from "@/lib/exerciseNames";
import { demoVideo } from "@/lib/demoVideos";
import { DemoButton, DemoDialog } from "@/components/domain/DemoDialog";
import { PageHeader, replacingPage } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { Choice, ChoiceField } from "@/components/ui/choice";
import { IntervalPlayer, type IntervalResult } from "@/components/domain/IntervalPlayer";
import { clearTimedProgress, loadTimedProgress, saveTimedProgress, type TimedResume } from "@/lib/timedResume";
import { InjuryBadge } from "@/components/domain/InjuryBadge";

const SAVED = "traintrack-interval-plan";
const newSeed = () => Math.floor(Math.random() * 1_000_000) + 1;

/** A plan from the link ("Do it again") or the last one chosen, if any. */
function initialPlan(): Partial<IntervalPlan> {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("focus")) {
      return {
        focus: params.get("focus") as IntervalFocus,
        dumbbells: params.get("dumbbells") === "1",
        trx: params.get("trx") === "1",
        pattern: params.get("pattern") as IntervalPattern,
        minutes: Number(params.get("minutes")),
        seed: Number(params.get("seed")) || undefined,
      };
    }
    return JSON.parse(localStorage.getItem(SAVED) ?? "{}");
  } catch {
    return {};
  }
}

const middle = (list: number[]) => list[Math.floor(list.length / 2)];
/** How long a link asking for boxing waits for the rounds' reference before falling back to a circuit. */
const BOXING_WAIT_MS = 3000;

/**
 * A plan read from a link or storage, kept to the values the app knows:
 * boxing rounds when their reference is there, with its formats and lengths;
 * otherwise a circuit, with the circuits' rhythms and lengths.
 */
function sane(p: Partial<IntervalPlan>, fallback: IntervalPlan, g: TimedGuidance, box: BoxingGuidance | null, level?: string): IntervalPlan {
  const base = {
    dumbbells: typeof p.dumbbells === "boolean" ? p.dumbbells : fallback.dumbbells,
    trx: typeof p.trx === "boolean" ? p.trx : fallback.trx,
    seed: p.seed && p.seed > 0 ? p.seed : fallback.seed,
  };
  if (p.focus === BOXING_FOCUS && box)
    return {
      ...base,
      focus: BOXING_FOCUS,
      pattern: box.formats.includes(p.pattern as IntervalPattern) ? p.pattern! : boxingFormat(box, level),
      minutes: box.minutes.includes(p.minutes ?? 0) ? p.minutes! : middle(box.minutes),
    };
  return {
    ...base,
    focus: INTERVAL_FOCUSES.includes(p.focus as IntervalFocus) ? (p.focus as IntervalFocus) : fallback.focus === BOXING_FOCUS ? "full" : fallback.focus,
    pattern: g.patterns.includes(p.pattern as IntervalPattern) ? p.pattern! : g.patterns.includes(fallback.pattern) ? fallback.pattern : defaultPattern(g, level),
    minutes: g.minutes.includes(p.minutes ?? 0) ? p.minutes! : g.minutes.includes(fallback.minutes) ? fallback.minutes : middle(g.minutes),
  };
}

/**
 * Timed bodyweight sessions: the athlete picks the area, the equipment, the
 * rhythm and the length, sees the session, then follows it full screen. What
 * was done is saved as a workout, with one set per interval.
 */
export default function IntervalsPage() {
  const t = useTranslations("intervals");
  const tinj = useTranslations("injuries");
  const xl = useExerciseLabel();
  const locale = useLocale();
  const router = useRouter();
  const athlete = useAthleteProfileOrNull();
  const exercises = useExercises();
  const timed = useTimedGuidance();
  const boxing = useBoxingGuidance();
  const hr = useHeartRateMonitor();
  const [plan, setPlan] = useState<IntervalPlan | null>(null);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  // A session left half-way, found on opening; and the one taken up again, if any.
  const [left, setLeft] = useState<TimedResume<IntervalPlan> | null>(null);
  const [resume, setResume] = useState<{ index: number; done: number[]; elapsedSec: number } | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device's storage, only on the client
    setLeft(loadTimedProgress<IntervalPlan>("intervals"));
  }, []);

  // A link asking for boxing waits for the rounds' reference, a few seconds at
  // most (first visit, read from the network): without it, a circuit.
  const [boxingWaitOver, setBoxingWaitOver] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setBoxingWaitOver(true), BOXING_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  // Once the profile is read: the link, else the last plan, else the level's.
  useEffect(() => {
    if (plan || athlete === undefined || !timed) return;
    const wanted = initialPlan();
    if (wanted.focus === BOXING_FOCUS && !boxing && !boxingWaitOver) return;
    const fallback: IntervalPlan = {
      focus: "full",
      dumbbells: !!athlete?.equipment?.includes("dumbbell"),
      trx: !!athlete?.equipment?.includes("suspension"),
      pattern: defaultPattern(timed, athlete?.fitnessLevel),
      // The length in the middle of those offered.
      minutes: timed.minutes[Math.floor(timed.minutes.length / 2)],
      seed: newSeed(),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL and storage, only on the client
    setPlan(sane(wanted, fallback, timed, boxing, athlete?.fitnessLevel));
  }, [athlete, plan, timed, boxing, boxingWaitOver]);

  // An injury leaves out the exercises that load the injured area most.
  const injuries = useMemo(() => athlete?.injuryAreas ?? [], [athlete]);
  const injuryRules = useInjuryRules();
  // A circuit or boxing rounds, each from its own reference and with its own pool.
  const isBoxing = plan?.focus === BOXING_FOCUS;
  const { leftOut, cautious } = useMemo(() => {
    if (plan?.focus === BOXING_FOCUS) return boxing ? boxingPool(boxing, injuries, injuryRules) : { leftOut: 0, cautious: [] as string[] };
    return plan && timed ? injuryPool(timed, plan, injuries, injuryRules) : { leftOut: 0, cautious: [] as string[] };
  }, [plan, timed, boxing, injuries, injuryRules]);
  const build = useCallback(
    (p: IntervalPlan) => {
      if (p.focus === BOXING_FOCUS) return boxing ? buildBoxingSession(boxing, p, boxingPool(boxing, injuries, injuryRules).pool) : null;
      return timed ? buildIntervalSession(timed, p, injuryPool(timed, p, injuries, injuryRules).pool) : null;
    },
    [timed, boxing, injuries, injuryRules]
  );
  const session = useMemo(() => (plan ? build(plan) : null), [plan, build]);

  // Each exercise with its demo: the video, and the cue in the app's language.
  const [demo, setDemo] = useState<{ name: string; video: string | null; cue?: string } | null>(null);
  const demoOf = useCallback(
    (e: IntervalExercise) => {
      const row = exercises.find((x) => !x.isCustom && x.name === e.name);
      return { video: demoVideo(row?.videoUrl), cue: exerciseDescription(row ?? { name: e.name }, locale) };
    },
    [exercises, locale]
  );
  const withDemos = useMemo(
    () => session && { steps: session.steps.map((s) => (s.type === "work" ? { ...s, exercise: { ...s.exercise, demo: demoOf(s.exercise) } } : s)) },
    [session, demoOf]
  );

  function change(next: Partial<IntervalPlan>) {
    if (!plan) return;
    const updated = { ...plan, ...next, seed: next.seed ?? newSeed() } as IntervalPlan;
    setPlan(updated);
    try {
      localStorage.setItem(SAVED, JSON.stringify({ ...updated, seed: undefined }));
    } catch {
      // Private window: the choice is not remembered, that is all.
    }
  }

  async function save({ done, elapsedSec }: IntervalResult) {
    setPlaying(false);
    // The belt stops with the session; its average and maximum go with it.
    const heart = await hr.finish();
    // Over, saved or not: nothing left to take up.
    clearTimedProgress("intervals");
    setResume(undefined);
    if (!plan || !session || done.length === 0) return;
    setSaving(true);
    const { rest } = patternSeconds(plan.pattern);
    const id = await createWorkout({
      date: localDate(),
      title: t("workoutTitle", { focus: t(`focus_${plan.focus}`), minutes: plan.minutes }),
      kind: "interval",
      intervalPlan: plan,
      durationSec: elapsedSec,
      durationMin: Math.max(1, Math.round(elapsedSec / 60)),
    });
    await updateWorkout(id, { roundsDone: roundsDone(session.steps, done), ...(heart ?? {}) });
    const ids = new Map<string, number>();
    const numbers = new Map<string, number>();
    for (const index of done) {
      const step = session.steps[index];
      if (step.type !== "work") continue;
      const { name, muscleGroup, equipment } = step.exercise;
      let exerciseId = ids.get(name) ?? exercises.find((e) => !e.isCustom && e.name === name)?.id ?? exercises.find((e) => e.name === name)?.id;
      if (!exerciseId) {
        // Not in the library (yet): the athlete gets their own copy.
        exerciseId = await createCustomExercise({ name, muscleGroup, equipment });
      }
      ids.set(name, exerciseId);
      const setNumber = (numbers.get(name) ?? 0) + 1;
      numbers.set(name, setNumber);
      await addWorkoutSet({ workoutId: id, exerciseId, setNumber, reps: step.seconds, restSec: rest, completed: true });
    }
    // The recap takes the timer's place: back from it leads where the session was started from.
    replacingPage();
    router.replace(`${sessionHref(id)}&done=1`);
  }

  if (!timed)
    return (
      <>
        <PageHeader title={t("title")} showBack />
        <p role="status" className="p-4 text-sm text-muted-foreground">{t("notLoaded")}</p>
      </>
    );
  if (!plan || !session || !withDemos) return <PageHeader title={t("title")} showBack />;

  // The session left half-way, rebuilt from its plan: the same one only if it has as many steps.
  const leftPlan = left ? sane(left.progress.context, plan, timed, boxing, athlete?.fitnessLevel) : null;
  const leftSteps = leftPlan ? (build(leftPlan)?.steps.length ?? 0) : 0;
  const canResume = !!left && left.state === "resumable" && leftSteps === left.progress.stepCount;
  function takeUp(again: boolean) {
    if (!left || !leftPlan) return;
    unlockAudio();
    setPlan(leftPlan);
    setResume(again ? { index: left.progress.index, done: left.progress.done, elapsedSec: left.progress.elapsedSec } : undefined);
    if (!again) clearTimedProgress("intervals");
    setLeft(null);
    setPlaying(true);
  }

  const { work, rest } = patternSeconds(plan.pattern);
  const circuits = !isBoxing && session.rounds.length > 1 && plan.minutes >= 30 ? session.rounds.slice(0, 2) : session.rounds.slice(0, 1);
  const level = athlete?.fitnessLevel;
  function chooseFocus(focus: (typeof PLAN_FOCUSES)[number]) {
    if (!plan || !timed) return;
    // Boxing rounds have their own formats and lengths; a circuit, its rhythms and lengths.
    if (focus === BOXING_FOCUS) {
      if (boxing && !isBoxing) change({ focus, pattern: boxingFormat(boxing, level), minutes: middle(boxing.minutes) });
    } else if (isBoxing) change({ focus, pattern: defaultPattern(timed, level), minutes: middle(timed.minutes) });
    else change({ focus });
  }

  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="space-y-6 p-4 pb-28">
        {left && leftPlan && (
          <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-accent-500/30" aria-labelledby="timed-left">
            <div>
              <h2 id="timed-left" className="font-semibold">{t("resumeTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("resumeText", { minutes: leftPlan.minutes, n: left.progress.index + 1, total: left.progress.stepCount })}
              </p>
              {!canResume && (
                <p className="mt-1 text-sm text-muted-foreground">{left.state === "expired" ? t("resumeExpired") : t("resumeChanged")}</p>
              )}
            </div>
            <div className="flex gap-2">
              {canResume ? (
                <>
                  <Button className="h-11 flex-1 rounded-full" onClick={() => takeUp(true)}>{t("resume")}</Button>
                  <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={() => takeUp(false)}>{t("restart")}</Button>
                </>
              ) : (
                <>
                  <Button className="h-11 flex-1 rounded-full" onClick={() => takeUp(false)}>{t("restart")}</Button>
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-full"
                    onClick={() => {
                      clearTimedProgress("intervals");
                      setLeft(null);
                    }}
                  >
                    {t("abandon")}
                  </Button>
                </>
              )}
            </div>
          </section>
        )}

        <p className="text-sm text-muted-foreground">{t(isBoxing ? "boxingIntro" : "intro")}</p>

        <ChoiceField label={t("focus")}>
          {(boxing ? PLAN_FOCUSES : INTERVAL_FOCUSES).map((focus) => (
            <Choice key={focus} on={plan.focus === focus} onClick={() => chooseFocus(focus)}>
              {t(`focus_${focus}`)}
            </Choice>
          ))}
        </ChoiceField>

        {isBoxing && boxing ? (
          <ChoiceField label={t("rounds")} hint={t("roundsHint")}>
            {boxing.formats.map((format) => {
              const s = patternSeconds(format);
              return (
                <Choice key={format} on={plan.pattern === format} onClick={() => change({ pattern: format })}>
                  {t("roundLabel", { round: roundLength(s.work), rest: s.rest })}
                </Choice>
              );
            })}
          </ChoiceField>
        ) : (
        <>
        <ChoiceField label={t("equipment")}>
          {/* The body alone, or with dumbbells, straps or both. */}
          <Choice on={!plan.dumbbells && !plan.trx} onClick={() => change({ dumbbells: false, trx: false })}>
            {t("bodyweight")}
          </Choice>
          <Choice on={plan.dumbbells} onClick={() => change({ dumbbells: !plan.dumbbells })}>
            {t("dumbbells")}
          </Choice>
          <Choice on={!!plan.trx} onClick={() => change({ trx: !plan.trx })}>
            {t("trx")}
          </Choice>
        </ChoiceField>

        <ChoiceField label={t("pattern")} hint={t.has(`patternHint_${plan.pattern}`) ? t(`patternHint_${plan.pattern}`) : undefined}>
          {timed.patterns.map((pattern) => {
            const s = patternSeconds(pattern);
            return (
              <Choice key={pattern} on={plan.pattern === pattern} onClick={() => change({ pattern })}>
                {t("patternLabel", { work: s.work, rest: s.rest })}
              </Choice>
            );
          })}
        </ChoiceField>
        </>
        )}

        <ChoiceField label={t("duration")}>
          {(isBoxing && boxing ? boxing.minutes : timed.minutes).map((minutes) => (
            <Choice key={minutes} on={plan.minutes === minutes} onClick={() => change({ minutes })}>
              {minutes} min
            </Choice>
          ))}
        </ChoiceField>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading>{t("yourSession")}</SectionHeading>
            <Button variant="ghost" size="sm" className="text-accent-text" onClick={() => change({})}>
              <Shuffle className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("shuffle")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {isBoxing && boxing
              ? t("boxingSummary", { rounds: session.rounds.length, round: roundLength(work), rest, combos: session.rounds[0].length, seconds: boxing.comboSec })
              : t("summary", {
                  // A last round of one or two exercises ends the session; it is not counted as a round.
                  rounds: session.rounds.filter((r) => r.length * 2 >= session.rounds[0].length).length,
                  exercises: session.rounds[0].length,
                  work,
                  rest,
                })}
          </p>
          {leftOut > 0 && (
            <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {tinj("leftOut", { count: leftOut })}
              {cautious.length > 0 && <> {tinj("cautiousKept", { count: cautious.length })}</>}
            </p>
          )}
          {circuits.map((round, i) => (
            <div key={i} className="t-surface space-y-1 rounded-2xl p-3 ring-1 ring-foreground/5">
              {circuits.length > 1 && (
                <p className="text-xs font-semibold text-muted-foreground uppercase">{t(i === 0 ? "circuitA" : "circuitB")}</p>
              )}
              {isBoxing && <p className="text-xs font-semibold text-muted-foreground uppercase">{t("firstRound")}</p>}
              <ol className="space-y-1">
                {round.map((e, n) => (
                  <li key={`${n}-${e.name}`} className="flex min-h-9 items-center gap-2 text-sm">
                    <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{n + 1}</span>
                    <span className="flex-1">{xl(e.name)}</span>
                    {cautious.includes(e.name) && <InjuryBadge exerciseName={e.name} injuries={injuries} />}
                    {e.equipment === "dumbbell" && <span className="text-xs text-muted-foreground">{t("withDumbbells")}</span>}
                    {e.equipment === "suspension" && <span className="text-xs text-muted-foreground">{t("withTrx")}</span>}
                    {(demoOf(e).video || demoOf(e).cue) && <DemoButton onClick={() => setDemo({ name: xl(e.name), ...demoOf(e) })} />}
                  </li>
                ))}
              </ol>
              {isBoxing && session.rounds.length > 1 && <p className="pt-1 text-xs text-muted-foreground">{t("roundsVary")}</p>}
            </div>
          ))}
        </section>

        {/* A heart-rate belt, connected before the start: its beats show while playing. */}
        <HeartRateCard hr={hr} />
        <Button
          size="lg"
          className="h-14 w-full rounded-full text-base"
          disabled={saving}
          onClick={() => {
            unlockAudio();
            setResume(undefined);
            setLeft(null);
            setPlaying(true);
          }}
        >
          <Play className="mr-2 h-5 w-5" aria-hidden="true" />
          {t("start")}
        </Button>
        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          {t("soundHint")}
        </p>
      </div>

      {playing && (
        <IntervalPlayer
          key={resume ? "resumed" : "new"}
          session={withDemos}
          getReadySec={timed.getReadySec}
          bpm={hr.bpm}
          onEnd={save}
          resume={resume}
          onProgress={(p) => saveTimedProgress({ kind: "intervals", context: plan, stepCount: session.steps.length, ...p, updatedAt: Date.now() })}
        />
      )}
      <DemoDialog demo={demo} onClose={() => setDemo(null)} />
    </>
  );
}
