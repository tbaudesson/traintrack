"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useWorkout, useWorkouts, updateWorkout, deleteWorkout } from "@/hooks/useWorkouts";
import { useWorkoutSets, useAllWorkoutSets, addWorkoutSet, updateWorkoutSet, deleteWorkoutSet } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { usePrograms } from "@/hooks/usePrograms";
import { useAthleteProfile, useInjuries, updateTrainingSchedule } from "@/hooks/useAthleteProfile";
import { defaultSetValues } from "@/lib/setDefaults";
import { nextLoad, type Advice } from "@/lib/progression";
import { oneRepMaxHistory } from "@/lib/goals";
import { formatPercents, percentWeights, referenceMax } from "@/lib/percent";
import { localDate } from "@/lib/dates";
import { getCurrentUserIdSync } from "@/db";
import { mondayOfDate } from "@/lib/weekPlan";
import { lighter } from "@/lib/startWorkout";
import { usePainReports } from "@/hooks/usePain";
import { recentPainOn, SEVERE_PAIN } from "@/lib/pain";
import { PainDialog } from "@/components/domain/PainDialog";
import { InjuryBadge } from "@/components/domain/InjuryBadge";
import { bySafety, declareInjury, injuryWarning, returnAdjust } from "@/lib/injuries";
import { GuidedSession, type GuidedStep } from "@/components/domain/GuidedSession";
import { guidedOrder } from "@/lib/guided";
import { useAuth } from "@/contexts/AuthContext";
import { warmupSets, type WarmupStep } from "@/lib/warmup";
import { substitutes } from "@/lib/substitutes";
import { chainedNext, linkGroup, restsAfter, supersetOf, unlinkAfter } from "@/lib/supersets";
import { findWorkoutProgramDay } from "@/lib/startWorkout";
import { VideoEmbed } from "@/components/domain/VideoEmbed";
import { demoVideo } from "@/lib/demoVideos";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { beep, unlockAudio } from "@/lib/beep";
import { cancelRestEnd, scheduleRestEnd } from "@/lib/restAlerts";
import { PlateCalculator } from "@/components/domain/PlateCalculator";
import { CardioLogger } from "@/components/domain/CardioLogger";
import { formatDistance, formatDuration, formatPace, isCardio, isCardioDone, newCardioRecords } from "@/lib/cardio";
import { SessionSummary, type SessionSummaryData } from "@/components/domain/SessionSummary";
import db from "@/db";
import {
  beatsRecord, bestLifts, elapsedMinutes, isTimedTarget, timestampIn, valuesForTick, lastPerformance, recordHistory, recentPerformances, topWeight, totalVolume,
} from "@/lib/performance";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Check, Trash2, Timer, X, Dumbbell, Pencil, Heart, HeartPulse, ChevronDown, Target, History, Play, TrendingUp, Trophy, Disc3, Wand2, Flame, Link2, ArrowLeftRight, TrendingDown, Equal, Gauge, BatteryLow, Bandage, PersonStanding } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkoutNotes } from "@/components/domain/WorkoutNotes";
import { IntervalWorkoutView } from "@/components/domain/IntervalWorkoutView";
import { connectHeartRate, isBluetoothSupported, type HeartRateMonitor } from "@/lib/bleHeartRate";
import { EmptyState } from "@/components/ui/page-parts";
import { useExerciseLabel, exerciseDescription } from "@/lib/exerciseNames";
import { useFormat } from "@/lib/format";

