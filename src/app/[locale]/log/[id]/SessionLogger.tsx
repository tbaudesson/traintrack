"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useInjuryRules } from "@/hooks/useInjuryRules";
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
import { recentPainOn } from "@/lib/pain";
import { useInjuryGuidance } from "@/hooks/useInjuryGuidance";
import { ExercisePicker } from "@/components/domain/ExercisePicker";
import { BigTimer } from "@/components/domain/BigTimer";
import { SessionFeedback } from "@/components/domain/SessionFeedback";
import { PlanVsDone } from "@/components/domain/PlanVsDone";
import { ReuseSessionDialog } from "@/components/domain/ReuseSessionDialog";
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
import { useGlobalNavigationHidden, useSessionFocus } from "@/hooks/useSessionFocus";
import { beep, unlockAudio } from "@/lib/beep";
import { cancelRestEnd, notifyRestEndNow, scheduleRestEnd } from "@/lib/restAlerts";
import { vibrate } from "@/lib/haptic";
import { clearRestEnd, loadRestEnd, saveRestEnd } from "@/lib/restTimer";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { PlateCalculator } from "@/components/domain/PlateCalculator";
import { CardioLogger } from "@/components/domain/CardioLogger";
import { formatDistance, formatDuration, formatPace, isCardio, isCardioDone, newCardioRecords } from "@/lib/cardio";
import { SessionSummary, type SessionSummaryData } from "@/components/domain/SessionSummary";
import db from "@/db";
import {
  beatsRecord, bestLifts, elapsedMinutes, isTimedTarget, targetSeconds, timestampIn, valuesForTick, lastPerformance, recordHistory, recentPerformances, topWeight, totalVolume,
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
import { Plus, Check, Trash2, Timer, X, Dumbbell, Pencil, Heart, MoreHorizontal, HeartPulse, ChevronDown, Target, History, Play, TrendingUp, Trophy, Disc3, Wand2, Flame, Link2, ArrowLeftRight, TrendingDown, Equal, Gauge, BatteryLow, Bandage, PersonStanding, CopyPlus, Ban, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkoutNotes } from "@/components/domain/WorkoutNotes";
import { IntervalWorkoutView } from "@/components/domain/IntervalWorkoutView";
import { MobilityWorkoutView } from "@/components/domain/MobilityWorkoutView";
import { connectHeartRate, isBluetoothSupported, type HeartRateMonitor } from "@/lib/bleHeartRate";
import { EmptyState } from "@/components/ui/page-parts";
import { useExerciseLabel, exerciseDescription } from "@/lib/exerciseNames";
import { useFormat } from "@/lib/format";

/** A session being logged: shared by /log/session?id=… (works offline) and /log/[id]. */
export function SessionLogger({ workoutId, startGuided = false }: { workoutId: number; startGuided?: boolean }) {
  const t = useTranslations("log");
  const tp = useTranslations("programs");
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
  const [reusing, setReusing] = useState(false);
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [painFor, setPainFor] = useState<number | null>(null);
  const [guided, setGuided] = useState(startGuided);
  const tg = useTranslations("guided");
  const tm = useTranslations("mobility");
  const restPrefs = useAppPrefs().rest;
  // Read when the rest ends, not when it began: a rest found again after a
  // reload starts before the saved choices are read, and they may change since.
  const restPrefsRef = useRef(restPrefs);
  useEffect(() => {
    restPrefsRef.current = restPrefs;
  }, [restPrefs]);
  const tinj = useTranslations("injuries");
  const injuries = useInjuries();
  const { num, day, short } = useFormat();
  const pains = usePainReports();
  const injuryG = useInjuryGuidance();
  const injuryRules = useInjuryRules();
  const { profile: account } = useAuth();
  const [openGuide, setOpenGuide] = useState<number | null>(null);
  // Exercises reopened once done, and bodyweight exercises given a load.
  const [reopened, setReopened] = useState<Set<number>>(() => new Set());
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set());
  const [plateWeight, setPlateWeight] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState<{ exercise: string; weightKg: number; reps: number } | null>(null);
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);
  // A set's menu (its RPE, deleting it), and the sets deleted but still undoable.
  const [menuSet, setMenuSet] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number[]>([]);
  const deleteTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const [confirmDelete, setConfirmDelete] = useState(false);
  // A field being typed in: the bottom bar steps aside for the keyboard.
  const [typing, setTyping] = useState(false);
  const navHidden = useGlobalNavigationHidden();
  // The rest and effort bars sit above the bottom bar, itself above the menu wheel when it shows.
  const barOffset = navHidden ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(11rem+env(safe-area-inset-bottom))]";
  // Today's session is being done: no global navigation until its summary.
  // A past one, opened from the history, keeps it.
  useSessionFocus(!!workout && workout.date === localDate() && !summary);
  const [rest, setRest] = useState<number | null>(null);
  // The rest's whole length, for the ring: its seconds when it began, plus what was added.
  const [restTotal, setRestTotal] = useState<number | null>(null);
  // The clocks full screen (a big ring), or shrunk to a bar: the athlete's choice, kept on the device.
  const [timerFull, setTimerFull] = useState(true);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device's storage, only on the client
      if (localStorage.getItem("traintrack.timerView") === "compact") setTimerFull(false);
    } catch {
      // No storage: full screen.
    }
  }, []);
  const chooseTimerView = (full: boolean) => {
    setTimerFull(full);
    try {
      localStorage.setItem("traintrack.timerView", full ? "full" : "compact");
    } catch {
      // Private window: for this visit only.
    }
  };
  const [editMeta, setEditMeta] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  // "More details": when it started and what it was for, optional.
  const [timeDraft, setTimeDraft] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
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
    /** A timed set counts down to this, then ends by itself. */
    goal?: number;
  } | null>(null);
  // The next timed set starts by itself once the rest is over (or at once in a circuit):
  // the set just ended, so as not to start it again before it shows as done.
  const chainNext = useRef<number | null>(null);
  const finishEffortRef = useRef<() => void>(() => {});

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
  // The plan kept with the session when it started; the program as it is now for older sessions.
  const programDay = useMemo(() => {
    if (workout?.plannedDay) return workout.plannedDay;
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

  // The set to do now: the first one not done, in the order of the session.
  const currentSetId = groups.flatMap(([, exSets]) => exSets).find((s) => !s.completed)?.id;
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
    const endsAt = timestampIn(seconds);
    if (restPrefs.notify) scheduleRestEnd(endsAt, t("restOverTitle"), t("restOverBody"));
    runRestUntil(endsAt);
  }

  /** Count down to a moment: a rest just begun, or one found again after a reload. */
  function runRestUntil(endsAt: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    // Against the clock rather than counting ticks: a locked phone skips ticks.
    restEndsAt.current = endsAt;
    const total = Math.max(1, Math.ceil((endsAt - timestampIn(0)) / 1000));
    setRest(total);
    setRestTotal(total);
    saveRestEnd(workoutId, endsAt);
    let lastBeep = 0;
    timerRef.current = setInterval(() => {
      const left = Math.ceil((restEndsAt.current - Date.now()) / 1000);
      if (left > 0) {
        setRest(left);
        if (restPrefsRef.current.sound && left <= 3 && left !== lastBeep) {
          lastBeep = left;
          beep("tick");
        }
        return;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setRest(null);
      clearRestEnd(workoutId);
      const prefs = restPrefsRef.current;
      if (prefs.sound) beep("go");
      if (prefs.vibrate) vibrate([300, 120, 300]);
      // The service worker's own timer may have been stopped by the system:
      // the page, still awake behind another app, shows the notification itself.
      if (prefs.notify && document.visibilityState === "hidden") void notifyRestEndNow(t("restOverTitle"), t("restOverBody"));
    }, 500);
  }

  // The countdown has to stop too, or its next tick brings the bar back.
  function stopRest() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRest(null);
    clearRestEnd(workoutId);
    cancelRestEnd();
  }

  // Leaving the page within the 5 s: the sets deleted are deleted.
  useEffect(() => {
    const timers = deleteTimers.current;
    const flush = () => {
      for (const [id, timer] of timers) {
        clearTimeout(timer);
        deleteWorkoutSet(id);
      }
      timers.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  // The bottom bar gives way to the keyboard while a field is typed in.
  useEffect(() => {
    const isField = (el: EventTarget | null) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    // A field left by pressing something else: the bar comes back only once the press is over,
    // so it never appears under the finger and takes the tap (short landscape screens).
    let pressing = false;
    let pending = false;
    const settle = () => setTyping(isField(document.activeElement));
    const onIn = (e: FocusEvent) => isField(e.target) && setTyping(true);
    const onOut = (e: FocusEvent) => {
      if (!isField(e.target)) return;
      if (pressing) pending = true;
      else setTyping(false);
    };
    const onDown = () => { pressing = true; };
    const onUp = () => {
      pressing = false;
      if (!pending) return;
      pending = false;
      // After the click that follows this release.
      setTimeout(settle, 0);
    };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
    };
  }, []);

  // A rest running when the page was closed or reloaded goes on to the same moment.
  const restResumed = useRef(false);
  useEffect(() => {
    if (restResumed.current) return;
    restResumed.current = true;
    const endsAt = loadRestEnd(workoutId);
    if (endsAt) runRestUntil(endsAt);
    // Once, on opening the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEffort(next: { setId: number; setNumber: number; restSec?: number; timed: boolean; hint: { weightKg?: number | null; targetReps?: string }; goal?: number }) {
    stopRest();
    if (effortRef.current) clearInterval(effortRef.current);
    const startedAt = timestampIn(0);
    setEffort({ ...next, startedAt, seconds: 0 });
    let lastTick = 0;
    effortRef.current = setInterval(() => {
      const seconds = Math.floor((timestampIn(0) - startedAt) / 1000);
      setEffort((e) => (e ? { ...e, seconds } : e));
      if (!next.goal) return;
      const left = next.goal - seconds;
      if (left > 0 && left <= 3 && left !== lastTick) {
        lastTick = left;
        if (restPrefsRef.current.sound) beep("tick");
      }
      // A timed set ends by itself: the time held is the result, and the rest follows.
      if (left <= 0) finishEffortRef.current();
    }, 250);
  }

  /** The ✕ of the timer: this set is not done, and nothing starts by itself until the next tap. */
  function cancelEffort() {
    if (effortRef.current) clearInterval(effortRef.current);
    setEffort(null);
    chainNext.current = null;
  }

  /** A timed set ready to start (the next one to do by default), or null when it is not timed. */
  function timedNext(id = currentSetId) {
    const set = sets.find((s) => s.id === id);
    if (!set?.id) return null;
    const target = targetFor(set.exerciseId);
    if (!isTimedTarget(target?.targetReps)) return null;
    const fill = prefillAll.find((f) => f.id === set.id)?.values;
    const goal = (set.reps && set.reps > 0 ? set.reps : fill?.reps) || targetSeconds(target?.targetReps) || undefined;
    return { setId: set.id, setNumber: set.setNumber, restSec: set.restSec, timed: true, hint: { targetReps: target?.targetReps }, goal };
  }

  async function finishEffort() {
    if (!effort) return;
    const { setId, restSec, timed, hint, goal, startedAt } = effort;
    // From the clock, not the last tick shown: that one may be a second behind.
    const seconds = Math.floor((timestampIn(0) - startedAt) / 1000);
    if (effortRef.current) clearInterval(effortRef.current);
    setEffort(null);
    // For a held position the time measured is the result of the set (the goal, once reached).
    const held = goal ? Math.min(seconds, goal) : seconds;
    if (timed && held > 0) await updateWorkoutSet(setId, { reps: held });
    await toggleDone(setId, false, restSec, hint);
    // A timed set that ran to its end leads to the next one by itself.
    if (timed && goal && seconds >= goal && restPrefsRef.current.autoChain) chainNext.current = setId;
  }

  function extendRest(seconds: number) {
    restEndsAt.current += seconds * 1000;
    saveRestEnd(workoutId, restEndsAt.current);
    setRest((r) => (r === null ? r : r + seconds));
    setRestTotal((r) => (r === null ? r : r + seconds));
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
          injuryRules,
          substitutes(
            exMap.get(swapFor),
            exercises.filter((e) => !groups.some(([id]) => id === e.id)),
            profile?.equipment
          ),
          injuries
        );

  /** Delete a set in 5 s, unless undone: until then it is only hidden. */
  function deleteSoon(id: number) {
    setPendingDelete((ids) => [...ids, id]);
    deleteTimers.current.set(
      id,
      setTimeout(() => {
        deleteTimers.current.delete(id);
        deleteWorkoutSet(id);
        setPendingDelete((ids) => ids.filter((x) => x !== id));
      }, 5000)
    );
  }

  function undoDelete() {
    const id = pendingDelete[pendingDelete.length - 1];
    if (id === undefined) return;
    clearTimeout(deleteTimers.current.get(id));
    deleteTimers.current.delete(id);
    setPendingDelete((ids) => ids.filter((x) => x !== id));
  }

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
    else if (restPrefs.vibrate) vibrate(60);

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

  // The timer's own tick ends the set, with the latest state of the page.
  useEffect(() => {
    finishEffortRef.current = () => void finishEffort();
  });

  // Once the rest is over (or at once, in a circuit), the next timed set starts by itself.
  useEffect(() => {
    const after = chainNext.current;
    if (after === null || rest !== null || effort) return;
    // The set just ended not yet shown as done: wait for the next render.
    if (currentSetId === after) return;
    chainNext.current = null;
    const next = timedNext();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the timer of the next set, started by the end of the rest
    if (next) startEffort(next);
  });

  if (workout?.kind === "interval") return <IntervalWorkoutView workout={workout} sets={sets ?? []} exercises={exercises} />;
  if (workout?.kind === "mobility") return <MobilityWorkoutView workout={workout} />;

  const heartRateCard =
    isBluetoothSupported() ? (
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
        ) : null;

  return (
    <>
      <PageHeader
        title={workout?.title || t("title")}
        showBack
        actions={
          <div className="flex items-center gap-1">
            {workout && !isCardio(workout) && groups.length > 0 && (
              <Button size="icon-sm" variant="ghost" aria-label={t("reuse")} onClick={() => setReusing(true)}>
                <CopyPlus className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("editWorkout")}
              onClick={() => {
                setTitleDraft(workout?.title ?? "");
                setDateDraft(workout?.date ?? "");
                setTimeDraft(workout?.startTime ?? "");
                setGoalDraft(workout?.sessionGoal ?? "");
                setEditMeta((v) => !v);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-48">
        {/* Heart-rate monitor (Web Bluetooth): after the plan of a run, before the sets of a strength session. */}
        {!(workout && isCardio(workout)) && heartRateCard}

        {editMeta && (
          <Card>
            <CardContent className="space-y-2 py-3">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder={t("title")} />
              <Input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} aria-label={t("date")} />
              <details open={!!(workout?.startTime || workout?.sessionGoal)} className="rounded-md bg-muted/40 px-2">
                <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-muted-foreground">{tp("moreDetails")}</summary>
                <div className="grid gap-2 pb-2 sm:grid-cols-[8rem_1fr]">
                  <label className="text-xs text-muted-foreground">
                    {t("startTime")}
                    <Input type="time" value={timeDraft} onChange={(e) => setTimeDraft(e.target.value)} className="mt-0.5" />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t("sessionGoal")}
                    <Input value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} placeholder={t("sessionGoalHint")} maxLength={200} className="mt-0.5" />
                  </label>
                </div>
              </details>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={async () => {
                    await updateWorkout(workoutId, {
                      title: titleDraft.trim() || undefined,
                      date: dateDraft || workout?.date,
                      startTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(timeDraft) ? timeDraft : null,
                      sessionGoal: goalDraft.trim().slice(0, 200) || null,
                    });
                    setEditMeta(false);
                  }}
                >
                  <Check className="mr-1 h-4 w-4" />
                  {t("save")}
                </Button>
                {/* Nothing done yet: it can be called off rather than deleted, and stays in the history. */}
                {!workout?.cancelledAt && !sets.some((s) => s.completed && !s.isWarmup) && !(workout && isCardioDone(workout)) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await updateWorkout(workoutId, { cancelledAt: new Date().toISOString() });
                      setEditMeta(false);
                    }}
                  >
                    <Ban className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t("cancelSession")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {t("deleteWorkout")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {workout && isCardio(workout) && (
          <>
            <CardioLogger key={workout.id} workout={workout} target={programDay?.cardio} />
            {heartRateCard}
          </>
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

        {/* Called off: kept in the history, its day still to do. */}
        {workout?.cancelledAt && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-muted p-3 text-sm" role="status">
            <span>{t("cancelledNote")}</span>
            <Button size="sm" variant="outline" onClick={() => updateWorkout(workoutId, { cancelledAt: null })}>{t("restore")}</Button>
          </div>
        )}

        {/* How it felt, once something is done, whatever the sport. */}
        {workout && !workout.cancelledAt && (sets.some((s) => s.completed && !s.isWarmup) || isCardioDone(workout)) && <SessionFeedback workout={workout} />}

        {/* What was planned beside what is done, once something is done. */}
        {workout?.plannedDay && !isCardio(workout) && sets.some((s) => s.completed && !s.isWarmup) && (
          <PlanVsDone planned={workout.plannedDay} sets={sets} exercises={exercises} />
        )}

        {prefillAll.length > 0 && groups.length > 1 && (
          <Button variant="outline" className="w-full rounded-full text-accent-text" onClick={() => applyPrefill(prefillAll)}>
            <Wand2 className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("prefillAll")}
          </Button>
        )}

        {groups.map(([exerciseId, exSets], index) => {
          const ex = exMap.get(exerciseId);
          const injuryWarn = injuryWarning(injuryRules, ex?.name, injuries);
          const comeback = returnAdjust(injuryG, injuryRules, ex?.name, injuries, workout?.date ?? localDate(), pains);
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
          const pain = workout && injuryG ? recentPainOn(pains, { uuid: ex?.uuid, name: ex?.name }, workout.date, injuryG.pain.recentDays) : undefined;
          const severePain = !!pain && !!injuryG && pain.level >= injuryG.pain.severe;
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
          // A bodyweight exercise shows no load, until one is added (a weighted pull-up).
          const bodyweight = ex?.equipment === "bodyweight" && !percentPlan && !exSets.some((x) => (x.weightKg ?? 0) > 0) && !loaded.has(exerciseId);
          // Load, reps and the tick first; the RPE and deleting are in the set's menu.
          const cols = bodyweight ? "grid-cols-[2.25rem_1fr_3rem_2.5rem]" : "grid-cols-[2.25rem_1fr_1fr_3rem_2.5rem]";
          // Done: folded to one line, reopened on demand.
          const folded = work.length > 0 && exSets.every((x) => x.completed) && !reopened.has(exerciseId) && guideOpen === false;
          return (
            <Fragment key={exerciseId}>
            <Card className={cn("t-exercise-block relative", inSuperset && "ring-2 ring-accent-500/40")}>
              {!bodyweight && !folded && <Image
                src="/images/dumbbell.webp"
                alt=""
                width={78}
                height={60}
                unoptimized
                className="pointer-events-none absolute top-1 right-11 opacity-90 dark:opacity-70"
              />}
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

                {folded ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {t(isTimedTarget(target?.targetReps) ? "doneSummaryTimed" : "doneSummary", {
                        sets: work.length,
                        reps: work.map((x) => x.reps ?? "–").join(", "),
                      })}
                      {!bodyweight && work.some((x) => x.weightKg) ? ` · ${num(Math.max(...work.map((x) => x.weightKg ?? 0)))} kg` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReopened((r) => new Set(r).add(exerciseId))}
                      className="min-h-10 shrink-0 px-2 text-sm font-medium text-accent-text"
                    >
                      {t("reopen")}
                    </button>
                  </div>
                ) : (
                <>

                {pain && (
                  <p
                    className={cn(
                      "flex items-start gap-1.5 rounded-lg p-2 text-sm",
                      severePain
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    )}
                  >
                    <Bandage className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t(severePain ? "painSevere" : "painRecent", {
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
                      weeks: injuryG?.return.loads.length ?? comeback.week,
                      percent: Math.round((1 - comeback.load) * 100),
                    })}
                    {comeback.held && ` ${tinj("returnHeld")}`}
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
                    {(demoVideo(ex?.videoUrl) ?? ex?.videoUrl) && <VideoEmbed url={(demoVideo(ex?.videoUrl) ?? ex?.videoUrl)!} />}
                    {!exerciseDescription(ex, locale) && !ex?.videoUrl && !demoVideo(ex?.videoUrl) && <p className="text-sm text-muted-foreground">{t("noGuide")}</p>}
                    <Link href={`/exercises/${exerciseId}`} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-text">
                      <History className="h-4 w-4" aria-hidden="true" />
                      {t("fullHistory")}
                    </Link>
                  </div>
                )}

                {/* Column headers */}
                <div className={cn("grid items-center gap-1.5 px-1 text-center text-xs leading-tight text-muted-foreground", cols)}>
                  <span>{t("set")}</span>
                  {!bodyweight && <span>{t("weight")}</span>}
                  <span aria-hidden="true">{isTimedTarget(target?.targetReps) ? t("secondsShort") : t("repsShort")}</span>
                  <span>{t("doneShort")}</span>
                  <span></span>
                </div>

                {exSets.filter((s) => !pendingDelete.includes(s.id!)).map((s) => (
                  <div
                    key={s.id}
                    aria-current={s.id === currentSetId ? "step" : undefined}
                    className={cn(
                      "grid items-center gap-1.5 rounded-xl px-1 py-0.5 transition-colors motion-reduce:transition-none",
                      cols,
                      // Done: tinted and dimmed; the one to do now: outlined.
                      s.completed && "bg-green-500/10 opacity-75",
                      s.id === currentSetId && "t-current-set bg-accent-500/5 ring-2 ring-accent-500/60"
                    )}
                  >
                    {s.completed && <span className="sr-only">{t("setValidated", { n: s.setNumber })}</span>}
                    {s.id === currentSetId && <span className="sr-only">{t("setCurrent")}</span>}
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg text-sm font-bold",
                        s.isWarmup
                          ? "border border-dashed border-border text-xs text-muted-foreground"
                          : "t-well bg-accent-100 text-accent-text dark:bg-accent-900/40"
                      )}
                      title={s.isWarmup ? t("warmup") : undefined}
                    >
                      {s.isWarmup ? `${t("warmupShort")}${warmups.indexOf(s) + 1}` : s.setNumber}
                    </span>
                    {!bodyweight && <NumCell large label={t("weight")} placeholder={plannedFor(s) !== undefined ? String(plannedFor(s)) : previousTop !== null ? String(suggestion ?? previousTop) : undefined} value={s.weightKg} onChange={(v) => s.id && updateWorkoutSet(s.id, { weightKg: v })} />}
                    <NumCell large label={t("reps")} placeholder={target?.targetReps} value={s.reps} onChange={(v) => s.id && updateWorkoutSet(s.id, { reps: v })} />
                    <button
                      onClick={() =>
                        s.id &&
                        toggleDone(s.id, s.completed, s.restSec, s.isWarmup ? undefined : { weightKg: plannedFor(s) ?? suggestion ?? previousTop, targetReps: target?.targetReps })
                      }
                      aria-label={tc("markDone")}
                      aria-pressed={!!s.completed}
                      className={cn(
                        "flex size-12 items-center justify-center rounded-xl border",
                        s.completed
                          ? "border-green-500 bg-green-500 text-white"
                          : "t-well border-transparent bg-accent-100 text-accent-text dark:bg-accent-900/40"
                      )}
                    >
                      <Check className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => s.id && setMenuSet(s.id)}
                      aria-label={t("setMenu", { n: s.setNumber })}
                      aria-haspopup="dialog"
                      className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                    >
                      <MoreHorizontal className="size-5" aria-hidden="true" />
                    </button>
                    {(() => {
                      // What this set was last time, to take again in one tap; only shown, nothing computed anew.
                      const before = !s.isWarmup && !s.completed ? previous[work.indexOf(s)] : undefined;
                      if (!before || !before.reps) return null;
                      const value = (before.weightKg ?? 0) > 0 ? `${num(before.weightKg!)} × ${before.reps}` : String(before.reps);
                      const same = (s.reps ?? null) === before.reps && (bodyweight || (s.weightKg ?? null) === (before.weightKg ?? null));
                      return (
                        <p className="col-span-full flex items-center gap-2 pl-11 text-xs text-muted-foreground">
                          <span>{t("lastTimeSet", { value })}</span>
                          {!same && (
                            <button
                              type="button"
                              onClick={() => s.id && updateWorkoutSet(s.id, bodyweight ? { reps: before.reps } : { weightKg: before.weightKg, reps: before.reps })}
                              aria-label={t("reuseLabel", { value, n: s.setNumber })}
                              className="min-h-9 rounded-full px-2 font-semibold text-accent-text hover:bg-accent-500/10"
                            >
                              {t("reuse")}
                            </button>
                          )}
                        </p>
                      );
                    })()}
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
                        // A timed set counts down from what is planned for it, when chaining is on.
                        goal: restPrefs.autoChain && isTimedTarget(target?.targetReps)
                          ? (nextSet.reps && nextSet.reps > 0 ? nextSet.reps : prefillAll.find((f) => f.id === nextSet.id)?.values.reps) || targetSeconds(target?.targetReps) || undefined
                          : undefined,
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
                {/* The tools used now and then, out of the way. */}
                <div className="flex items-stretch justify-center gap-1 border-t border-border/60 pt-1.5">
                  {bodyweight ? (
                    <button
                      type="button"
                      onClick={() => setLoaded((l) => new Set(l).add(exerciseId))}
                      className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      {t("addLoad")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlateWeight(last?.weightKg ?? 0)}
                      className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted"
                    >
                      <Disc3 className="h-4 w-4" aria-hidden="true" />
                      {t("platesShort")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSwapFor(exerciseId)}
                    className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted"
                  >
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                    {t("swap")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPainFor(exerciseId)}
                    className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted"
                  >
                    <Bandage className="h-4 w-4" aria-hidden="true" />
                    {tpain("reportShort")}
                  </button>
                </div>
                </>
                )}
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


        <div className="pt-2">
          <WorkoutNotes workoutId={workoutId} />
        </div>
      </div>

      {/* The session's actions, at thumb's reach: finishing first, adding an exercise next. */}
      {!typing && !summary && workout && (
        <div
          className={cn(
            "t-session-dock fixed inset-x-0 z-50 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            navHidden ? "bottom-0 border-t border-border bg-background/95 backdrop-blur" : "bottom-24"
          )}
        >
          <div className="mx-auto flex max-w-md gap-2">
            {!isCardio(workout) && (
              <Button variant="outline" className="h-12 min-w-0 shrink-0 rounded-full px-4" onClick={() => setPickerOpen(true)} aria-label={t("addExercise")}>
                <Plus className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t("exerciseShort")}</span>
              </Button>
            )}
            <Button className="h-12 min-w-0 flex-1 rounded-full px-3" onClick={finishWorkout}>
              <Check className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t("finishWorkout")}</span>
            </Button>
          </div>
        </div>
      )}

      {/* A set deleted: undone within 5 s, deleted for good after. */}
      {pendingDelete.length > 0 && (
        <div role="status" className="fixed top-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full bg-foreground py-1 pr-1 pl-4 text-sm text-background shadow-lg">
          {t("setDeleted")}
          <button type="button" onClick={undoDelete} className="min-h-10 rounded-full px-3 font-semibold underline">
            {t("undo")}
          </button>
        </div>
      )}

      {/* A set's menu: its RPE, and deleting it. */}
      {(() => {
        const set = menuSet === null ? undefined : sets?.find((x) => x.id === menuSet);
        return (
          <Dialog open={!!set} onOpenChange={(open) => !open && setMenuSet(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{set ? t("setOptions", { n: set.setNumber }) : ""}</DialogTitle>
              </DialogHeader>
              {set?.id !== undefined && (
                <div className="space-y-4">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">{t("rpe")}</span>
                    <NumCell large label={t("rpe")} value={set.rpe} onChange={(v) => updateWorkoutSet(set.id!, { rpe: v !== undefined && v >= 1 && v <= 10 ? v : undefined })} />
                  </label>
                  <Button
                    variant="outline"
                    className="h-12 w-full text-destructive"
                    onClick={() => {
                      deleteSoon(set.id!);
                      setMenuSet(null);
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("deleteSet")}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        );
      })()}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteWorkoutConfirm")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("deleteWorkoutText")}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1" onClick={() => setConfirmDelete(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              className="h-11 flex-1"
              onClick={async () => {
                setConfirmDelete(false);
                await deleteWorkout(workoutId);
                router.push("/log");
              }}
            >
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
      >
        {workout && <SessionFeedback workout={workout} />}
      </SessionSummary>

      {/* The clock full screen: a big ring, the time large enough to read from the floor. */}
      {effort && timerFull && !guided && (
        <BigTimer
          tone="effort"
          label={t("effortLabel")}
          step={t("effortOfSet", { set: effort.setNumber })}
          seconds={effort.goal ? Math.max(0, effort.goal - effort.seconds) : effort.seconds}
          progress={effort.goal ? Math.max(0, effort.goal - effort.seconds) / effort.goal : (effort.seconds % 60) / 60}
          detail={(() => {
            const set = sets?.find((x) => x.id === effort.setId);
            return set ? xl(exMap.get(set.exerciseId)?.name) : null;
          })()}
          minimizeLabel={t("timerShrink")}
          onMinimize={() => chooseTimerView(false)}
        >
          <Button variant="outline" className="h-14 rounded-full text-base" onClick={cancelEffort}>
            <X className="mr-1 h-5 w-5" aria-hidden="true" />
            {tc("cancel")}
          </Button>
          <Button className="h-14 rounded-full text-base" onClick={finishEffort}>
            <Check className="mr-1 h-5 w-5" aria-hidden="true" />
            {t("finishSet")}
          </Button>
        </BigTimer>
      )}
      {rest !== null && timerFull && !guided && (() => {
        const upNext = sets?.find((x) => x.id === currentSetId);
        return (
          <BigTimer
            tone="rest"
            label={t("restLabel")}
            seconds={rest}
            progress={restTotal ? rest / restTotal : 1}
            detail={upNext && exMap.get(upNext.exerciseId) ? t("nextUp", { exercise: xl(exMap.get(upNext.exerciseId)?.name), n: upNext.setNumber }) : null}
            minimizeLabel={t("timerShrink")}
            onMinimize={() => chooseTimerView(false)}
          >
            <Button variant="outline" className="h-14 rounded-full text-base" onClick={() => extendRest(30)}>
              +30 s
            </Button>
            <Button className="h-14 rounded-full text-base" onClick={stopRest}>
              {t("skipRest")}
            </Button>
          </BigTimer>
        );
      })()}

      {effort && (!timerFull || guided) && (
        <div role="timer" aria-label={t("effortLabel")} className={cn("t-effort-timer fixed left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full bg-success-text py-1 pr-1 pl-4 whitespace-nowrap text-background shadow-lg", barOffset)}>
          <Timer className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">{t("effortOfSet", { set: effort.setNumber })}</span>
          {/* Counting down to the goal of a timed set, up otherwise. */}
          <span className="font-mono text-lg font-semibold tabular-nums">
            {(() => {
              const s = effort.goal ? Math.max(0, effort.goal - effort.seconds) : effort.seconds;
              return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
            })()}
          </span>
          <button onClick={finishEffort} className="flex h-10 items-center rounded-full px-2 text-sm font-semibold">
            {t("finishSet")}
          </button>
          {!guided && (
            <button onClick={() => chooseTimerView(true)} aria-label={t("timerGrow")} className="flex size-10 items-center justify-center opacity-80 hover:opacity-100">
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button onClick={cancelEffort} aria-label={tc("cancel")} className="flex size-10 items-center justify-center opacity-80 hover:opacity-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Rest timer */}
      {rest !== null && (!timerFull || guided) && (() => {
        // During the rest, what comes next: the set to do now, by its exercise and number.
        const upNext = sets?.find((x) => x.id === currentSetId);
        return (
          <div role="timer" aria-label={t("restLabel")} className={cn("t-rest-timer fixed left-1/2 z-[55] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-3xl bg-primary py-1 pr-1 pl-4 text-primary-foreground shadow-lg", barOffset)}>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium">{t("restLabel")}</span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
              </span>
              <button onClick={() => extendRest(30)} className="flex h-10 items-center rounded-full px-2 text-sm font-semibold">
                +30 s
              </button>
              {!guided && (
                <button onClick={() => chooseTimerView(true)} aria-label={t("timerGrow")} className="flex size-10 items-center justify-center opacity-80 hover:opacity-100">
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button onClick={stopRest} aria-label={tc("close")} className="flex size-10 items-center justify-center opacity-80 hover:opacity-100">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {upNext && exMap.get(upNext.exerciseId) && (
              <p className="truncate pr-3 pb-1.5 text-xs opacity-90">
                {t("nextUp", { exercise: xl(exMap.get(upNext.exerciseId)?.name), n: upNext.setNumber })}
              </p>
            )}
          </div>
        );
      })()}

      {guided && groups.length > 0 && (
        <GuidedSession
          steps={guidedSteps()}
          rest={rest}
          onDone={guidedDone}
          onExtendRest={() => extendRest(30)}
          onSkipRest={stopRest}
          timer={effort?.goal ? { setId: effort.setId, left: Math.max(0, effort.goal - effort.seconds) } : null}
          onStartTimer={(id) => {
            const next = timedNext(id);
            if (next) startEffort(next);
          }}
          onStopTimer={cancelEffort}
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

      <ReuseSessionDialog open={reusing} onOpenChange={setReusing} workoutId={workoutId} title={workout?.title || t("title")} sets={sets} exercises={exercises} />

      {/* Exercise picker */}
      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title={t("selectExercise")}
        injuries={injuries}
        exclude={groups.map(([id]) => id)}
        onPick={(e) => e.id && addExercise(e.id)}
      />
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

function NumCell({ label, placeholder, value, onChange, large }: { label: string; placeholder?: string; value?: number; onChange: (v: number | undefined) => void; large?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  // Saved as it is typed (on the device), and at once when the field is left.
  const { schedule, flush } = useDebouncedSave(onChange);
  const read = (text: string) => (text === "" ? undefined : Number(text));
  // A value changed elsewhere (prefill, a tick filling the set) shows, unless the field is being typed in.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el) el.value = value === undefined || value === null ? "" : String(value);
  }, [value]);
  return (
    <input
      ref={ref}
      type="number"
      inputMode="decimal"
      defaultValue={value ?? ""}
      placeholder={placeholder}
      onInput={(e) => schedule(read(e.currentTarget.value))}
      onBlur={(e) => {
        schedule(read(e.target.value));
        flush();
      }}
      aria-label={label}
      className={cn(
        "w-full rounded-md border border-border bg-transparent px-1 text-center outline-none focus:border-accent-500 focus-visible:ring-2 focus-visible:ring-accent-500/60",
        large ? "h-14 rounded-xl text-xl font-semibold tabular-nums" : "h-11 text-base"
      )}
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
