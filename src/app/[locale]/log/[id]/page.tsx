"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useWorkout, useWorkouts, updateWorkout, deleteWorkout } from "@/hooks/useWorkouts";
import { useWorkoutSets, useAllWorkoutSets, addWorkoutSet, updateWorkoutSet, deleteWorkoutSet } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { usePrograms } from "@/hooks/usePrograms";
import { findWorkoutProgramDay } from "@/lib/startWorkout";
import { VideoEmbed } from "@/components/domain/VideoEmbed";
import { PlateCalculator } from "@/components/domain/PlateCalculator";
import { CardioLogger } from "@/components/domain/CardioLogger";
import { formatDistance, formatDuration, formatPace, isCardio, isCardioDone, newCardioRecords } from "@/lib/cardio";
import { SessionSummary, type SessionSummaryData } from "@/components/domain/SessionSummary";
import db from "@/db";
import {
  beatsRecord, bestLifts, elapsedMinutes, lastPerformance, recordHistory, suggestWeight, topWeight, totalVolume,
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
import { Plus, Check, Trash2, Timer, X, Dumbbell, Pencil, Heart, HeartPulse, ChevronDown, Target, History, TrendingUp, Trophy, Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkoutNotes } from "@/components/domain/WorkoutNotes";
import { connectHeartRate, isBluetoothSupported, type HeartRateMonitor } from "@/lib/bleHeartRate";
import { EmptyState } from "@/components/ui/page-parts";

export default function SessionLoggerPage() {
  const t = useTranslations("log");
  const tc = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const workoutId = Number(params.id);
  const workout = useWorkout(workoutId);
  const sets = useWorkoutSets(workoutId);
  const exercises = useExercises();
  const programs = usePrograms();
  const allWorkouts = useWorkouts();
  const allSets = useAllWorkoutSets();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [openGuide, setOpenGuide] = useState<number | null>(null);
  const [plateWeight, setPlateWeight] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState<{ exercise: string; weightKg: number; reps: number } | null>(null);
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);
  const [rest, setRest] = useState<number | null>(null);
  const [editMeta, setEditMeta] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    const done = sets.filter((s) => s.completed);
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
        .map((r) => ({ exercise: exMap.get(exerciseId)?.name ?? "?", weightKg: r.weightKg, reps: r.reps }))
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
    const endsAt = Date.now() + seconds * 1000;
    timerRef.current = setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      if (left > 0) {
        setRest(left);
        return;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setRest(null);
      navigator.vibrate?.([300, 120, 300]);
    }, 500);
  }

  function nextWeightFor(exerciseId: number) {
    return topWeight(lastPerformance(exerciseId, workout, allWorkouts, allSets)) ?? undefined;
  }

  async function addExercise(exerciseId: number) {
    await addWorkoutSet({ workoutId, exerciseId, setNumber: 1, weightKg: nextWeightFor(exerciseId), completed: false });
    setPickerOpen(false);
  }

  async function addSet(exerciseId: number, lastSetNumber: number, weightKg?: number) {
    await addWorkoutSet({ workoutId, exerciseId, setNumber: lastSetNumber + 1, weightKg, completed: false });
  }

  async function toggleDone(setId: number, completed: boolean, restSec?: number) {
    await updateWorkoutSet(setId, { completed: !completed });
    if (completed) return;
    startRest(restSec && restSec > 0 ? restSec : 90);

    // Read back: the weight typed just before this tap may not be in `sets` yet.
    const saved = await db.workoutSets.get(setId);
    if (!saved || !workout) return;
    const others = allSets.filter((s) => s.id !== setId);
    if (beatsRecord(saved, workout, allWorkouts, others)) {
      setNewRecord({ exercise: exMap.get(saved.exerciseId)?.name ?? "?", weightKg: saved.weightKg!, reps: saved.reps! });
      navigator.vibrate?.(150);
      setTimeout(() => setNewRecord(null), 4500);
    }
  }

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

        {workout && !isCardio(workout) && groups.length === 0 && (
          <EmptyState icon={Dumbbell} title={t("noExercises")} />
        )}

        {groups.map(([exerciseId, exSets]) => {
          const ex = exMap.get(exerciseId);
          const last = exSets[exSets.length - 1];
          const target = programDay?.exercises.find(
            (pe) => (pe.exerciseUuid && pe.exerciseUuid === ex?.uuid) || pe.exerciseName.toLowerCase() === ex?.name.toLowerCase()
          );
          const guideOpen = openGuide === exerciseId;
          const previous = lastPerformance(exerciseId, workout, allWorkouts, allSets);
          const previousTop = topWeight(previous);
          const suggestion = target ? suggestWeight(previous, target.targetSets, target.targetReps) : null;
          const best = bestLifts(exerciseId, allSets);
          const records = recordHistory(exerciseId, allWorkouts, allSets).slice(-5).reverse();
          return (
            <Card key={exerciseId} className="relative">
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
                    <span className="min-w-0 flex-1">{ex?.name ?? "?"}</span>
                    <ChevronDown
                      className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", guideOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                </h3>

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
                    {t("lastTime", { value: formatPerformance(previous) })}
                  </p>
                )}

                {suggestion !== null && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-success-text">
                    <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("suggestion", { kg: suggestion })}
                  </p>
                )}

                {guideOpen && (
                  <div className="space-y-2 rounded-xl bg-muted/50 p-3">
                    {best && (
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Trophy className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                        {t("bestLifts", { kg: best.weightKg, max: Math.round(best.oneRepMax) })}
                      </p>
                    )}
                    {records.length > 0 && (
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {records.map((r, i) => (
                          <li key={i}>{r.date} · {r.weightKg} kg × {r.reps}</li>
                        ))}
                      </ul>
                    )}
                    {ex?.description && <p className="text-sm text-muted-foreground">{ex.description}</p>}
                    {ex?.videoUrl && <VideoEmbed url={ex.videoUrl} />}
                    {!ex?.description && !ex?.videoUrl && <p className="text-sm text-muted-foreground">{t("noGuide")}</p>}
                  </div>
                )}

                {/* Column headers */}
                <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem_2.5rem] items-center gap-1.5 px-1 text-center text-xs leading-tight text-muted-foreground">
                  <span>{t("set")}</span>
                  <span>{t("weight")}</span>
                  <span aria-hidden="true">{t("repsShort")}</span>
                  <span>{t("rpe")}</span>
                  <span></span>
                  <span></span>
                </div>

                {exSets.map((s) => (
                  <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem_2.5rem] items-center gap-1.5">
                    <span className="t-well flex size-8 items-center justify-center rounded-lg bg-accent-100 text-sm font-bold text-accent-text dark:bg-accent-900/40">{s.setNumber}</span>
                    <NumCell label={t("weight")} placeholder={previousTop !== null ? String(suggestion ?? previousTop) : undefined} value={s.weightKg} onChange={(v) => s.id && updateWorkoutSet(s.id, { weightKg: v })} />
                    <NumCell label={t("reps")} placeholder={target?.targetReps} value={s.reps} onChange={(v) => s.id && updateWorkoutSet(s.id, { reps: v })} />
                    <NumCell label={t("rpe")} value={s.rpe} onChange={(v) => s.id && updateWorkoutSet(s.id, { rpe: v })} />
                    <button
                      onClick={() => s.id && toggleDone(s.id, s.completed, s.restSec)}
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

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full text-accent-text"
                  onClick={() => addSet(exerciseId, last?.setNumber ?? 0, last?.weightKg)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t("addSet")}
                </Button>
                <button
                  type="button"
                  onClick={() => setPlateWeight(last?.weightKg ?? 0)}
                  className="flex min-h-10 w-full items-center justify-center gap-1.5 text-sm text-muted-foreground"
                >
                  <Disc3 className="h-4 w-4" aria-hidden="true" />
                  {t("plates")}
                </button>
              </CardContent>
            </Card>
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
            <p className="truncate text-sm text-muted-foreground">{newRecord.exercise} · {newRecord.weightKg} kg × {newRecord.reps}</p>
          </div>
        </div>
      )}

      {plateWeight !== null && (
        <PlateCalculator open onOpenChange={() => setPlateWeight(null)} initialWeight={plateWeight || undefined} />
      )}

      <SessionSummary data={summary} onClose={() => router.push("/log")} />

      {/* Rest timer */}
      {rest !== null && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-accent-600 px-5 py-2.5 text-white shadow-lg">
          <Timer className="h-4 w-4" />
          <span className="font-mono text-lg font-semibold tabular-nums">
            {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
          </span>
          <button onClick={() => setRest(null)} aria-label={tc("close")} className="flex size-10 items-center justify-center opacity-80 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
                {e.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "60 kg × 8, 8, 7", or "60×8, 62.5×7 kg" when the weight changed. */
function formatPerformance(sets: { weightKg?: number; reps?: number }[]) {
  const weights = new Set(sets.map((s) => s.weightKg ?? 0));
  const reps = sets.map((s) => s.reps).join(", ");
  if (weights.size === 1) {
    const [weight] = weights;
    return weight > 0 ? `${weight} kg × ${reps}` : reps;
  }
  return `${sets.map((s) => `${s.weightKg ?? 0}×${s.reps}`).join(", ")} kg`;
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