/** A session being logged: shared by /log/session?id=… (works offline) and /log/[id]. */
export function SessionLogger({ workoutId }: { workoutId: number }) {
  const t = useTranslations("log");
  const tc = useTranslations("common");
  const to = useTranslations("onboarding");
  const tpain = useTranslations("pain");
  const xl = useExerciseLabel();
  const locale = useLocale();
  const router = useRouter();
  const workout = useWorkout(workoutId);
  const sets = useWorkoutSets(workoutId);
  const exercises = useExercises();
  const programs = usePrograms();
  const allWorkouts = useWorkouts();
  const allSets = useAllWorkoutSets();
  const profile = useAthleteProfile();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [painFor, setPainFor] = useState<number | null>(null);
  const [guided, setGuided] = useState(false);
  const tg = useTranslations("guided");
  const tm = useTranslations("mobility");
  const restPrefs = useAppPrefs().rest;
  const tinj = useTranslations("injuries");
  const injuries = useInjuries();
  const { num, day, short } = useFormat();
  const pains = usePainReports();
  const { profile: account } = useAuth();
  const [openGuide, setOpenGuide] = useState<number | null>(null);
  const [plateWeight, setPlateWeight] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState<{ exercise: string; weightKg: number; reps: number } | null>(null);
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);
  const [rest, setRest] = useState<number | null>(null);
  const [editMeta, setEditMeta] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restEndsAt = useRef(0);
  const effortRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [effort, setEffort] = useState<{
    setId: number;
    setNumber: number;
    restSec?: number;
    timed: boolean;
    hint: { weightKg?: number | null; targetReps?: string };
    startedAt: number;
    seconds: number;
  } | null>(null);

  // Web Bluetooth heart rate
  const [hr, setHr] = useState<number | null>(null);
  const [hrConnected, setHrConnected] = useState(false);
  const [hrConnecting, setHrConnecting] = useState(false);
  const [hrStats, setHrStats] = useState<{ avg: number; max: number } | null>(null);
  const [hrError, setHrError] = useState<string | null>(null);
  const hrMonitorRef = useRef<HeartRateMonitor | null>(null);
  const hrSamplesRef = useRef<number[]>([]);

  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  async function persistHr() {
    const s = hrSamplesRef.current;
    if (s.length === 0) return;
    const avg = Math.round(s.reduce((a, b) => a + b, 0) / s.length);
    await updateWorkout(workoutId, { avgHr: avg, maxHr: Math.max(...s) });
  }

  async function connectHr() {
    setHrError(null);
    setHrConnecting(true);
    try {
      const monitor = await connectHeartRate(
        (bpm) => {
          hrSamplesRef.current.push(bpm);
          setHr(bpm);
          const s = hrSamplesRef.current;
          setHrStats({ avg: Math.round(s.reduce((a, b) => a + b, 0) / s.length), max: Math.max(...s) });
        },
        () => { hrMonitorRef.current = null; setHrConnected(false); setHr(null); }
      );
      hrMonitorRef.current = monitor;
      setHrConnected(true);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      // Ignore the user cancelling the chooser.
      if (!/cancel|user gesture|chooser/i.test(code)) {
        setHrError(code === "BLE_UNSUPPORTED" ? t("hrUnsupported") : t("hrError"));
      }
    } finally {
      setHrConnecting(false);
    }
  }

  async function disconnectHr() {
    await hrMonitorRef.current?.stop();
    hrMonitorRef.current = null;
    setHrConnected(false);
    await persistHr();
    setHr(null);
  }

  async function finishWorkout() {
    await hrMonitorRef.current?.stop();
    hrMonitorRef.current = null;
    await persistHr();
    if (!workout) return router.push("/log");

    if (isCardio(workout)) {
      // Read back: the distance typed just before this tap may not be in `workout` yet.
      const saved = await db.workouts.get(workoutId);
      if (!saved || !isCardioDone(saved)) return router.push("/log");
      const others = allWorkouts.filter((w) => w.date <= saved.date);
      const beaten = newCardioRecords(saved, others);
      setSummary({
        durationMin: null,
        sets: 0,
        volume: 0,
        change: null,
        records: [],
        cardio: {
          distance: saved.distanceM ? formatDistance(saved.distanceM, saved.sport) : null,
          duration: saved.durationSec ? formatDuration(saved.durationSec) : null,
          pace: formatPace(saved.sport, saved.distanceM ?? undefined, saved.durationSec ?? undefined),
          records: beaten,
        },
      });
      return;
    }

    const done = sets.filter((s) => s.completed && !s.isWarmup);
    if (done.length === 0) return router.push("/log");

    const durationMin = workout.durationMin ?? elapsedMinutes(workout.createdAt);
    if (durationMin !== null && !workout.durationMin) await updateWorkout(workoutId, { durationMin });

    const volume = totalVolume(done);
    const earlier = allWorkouts
      .filter((w) => w.id !== workoutId && w.date <= workout.date)
      .filter((w) =>
        workout.programId != null && workout.programDayIndex != null
          ? w.programId === workout.programId && w.programDayIndex === workout.programDayIndex
          : !!workout.title && w.title === workout.title
      )
      .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))[0];
    const previous = earlier ? totalVolume(allSets.filter((s) => s.workoutId === earlier.id)) : 0;

    const records = [...new Set(done.map((s) => s.exerciseId))].flatMap((exerciseId) =>
      recordHistory(exerciseId, allWorkouts, allSets)
        .filter((r) => r.workoutId === workoutId)
        .map((r) => ({ exercise: xl(exMap.get(exerciseId)?.name), weightKg: r.weightKg, reps: r.reps }))
    );

    setSummary({
      durationMin,
      sets: done.length,
      volume,
      change: previous > 0 ? Math.round(((volume - previous) / previous) * 100) : null,
      records,
    });
  }

  // What the program asks for, when this session was started from one.
  const programDay = useMemo(() => {
    const found = findWorkoutProgramDay(programs, workout);
    return found ? found.program.structure[found.index] : null;
  }, [programs, workout]);

  // Group sets by exercise, preserving insertion order
  const groups = useMemo(() => {
    const m = new Map<number, typeof sets>();
    for (const s of sets) {
      if (!m.has(s.exerciseId)) m.set(s.exerciseId, []);
      m.get(s.exerciseId)!.push(s);
    }
    return [...m.entries()];
  }, [sets]);

  /** Each exercise in display order, with its superset (read from its working sets). */
  const slots = groups.map(([exerciseId, exSets]) => ({
    exerciseId,
    group: exSets.find((s) => !s.isWarmup)?.supersetGroup ?? null,
  }));

  /** The program's line for an exercise of this session, if it follows one. */
  function targetFor(exerciseId: number) {
    const ex = exMap.get(exerciseId);
    return programDay?.exercises.find(
      (pe) => (pe.exerciseUuid && pe.exerciseUuid === ex?.uuid) || pe.exerciseName.toLowerCase() === ex?.name.toLowerCase()
    );
  }

  // A deload week lightens every load the session suggests.
  const deloading = !!workout && profile?.deloadWeek === mondayOfDate(workout.date);

  /** The usual load lightened for a deload week, or null outside one. */
  function deloadKgFor(exerciseId: number, target: ReturnType<typeof targetFor>): number | null {
    if (!deloading) return null;
    const usual = adviceFor(exerciseId, target)?.weightKg ?? topWeight(lastPerformance(exerciseId, workout, allWorkouts, allSets));
    return usual ? lighter(usual, exMap.get(exerciseId)?.equipment) : null;
  }

  /** How to load an exercise today, from the last two times and their RPE. */
  function adviceFor(exerciseId: number, target: ReturnType<typeof targetFor>): Advice | null {
    return nextLoad({
      sessions: recentPerformances(exerciseId, workout, allWorkouts, allSets, 2),
      targetSets: target?.targetSets,
      targetReps: target?.targetReps,
      equipment: exMap.get(exerciseId)?.equipment,
    });
  }

  /**
   * For a percentage-of-1RM program: the 1RM the loads come from and the weight
   * of each working set. `max` is null until a first session gives an estimate.
   */
  function percentPlanFor(exerciseId: number, target: ReturnType<typeof targetFor>, setCount: number) {
    if (!target?.percents?.length) return null;
    const earlier = allWorkouts.filter((w) => w.id !== workoutId);
    const max = referenceMax(oneRepMaxHistory(exerciseId, earlier, allSets), workout?.date ?? localDate());
    return { max, weights: max ? percentWeights(target.percents, setCount, max, exMap.get(exerciseId)?.equipment) : [] };
  }

  /** What one tap on "Prefill" would write into each unfinished set. */
  function prefillFor(exerciseId: number, exSets: typeof sets) {
    const target = targetFor(exerciseId);
    const previous = lastPerformance(exerciseId, workout, allWorkouts, allSets);
    const suggestion = deloadKgFor(exerciseId, target) ?? adviceFor(exerciseId, target)?.weightKg ?? null;
    const work = exSets.filter((s) => !s.isWarmup);
    const plan = percentPlanFor(exerciseId, target, work.length);
    return work
      .map((s, i) => ({
        id: s.id,
        values: defaultSetValues({
          set: s,
          totalSets: work.length,
          level: profile?.fitnessLevel,
          exercise: exMap.get(exerciseId),
          targetReps: target?.targetReps,
          previous,
          suggestion,
          plannedKg: plan?.weights[i],
        }),
      }))
      .filter((f): f is { id: number; values: typeof f.values } => f.id !== undefined && Object.keys(f.values).length > 0);
  }

  const prefillAll = groups.flatMap(([exerciseId, exSets]) => prefillFor(exerciseId, exSets));

  /** The session as the guided mode walks it: one step per set, in order, with what to show. */
  function guidedSteps(): GuidedStep[] {
    const byId = new Map(sets.map((s) => [s.id, s]));
    const order = guidedOrder(
      groups.map(([exerciseId, exSets]) => [exerciseId, exSets.filter((s) => s.id !== undefined).map((s) => ({ ...s, id: s.id! }))]),
      (exerciseId) => slots.find((x) => x.exerciseId === exerciseId)?.group ?? null
    );
    const fills = new Map(groups.flatMap(([exerciseId, exSets]) => prefillFor(exerciseId, exSets)).map((f) => [f.id, f.values]));
    return order.map((id) => {
      const s = byId.get(id)!;
      const own = sets.filter((x) => x.exerciseId === s.exerciseId);
      const work = own.filter((x) => !x.isWarmup);
      const warmups = own.filter((x) => x.isWarmup);
      const ex = exMap.get(s.exerciseId);
      const target = targetFor(s.exerciseId);
      const fill = fills.get(id);
      return {
        id,
        completed: s.completed,
        exerciseName: xl(ex?.name),
        label: s.isWarmup
          ? tg("warmupStep", { n: warmups.indexOf(s) + 1 })
          : tg("setOf", { n: work.indexOf(s) + 1, total: work.length }),
        target: target ? t("target", { sets: target.targetSets, reps: target.targetReps }) : undefined,
        timed: isTimedTarget(target?.targetReps),
        weightKg: s.weightKg ?? fill?.weightKg,
        reps: s.reps ?? fill?.reps,
        rpe: s.rpe ?? (s.isWarmup ? undefined : fill?.rpe),
        step: ex?.equipment === "dumbbell" || ex?.equipment === "kettlebell" ? 2 : 2.5,
      };
    });
  }

  async function guidedDone(id: number, values: { weightKg?: number; reps?: number; rpe?: number }) {
    const s = sets.find((x) => x.id === id);
    await updateWorkoutSet(id, values);
    if (s && !s.completed) await toggleDone(id, false, s.restSec, undefined);
  }

  async function applyPrefill(fills: { id: number; values: Partial<Pick<(typeof sets)[number], "weightKg" | "reps" | "rpe">> }[]) {
    await Promise.all(fills.map((f) => updateWorkoutSet(f.id, f.values)));
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (effortRef.current) clearInterval(effortRef.current);
      hrMonitorRef.current?.stop();
    };
  }, []);

  // Keep the screen on during a session: the phone is on the bench, untouched.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        if (document.visibilityState === "visible") lock = await navigator.wakeLock?.request("screen");
      } catch {
        // Refused (low battery, unsupported): the session works without it.
      }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, []);

  function startRest(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setRest(seconds);
    // Against the clock rather than counting ticks: a locked phone skips ticks.
    restEndsAt.current = timestampIn(seconds);
    let lastBeep = 0;
    if (restPrefs.notify) scheduleRestEnd(restEndsAt.current, t("restOverTitle"), t("restOverBody"));
    timerRef.current = setInterval(() => {
      const left = Math.ceil((restEndsAt.current - Date.now()) / 1000);
      if (left > 0) {
        setRest(left);
        if (restPrefs.sound && left <= 3 && left !== lastBeep) {
          lastBeep = left;
          beep("tick");
        }
        return;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setRest(null);
      if (restPrefs.sound) beep("go");
      if (restPrefs.vibrate) navigator.vibrate?.([300, 120, 300]);
    }, 500);
  }

  // The countdown has to stop too, or its next tick brings the bar back.
  function stopRest() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRest(null);
    cancelRestEnd();
  }

  function startEffort(next: { setId: number; setNumber: number; restSec?: number; timed: boolean; hint: { weightKg?: number | null; targetReps?: string } }) {
    stopRest();
    if (effortRef.current) clearInterval(effortRef.current);
    const startedAt = timestampIn(0);
    setEffort({ ...next, startedAt, seconds: 0 });
    effortRef.current = setInterval(() => {
      setEffort((e) => (e ? { ...e, seconds: Math.floor((timestampIn(0) - e.startedAt) / 1000) } : e));
    }, 500);
  }

  function cancelEffort() {
    if (effortRef.current) clearInterval(effortRef.current);
    setEffort(null);
  }

  async function finishEffort() {
    if (!effort) return;
    const { setId, restSec, timed, hint, seconds } = effort;
    cancelEffort();
    // For a held position the time measured is the result of the set.
    if (timed && seconds > 0) await updateWorkoutSet(setId, { reps: seconds });
    await toggleDone(setId, false, restSec, hint);
  }

  function extendRest(seconds: number) {
    restEndsAt.current += seconds * 1000;
    setRest((r) => (r === null ? r : r + seconds));
    if (restPrefs.notify) scheduleRestEnd(restEndsAt.current, t("restOverTitle"), t("restOverBody"));
  }

  function nextWeightFor(exerciseId: number) {
    return topWeight(lastPerformance(exerciseId, workout, allWorkouts, allSets)) ?? undefined;
  }

  async function addExercise(exerciseId: number) {
    await addWorkoutSet({ workoutId, exerciseId, setNumber: 1, weightKg: nextWeightFor(exerciseId), completed: false });
    setPickerOpen(false);
  }

  async function addSet(exerciseId: number, lastSetNumber: number, weightKg?: number, supersetGroup?: number | null) {
    await addWorkoutSet({ workoutId, exerciseId, setNumber: lastSetNumber + 1, weightKg, supersetGroup, completed: false });
  }

  async function addWarmup(exerciseId: number, steps: WarmupStep[]) {
    await Promise.all(
      steps.map((step, i) =>
        addWorkoutSet({ workoutId, exerciseId, setNumber: i + 1, ...step, restSec: 60, isWarmup: true, completed: false })
      )
    );
  }

  /** Put every working set of an exercise in a superset, or take it out (null). */
  async function setGroup(exerciseId: number, group: number | null) {
    await Promise.all(
      sets.filter((s) => s.exerciseId === exerciseId && !s.isWarmup && s.id).map((s) => updateWorkoutSet(s.id!, { supersetGroup: group }))
    );
  }

  async function linkWithNext(index: number) {
    const [a, b] = [slots[index], slots[index + 1]];
    const group = linkGroup(a, b, slots);
    const joining = new Set([...supersetOf(a.exerciseId, slots), ...supersetOf(b.exerciseId, slots)]);
    await Promise.all([...joining].map((id) => setGroup(id, group)));
  }

  async function unlink(exerciseId: number) {
    await Promise.all([...unlinkAfter(exerciseId, slots)].map(([id, group]) => setGroup(id, group)));
  }

  /** Move what is left of an exercise to another; sets already done stay as they were. */
  async function swapExercise(oldId: number, newId: number) {
    const left = sets.filter((s) => s.exerciseId === oldId && !s.completed && s.id);
    await Promise.all(
      left.map((s) =>
        s.isWarmup ? deleteWorkoutSet(s.id!) : updateWorkoutSet(s.id!, { exerciseId: newId, weightKg: undefined, rpe: undefined })
      )
    );
    setSwapFor(null);
  }

  const swapOptions =
    swapFor === null
      ? []
      : bySafety(
          substitutes(
            exMap.get(swapFor),
            exercises.filter((e) => !groups.some(([id]) => id === e.id)),
            profile?.equipment
          ),
          injuries
        );

  async function toggleDone(
    setId: number,
    completed: boolean,
    restSec?: number,
    hint?: { weightKg?: number | null; targetReps?: string }
  ) {
    const current = await db.workoutSets.get(setId);
    const filled = !completed && current && hint ? valuesForTick(current, hint) : {};
    await updateWorkoutSet(setId, { ...filled, completed: !completed });
    if (completed) return;
    // The tap that ticks the set lets the page play the end-of-rest beep.
    if (restPrefs.sound) unlockAudio();
    if (current?.isWarmup) {
      startRest(restPrefs.warmupSec);
      return;
    }
    // In a superset, go straight to the next exercise: the rest comes after the last one.
    if (!current || restsAfter(current.exerciseId, slots)) startRest(restSec && restSec > 0 ? restSec : restPrefs.defaultSec);
    else navigator.vibrate?.(60);

    // Read back: the weight typed just before this tap may not be in `sets` yet.
    const saved = await db.workoutSets.get(setId);
    if (!saved || !workout) return;
    const others = allSets.filter((s) => s.id !== setId);
    if (beatsRecord(saved, workout, allWorkouts, others)) {
      setNewRecord({ exercise: xl(exMap.get(saved.exerciseId)?.name), weightKg: saved.weightKg!, reps: saved.reps! });
      navigator.vibrate?.(150);
      setTimeout(() => setNewRecord(null), 4500);
    }
  }

  if (workout?.kind === "interval") return <IntervalWorkoutView workout={workout} sets={sets ?? []} exercises={exercises} />;

  return (
    <>
      <PageHeader
        title={workout?.title || t("title")}
        showBack
        actions={
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("editWorkout")}
              onClick={() => {
                setTitleDraft(workout?.title ?? "");
                setDateDraft(workout?.date ?? "");
                setEditMeta((v) => !v);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={finishWorkout}>
              {t("finishWorkout")}
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-4 pb-28">
        {/* Heart-rate monitor (Web Bluetooth) */}
        {isBluetoothSupported() ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                hr ? "bg-rose-100 dark:bg-rose-900/30" : "bg-muted"
              )}>
                <Heart className={cn("h-5 w-5", hr ? "animate-pulse text-rose-500" : "text-muted-foreground")} />
              </div>
              <div className="flex-1">
                {hr ? (
                  <p className="text-lg font-bold tabular-nums">{hr} <span className="text-xs font-normal text-muted-foreground">bpm</span></p>
                ) : (
                  <p className="text-sm font-medium">{t("heartRate")}</p>
                )}
                {hrStats && (
                  <p className="text-xs text-muted-foreground">
                    {t("hrAvg")} {hrStats.avg} · {t("hrMax")} {hrStats.max}
                  </p>
                )}
                {hrError && <p className="text-xs text-destructive">{hrError}</p>}
              </div>
              {hrConnected ? (
                <Button size="sm" variant="outline" onClick={disconnectHr}>{t("hrDisconnect")}</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={connectHr} disabled={hrConnecting}>
                  <HeartPulse className="mr-1 h-4 w-4" />
                  {hrConnecting ? t("hrConnecting") : t("hrConnect")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}

        {editMeta && (
          <Card>
            <CardContent className="space-y-2 py-3">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder={t("title")} />
              <Input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={async () => {
                    await updateWorkout(workoutId, {
                      title: titleDraft.trim() || undefined,
                      date: dateDraft || workout?.date,
                    });
                    setEditMeta(false);
                  }}
                >
                  <Check className="mr-1 h-4 w-4" />
                  {t("save")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    await deleteWorkout(workoutId);
                    router.push("/log");
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {t("deleteWorkout")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {workout && isCardio(workout) && (
          <CardioLogger key={workout.id} workout={workout} target={programDay?.cardio} />
        )}

        {workout && (
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/mobility?mode=warmup&workout=${workoutId}`}>
              <Button variant="outline" className="w-full rounded-full">
                <PersonStanding className="mr-1 h-4 w-4" aria-hidden="true" />
                {tm("warmupButton")}
              </Button>
            </Link>
            <Link href={`/mobility?mode=stretch&workout=${workoutId}`}>
              <Button variant="outline" className="w-full rounded-full">
                <PersonStanding className="mr-1 h-4 w-4" aria-hidden="true" />
                {tm("stretchButton")}
              </Button>
            </Link>
          </div>
        )}

        {workout && !isCardio(workout) && groups.length === 0 && (
          <EmptyState icon={Dumbbell} title={t("noExercises")} />
        )}

        {workout && !isCardio(workout) && groups.length > 0 && (
          <Button className="h-12 w-full rounded-full" onClick={() => setGuided(true)}>
            <Play className="mr-1 h-5 w-5" aria-hidden="true" />
            {tg("start")}
          </Button>
        )}

        {prefillAll.length > 0 && groups.length > 1 && (
          <Button variant="outline" className="w-full rounded-full text-accent-text" onClick={() => applyPrefill(prefillAll)}>
            <Wand2 className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("prefillAll")}
          </Button>
        )}

        {groups.map(([exerciseId, exSets], index) => {
          const ex = exMap.get(exerciseId);
          const injuryWarn = injuryWarning(ex?.name, injuries);
          const comeback = returnAdjust(ex?.name, injuries, workout?.date ?? localDate());
          const work = exSets.filter((s) => !s.isWarmup);
          const warmups = exSets.filter((s) => s.isWarmup);
          const last = work[work.length - 1];
          const target = targetFor(exerciseId);
          const fills = prefillFor(exerciseId, exSets);
          const workKg = work.find((s) => s.weightKg)?.weightKg ?? fills.find((f) => f.id === work[0]?.id)?.values.weightKg;
          const warmupPlan =
            !isTimedTarget(target?.targetReps) && warmups.length === 0 && !work.some((s) => s.completed)
              ? warmupSets(workKg, ex?.equipment)
              : [];
          const plannedFor = (s: (typeof sets)[number]) => (s.isWarmup ? undefined : percentPlan?.weights[work.indexOf(s)]);
          const inSuperset = supersetOf(exerciseId, slots).length > 1;
          const pain = workout ? recentPainOn(pains, { uuid: ex?.uuid, name: ex?.name }, workout.date) : undefined;
          const chained = chainedNext(exerciseId, slots);
          const linkedToNext = slots[index].group != null && slots[index].group === slots[index + 1]?.group;
          const guideOpen = openGuide === exerciseId;
          const nextSet = exSets.find((s) => !s.completed);
          const previous = lastPerformance(exerciseId, workout, allWorkouts, allSets);
          const previousTop = topWeight(previous);
          const percentPlan = percentPlanFor(exerciseId, target, work.length);
          // A percentage program sets the load itself: no RPE advice on top.
          const deloadKg = percentPlan ? null : deloadKgFor(exerciseId, target);
          const advice = percentPlan || deloading ? null : adviceFor(exerciseId, target);
          const suggestion = deloadKg ?? advice?.weightKg ?? null;
          const best = bestLifts(exerciseId, allSets);
          const records = recordHistory(exerciseId, allWorkouts, allSets).slice(-5).reverse();
          return (
            <Fragment key={exerciseId}>
            <Card className={cn("relative", inSuperset && "ring-2 ring-accent-500/40")}>
              <Image
                src="/images/dumbbell.webp"
                alt=""
                width={78}
                height={60}
                unoptimized
                className="pointer-events-none absolute top-1 right-11 opacity-90 dark:opacity-70"
              />
              <CardContent className="relative space-y-2 py-3">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenGuide(guideOpen ? null : exerciseId)}
                    aria-expanded={guideOpen}
                    className="flex min-h-11 w-full items-center gap-2 text-left font-semibold"
                  >
                    <Dumbbell className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{xl(ex?.name)}</span>
                    <ChevronDown
                      className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", guideOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                </h3>

                {pain && (
                  <p
                    className={cn(
                      "flex items-start gap-1.5 rounded-lg p-2 text-sm",
                      pain.level >= SEVERE_PAIN
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    )}
                  >
                    <Bandage className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t(pain.level >= SEVERE_PAIN ? "painSevere" : "painRecent", {
                      area: tpain(`area_${pain.area}`),
                      level: pain.level,
                      date: short(pain.date),
                    })}
                  </p>
                )}

                {comeback && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <Bandage className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {tinj(comeback.load < 1 ? "returnLine" : "returnLastWeek", {
                      area: locale === "de" ? tpain(`area_${comeback.area}`) : tpain(`area_${comeback.area}`).toLowerCase(),
                      week: comeback.week,
                      percent: Math.round((1 - comeback.load) * 100),
                    })}
                  </p>
                )}

                {injuryWarn && (
                  <div
                    className={cn(
                      "flex items-start gap-2 rounded-lg p-2 text-sm",
                      injuryWarn.level === "avoid"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    )}
                  >
                    <p className="flex-1">
                      {tinj(injuryWarn.level === "avoid" ? "avoidAdvice" : "cautionAdvice", {
                        areas: injuryWarn.areas.map((a) => (locale === "de" ? tpain(`area_${a}`) : tpain(`area_${a}`).toLowerCase())).join(", "),
                      })}
                    </p>
                    {injuryWarn.level === "avoid" && (
                      <button type="button" onClick={() => setSwapFor(exerciseId)} className="flex min-h-9 shrink-0 items-center gap-1 font-semibold underline">
                        <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                        {tinj("replace")}
                      </button>
                    )}
                  </div>
                )}

                {inSuperset && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent-text uppercase">
                    <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("superset")}
                    {chained !== null && (
                      <span className="font-normal tracking-normal text-muted-foreground normal-case">
                        · {t("chainWith", { name: xl(exMap.get(chained)?.name) })}
                      </span>
                    )}
                  </p>
                )}

                {target && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-accent-text">
                    <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("target", { sets: target.targetSets, reps: target.targetReps })}
                    {target.restSec ? ` · ${t("targetRest", { sec: target.restSec })}` : ""}
                  </p>
                )}

                {previous.length > 0 && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <History className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("lastTime", { value: formatPerformance(previous, num) })}
                  </p>
                )}

                {advice && <AdviceLine advice={advice} />}

                {deloading && !percentPlan && (
                  <p className="flex items-start gap-1.5 text-sm font-medium text-accent-text">
                    <BatteryLow className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {deloadKg ? t("deloadLoad", { kg: num(deloadKg) }) : t("deloadNoLoad")}
                  </p>
                )}

                {percentPlan && target?.percents && (
                  <p className="flex items-start gap-1.5 text-sm font-medium text-accent-text">
                    <Gauge className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {percentPlan.max
                      ? t("percentPlan", {
                          percents: formatPercents(target.percents),
                          max: Math.round(percentPlan.max),
                          weights: [...new Set(percentPlan.weights)].map((w) => num(w)).join(" / "),
                        })
                      : t("percentNoMax", { percents: formatPercents(target.percents) })}
                  </p>
                )}

                {guideOpen && (
                  <div className="space-y-2 rounded-xl bg-muted/50 p-3">
                    {best && (
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Trophy className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                        {t("bestLifts", { kg: num(best.weightKg), max: Math.round(best.oneRepMax) })}
                      </p>
                    )}
                    {records.length > 0 && (
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {records.map((r, i) => (
                          <li key={i}>{day(r.date)} · {num(r.weightKg)} kg × {r.reps}</li>
                        ))}
                      </ul>
                    )}
                    {exerciseDescription(ex, locale) && <p className="text-sm text-muted-foreground">{exerciseDescription(ex, locale)}</p>}
                    {(demoVideo(ex?.name ?? "", ex?.videoUrl) ?? ex?.videoUrl) && <VideoEmbed url={(demoVideo(ex?.name ?? "", ex?.videoUrl) ?? ex?.videoUrl)!} />}
                    {!exerciseDescription(ex, locale) && !ex?.videoUrl && !demoVideo(ex?.name ?? "") && <p className="text-sm text-muted-foreground">{t("noGuide")}</p>}
                    <Link href={`/exercises/${exerciseId}`} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-text">
                      <History className="h-4 w-4" aria-hidden="true" />
                      {t("fullHistory")}
                    </Link>
                  </div>
                )}

                {/* Column headers */}
                <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem_2.5rem] items-center gap-1.5 px-1 text-center text-xs leading-tight text-muted-foreground">
                  <span>{t("set")}</span>
                  <span>{t("weight")}</span>
                  <span aria-hidden="true">{isTimedTarget(target?.targetReps) ? t("secondsShort") : t("repsShort")}</span>
                  <span>{t("rpe")}</span>
                  <span>{t("doneShort")}</span>
                  <span></span>
                </div>

                {exSets.map((s) => (
                  <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem_2.5rem] items-center gap-1.5">
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg text-sm font-bold",
                        s.isWarmup
                          ? "border border-dashed border-border text-xs text-muted-foreground"
                          : "t-well bg-accent-100 text-accent-text dark:bg-accent-900/40"
                      )}
                      title={s.isWarmup ? t("warmup") : undefined}
                    >
                      {s.isWarmup ? `${t("warmupShort")}${warmups.indexOf(s) + 1}` : s.setNumber}
                    </span>
                    <NumCell key={`w${s.weightKg ?? ""}`} label={t("weight")} placeholder={plannedFor(s) !== undefined ? String(plannedFor(s)) : previousTop !== null ? String(suggestion ?? previousTop) : undefined} value={s.weightKg} onChange={(v) => s.id && updateWorkoutSet(s.id, { weightKg: v })} />
                    <NumCell key={`r${s.reps ?? ""}`} label={t("reps")} placeholder={target?.targetReps} value={s.reps} onChange={(v) => s.id && updateWorkoutSet(s.id, { reps: v })} />
                    <NumCell key={`p${s.rpe ?? ""}`} label={t("rpe")} value={s.rpe} onChange={(v) => s.id && updateWorkoutSet(s.id, { rpe: v !== undefined && v >= 1 && v <= 10 ? v : undefined })} />
                    <button
                      onClick={() =>
                        s.id &&
                        toggleDone(s.id, s.completed, s.restSec, s.isWarmup ? undefined : { weightKg: plannedFor(s) ?? suggestion ?? previousTop, targetReps: target?.targetReps })
                      }
                      aria-label={tc("markDone")}
                      aria-pressed={!!s.completed}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-md border",
                        s.completed
                          ? "border-green-500 bg-green-500 text-white"
                          : "t-well border-transparent bg-accent-100 text-accent-text dark:bg-accent-900/40"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => s.id && deleteWorkoutSet(s.id)}
                      aria-label={tc("delete")}
                      className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {fills.length > 0 && (
                  <button
                    type="button"
                    onClick={() => applyPrefill(fills)}
                    className="flex min-h-10 w-full items-center justify-center gap-1.5 text-sm font-medium text-accent-text"
                  >
                    <Wand2 className="h-4 w-4" aria-hidden="true" />
                    {t("prefill", { level: t(`level_${profile?.fitnessLevel ?? "beginner"}`) })}
                  </button>
                )}

                {warmupPlan.length > 0 && (
                  <button
                    type="button"
                    onClick={() => addWarmup(exerciseId, warmupPlan)}
                    className="flex min-h-10 w-full items-center justify-center gap-1.5 text-sm font-medium text-accent-text"
                  >
                    <Flame className="h-4 w-4" aria-hidden="true" />
                    {t("addWarmup", { steps: warmupPlan.map((w) => num(w.weightKg)).join(" · ") })}
                  </button>
                )}

                {nextSet && effort?.setId !== nextSet.id && (
                  <Button
                    size="sm"
                    className="w-full rounded-full"
                    onClick={() =>
                      nextSet.id &&
                      startEffort({
                        setId: nextSet.id,
                        setNumber: nextSet.setNumber,
                        restSec: nextSet.restSec,
                        timed: isTimedTarget(target?.targetReps),
                        hint: nextSet.isWarmup ? {} : { weightKg: plannedFor(nextSet) ?? suggestion ?? previousTop, targetReps: target?.targetReps },
                      })
                    }
                  >
                    <Play className="mr-1 h-4 w-4" aria-hidden="true" />
                    {nextSet.isWarmup ? t("startWarmup") : t("startSet", { set: nextSet.setNumber })}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full text-accent-text"
                  onClick={() => addSet(exerciseId, last?.setNumber ?? 0, last?.weightKg, slots[index].group)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("addSet")}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlateWeight(last?.weightKg ?? 0)}
                    className="flex min-h-10 items-center justify-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <Disc3 className="h-4 w-4" aria-hidden="true" />
                    {t("plates")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwapFor(exerciseId)}
                    className="flex min-h-10 items-center justify-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                    {t("swap")}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPainFor(exerciseId)}
                  className="flex min-h-10 w-full items-center justify-center gap-1.5 text-sm text-muted-foreground"
                >
                  <Bandage className="h-4 w-4" aria-hidden="true" />
                  {tpain("report")}
                </button>
              </CardContent>
            </Card>

            {index < groups.length - 1 &&
              (linkedToNext ? (
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-accent-text">
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  {t("chained")}
                  <button type="button" onClick={() => unlink(exerciseId)} className="min-h-10 px-2 text-muted-foreground underline">
                    {t("unlink")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => linkWithNext(index)}
                  className="flex min-h-10 w-full items-center justify-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  {t("linkNext")}
                </button>
              ))}
            </Fragment>
          );
        })}

        {!isCardio(workout) && (
          <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("addExercise")}
        </Button>
        )}

        <div className="pt-2">
          <WorkoutNotes workoutId={workoutId} />
        </div>
      </div>

      {newRecord && (
        <div role="status" className="t-hero fixed top-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl p-3">
          <Trophy className="size-7 shrink-0 text-accent-text" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-bold">{t("newRecord")}</p>
            <p className="truncate text-sm text-muted-foreground">{newRecord.exercise} · {num(newRecord.weightKg)} kg × {newRecord.reps}</p>
          </div>
        </div>
      )}

      {plateWeight !== null && (
        <PlateCalculator open onOpenChange={() => setPlateWeight(null)} initialWeight={plateWeight || undefined} />
      )}

      <SessionSummary
        data={summary}
        onClose={() => router.push("/log")}
        onStretch={() => router.push(`/mobility?mode=stretch&workout=${workoutId}`)}
      />

      {effort && (
        <div role="timer" aria-label={t("effortLabel")} className="fixed bottom-24 left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full bg-success-text py-1 pr-1 pl-4 whitespace-nowrap text-background shadow-lg">
          <Timer className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">{t("effortOfSet", { set: effort.setNumber })}</span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {Math.floor(effort.seconds / 60)}:{String(effort.seconds % 60).padStart(2, "0")}
          </span>
          <button onClick={finishEffort} className="flex h-10 items-center rounded-full px-2 text-sm font-semibold">
            {t("finishSet")}
          </button>
          <button onClick={cancelEffort} aria-label={tc("cancel")} className="flex size-10 items-center justify-center opacity-80 hover:opacity-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Rest timer */}
      {rest !== null && (
        <div role="timer" aria-label={t("restLabel")} className="fixed bottom-24 left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary py-1 pr-1 pl-4 text-primary-foreground shadow-lg">
          <Timer className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">{t("restLabel")}</span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
          </span>
          <button onClick={() => extendRest(30)} className="flex h-10 items-center rounded-full px-2 text-sm font-semibold">
            +30 s
          </button>
          <button onClick={stopRest} aria-label={tc("close")} className="flex size-10 items-center justify-center opacity-80 hover:opacity-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {guided && (
        <GuidedSession
          steps={guidedSteps()}
          rest={rest}
          onDone={guidedDone}
          onExtendRest={() => extendRest(30)}
          onSkipRest={stopRest}
          onFinish={() => {
            setGuided(false);
            finishWorkout();
          }}
          onClose={() => setGuided(false)}
        />
      )}

      {painFor !== null && (
        <PainDialog
          open
          onOpenChange={(open) => !open && setPainFor(null)}
          workoutId={workoutId}
          exercise={{ name: exMap.get(painFor)?.name ?? "?", label: xl(exMap.get(painFor)?.name), uuid: exMap.get(painFor)?.uuid }}
          authorName={account?.display_name ?? undefined}
          onReplace={() => setSwapFor(painFor)}
          // Only on one's own session: the injury goes on the athlete's profile.
          injuries={workout?.userId === getCurrentUserIdSync() ? injuries : undefined}
          onDeclareInjury={(area) => updateTrainingSchedule({ injuryAreas: declareInjury(injuries, area, localDate()) })}
        />
      )}

      {/* Replace an exercise */}
      <Dialog open={swapFor !== null} onOpenChange={(open) => !open && setSwapFor(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("swapTitle", { name: swapFor !== null ? xl(exMap.get(swapFor)?.name) : "" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("swapHint")}</p>
          {swapOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("swapNone")}</p>
          ) : (
            <div className="space-y-1">
              {swapOptions.map((e) => (
                <button
                  key={e.id}
                  onClick={() => swapFor !== null && e.id && swapExercise(swapFor, e.id)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <Dumbbell className="h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    {xl(e.name)}
                    <InjuryBadge exerciseName={e.name} injuries={injuries} />
                  </span>
                  {e.equipment && <span className="shrink-0 text-xs text-muted-foreground">{to(`equip_${e.equipment}`)}</span>}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exercise picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("selectExercise")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {exercises.map((e) => (
              <button
                key={e.id}
                onClick={() => e.id && addExercise(e.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <Dumbbell className="h-4 w-4 text-accent-500" />
                <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  {xl(e.name)}
                  <InjuryBadge exerciseName={e.name} injuries={injuries} />
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "60 kg × 8, 8, 7", or "60×8, 62.5×7 kg" when the weight changed. */
function formatPerformance(sets: { weightKg?: number; reps?: number }[], num: (n: number) => string) {
  const weights = new Set(sets.map((s) => s.weightKg ?? 0));
  const reps = sets.map((s) => s.reps).join(", ");
  if (weights.size === 1) {
    const [weight] = weights;
    return weight > 0 ? `${num(weight)} kg × ${reps}` : reps;
  }
  return `${sets.map((s) => `${num(s.weightKg ?? 0)}×${s.reps}`).join(", ")} kg`;
}

function NumCell({ label, placeholder, value, onChange }: { label: string; placeholder?: string; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      defaultValue={value ?? ""}
      placeholder={placeholder}
      onBlur={(e) => {
        const v = e.target.value === "" ? undefined : Number(e.target.value);
        onChange(v);
      }}
      aria-label={label}
      className="h-11 w-full rounded-md border border-border bg-transparent px-1 text-center text-base outline-none focus:border-accent-500"
    />
  );
}

/** Today's load and why: up, hold or ease off, from the last RPE. */
function AdviceLine({ advice }: { advice: Advice }) {
  const t = useTranslations("log");
  const { kind, weightKg: kg, fromKg, rpe } = advice;
  const { num } = useFormat();
  const values = { kg: num(kg), diff: num(Math.round((kg - fromKg) * 10) / 10), rpe: rpe ?? "" };
  const text =
    kind === "jump" ? t("adviceJump", values)
    : kind === "up" ? (rpe === undefined ? t("suggestion", values) : t("adviceUp", values))
    : kind === "moreReps" ? t("adviceMoreReps", values)
    : kind === "hold" ? t("adviceHold", values)
    : t("adviceDeload", values);
  const Icon = kind === "deload" ? TrendingDown : kind === "jump" || kind === "up" ? TrendingUp : Equal;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-sm font-medium",
        kind === "jump" || kind === "up" ? "text-success-text" : kind === "deload" ? "text-amber-600 dark:text-amber-400" : "text-accent-text"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}
