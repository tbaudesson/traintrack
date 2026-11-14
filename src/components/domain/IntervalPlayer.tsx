"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pause, Play, PlayCircle, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { GET_READY_SEC } from "@/lib/intervals";
import { beep } from "@/lib/beep";
import { speak, stepAnnouncement, stopSpeaking, voiceSupported } from "@/lib/voice";
import { savePrefs } from "@/lib/appTheme";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DemoDialog } from "@/components/domain/DemoDialog";

export interface IntervalResult {
  /** Indexes of the effort steps carried out to the end. */
  done: number[];
  /** Seconds actually spent, pauses left out. */
  elapsedSec: number;
}

/** What the timer plays: an exercise (or one side of it), or a rest. */
export type PlayerStep =
  | {
      type: "work";
      exercise: { name: string; sides?: boolean; cue?: string; demo?: { video: string | null; cue?: string } };
      seconds: number;
      side?: "left" | "right";
      /** An easy block (warm-up, recovery): shown green, like a rest, with the next block. */
      easy?: boolean;
      /** What the block is called above its name: "Seated", "Sprint"… */
      phase?: string;
    }
  | { type: "rest"; seconds: number; recovery?: boolean };

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/**
 * The timed session full screen: a countdown, then each effort and each rest
 * with a big clock, a beep on the last three seconds and at each start, the
 * next exercise shown during the rest, and a voice coach announcing each
 * step (it can be turned off). Pause, skip and stop at any time; what was
 * done is handed back to be saved.
 */
export function IntervalPlayer({
  session,
  onEnd,
  labels,
}: {
  session: { steps: PlayerStep[] };
  onEnd: (result: IntervalResult) => void;
  /** What an effort and a rest are called: "Stretch" and "Next" for a stretching session. */
  labels?: { work: string; rest: string; counter?: (n: number, total: number) => string };
}) {
  const t = useTranslations("intervals");
  const locale = useLocale();
  const xl = useExerciseLabel();
  const { voice } = useAppPrefs();
  const canSpeak = voiceSupported();
  const { steps } = session;
  const [index, setIndex] = useState(-1);
  const [endsAt, setEndsAt] = useState(() => Date.now() + GET_READY_SEC * 1000);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const done = useRef<number[]>([]);
  const elapsed = useRef(0);
  const ended = useRef(false);
  const lastBeep = useRef<number | null>(null);
  const [demo, setDemo] = useState<{ name: string; video: string | null; cue?: string } | null>(null);
  const pausedForDemo = useRef(false);

  /** Watching a demo pauses the clock, which starts again when it is closed. */
  function showDemo(exercise: { name: string; demo?: { video: string | null; cue?: string } }) {
    if (!exercise.demo) return;
    if (pausedLeft === null) {
      setPausedLeft(Math.max(0, endsAt - Date.now()));
      pausedForDemo.current = true;
    }
    setDemo({ name: xl(exercise.name), ...exercise.demo });
  }
  function closeDemo() {
    setDemo(null);
    if (pausedForDemo.current && pausedLeft !== null) {
      setEndsAt(Date.now() + pausedLeft);
      setNow(Date.now());
      setPausedLeft(null);
    }
    pausedForDemo.current = false;
  }

  const step = index >= 0 ? steps[index] : null;
  const length = step ? step.seconds : GET_READY_SEC;
  const leftMs = pausedLeft ?? Math.max(0, endsAt - now);
  const left = Math.ceil(leftMs / 1000);

  function finish() {
    if (ended.current) return;
    ended.current = true;
    onEnd({ done: [...done.current], elapsedSec: Math.round(elapsed.current) });
  }

  function goTo(next: number, completed: boolean) {
    if (step) elapsed.current += (length * 1000 - leftMs) / 1000;
    if (completed && step?.type === "work") done.current.push(index);
    if (next >= steps.length) return finish();
    const target = steps[next];
    beep(target.type === "work" ? "go" : "rest");
    if (target.type === "work") navigator.vibrate?.(200);
    lastBeep.current = null;
    setIndex(next);
    setEndsAt(Date.now() + target.seconds * 1000);
    if (pausedLeft !== null) setPausedLeft(target.seconds * 1000);
  }

  // The end of each phase, and the beeps of the last three seconds: checked
  // by the clock, with the latest state of the render.
  const check = useRef<() => void>(() => {});
  useEffect(() => {
    check.current = () => {
      if (pausedLeft !== null || ended.current) return;
      const ms = Math.max(0, endsAt - Date.now());
      const secs = Math.ceil(ms / 1000);
      if (ms <= 0) return goTo(index + 1, true);
      if (secs <= 3 && lastBeep.current !== secs) {
        lastBeep.current = secs;
        beep("tick");
      }
      // One side then the other: a beep halfway.
      if (step?.type === "work" && step.exercise.sides && secs === Math.ceil(step.seconds / 2) && lastBeep.current !== -secs) {
        lastBeep.current = -secs;
        beep("rest");
        navigator.vibrate?.(100);
        if (voice) speak(t("voiceSwitch"), locale);
      }
    };
  });

  // The voice coach: what starts now, said once per step.
  const spokenTime = (sec: number) => (sec >= 60 && sec % 60 === 0 ? t("voiceMinutes", { count: sec / 60 }) : t("voiceSeconds", { count: sec }));
  const announce = useRef<() => void>(() => {});
  useEffect(() => {
    announce.current = () => {
      if (!voice) return;
      speak(
        stepAnnouncement(steps, index, {
          name: xl,
          getReady: (what) => t("voiceGetReady", { what }),
          work: (what, sec) => t("voiceWork", { what, time: spokenTime(sec) }),
          side: (side) => t(side === "left" ? "leftSide" : "rightSide"),
          rest: (sec) => t("voiceRest", { time: spokenTime(sec) }),
          recovery: (sec) => t("voiceRecovery", { time: spokenTime(sec) }),
          next: (what) => t("voiceNext", { what }),
        }),
        locale
      );
    };
  });
  useEffect(() => {
    announce.current();
  }, [index]);
  useEffect(() => stopSpeaking, []);

  // The clock: a quarter of a second is enough for whole seconds.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      check.current();
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Keep the screen on: the phone lies on the floor, untouched.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        if (document.visibilityState === "visible") lock = await navigator.wakeLock?.request("screen");
      } catch {
        // Refused or unsupported: the session works without it.
      }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, []);

  const works = steps.filter((s) => s.type === "work").length;
  const workNumber = steps.slice(0, index + 1).filter((s) => s.type === "work").length;
  const next = steps.slice(index + 1).find((s) => s.type === "work");
  const remaining = Math.round(leftMs / 1000) + steps.slice(index + 1).reduce((sum, s) => sum + s.seconds, 0);
  const resting = !step || step.type === "rest" || !!step.easy;
  const share = 1 - leftMs / (length * 1000);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className={cn(
        "fixed inset-0 z-[60] flex flex-col transition-colors duration-500",
        !step ? "bg-background" : resting ? "bg-emerald-50 dark:bg-emerald-950" : "bg-accent-50 dark:bg-accent-950"
      )}
    >
      <div className="flex items-center justify-between px-5 pt-5 text-sm font-medium text-muted-foreground tabular-nums">
        <span>{labels?.counter ? labels.counter(Math.max(1, workNumber), works) : t("intervalOf", { n: Math.max(1, workNumber), total: works })}</span>
        <span className="flex items-center gap-1">
          {t("remaining", { time: clock(remaining) })}
          {canSpeak && (
            <button
              type="button"
              onClick={() => {
                if (voice) stopSpeaking();
                savePrefs({ voice: !voice });
              }}
              aria-pressed={voice}
              aria-label={t("voiceCoach")}
              className="-my-2 -mr-2 flex size-11 items-center justify-center rounded-full text-foreground hover:bg-foreground/10"
            >
              {voice ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
            </button>
          )}
        </span>
      </div>
      <div className="mx-5 mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${(Math.max(0, workNumber - (resting ? 0 : 1)) / works) * 100}%` }} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        {/* Read out at each change of step: what to do now, and on what. */}
        <div aria-live="polite" aria-atomic="true" className="flex flex-col items-center gap-4">
          <p
            className={cn(
              "text-sm font-bold tracking-[0.2em] uppercase",
              !step ? "text-muted-foreground" : resting ? "text-emerald-700 dark:text-emerald-300" : "text-accent-text"
            )}
          >
            {!step
              ? t("getReady")
              : step.type === "work"
                ? (step.phase ?? labels?.work ?? t("work"))
                : step.recovery
                  ? t("recovery")
                  : (labels?.rest ?? t("rest"))}
          </p>
          {step?.type === "work" && <h2 className="text-4xl font-bold tracking-tight">{xl(step.exercise.name)}</h2>}
        </div>

        <div className="relative flex size-64 items-center justify-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="46" fill="none" strokeWidth="5" className="stroke-foreground/10" />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 - share * 100}
              className={cn("transition-[stroke-dashoffset] duration-300", resting ? "stroke-emerald-500" : "stroke-accent-500")}
            />
          </svg>
          <p role="timer" aria-live="off" className="font-mono text-7xl font-bold tabular-nums">
            {step ? clock(left) : left}
          </p>
        </div>

        {step?.type === "work" && step.exercise.demo && (
          <button type="button" onClick={() => showDemo(step.exercise)} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-text">
            <PlayCircle className="h-5 w-5" aria-hidden="true" />
            {t("demo")}
          </button>
        )}
        {step?.type === "work" && step.side && <p className="text-base font-semibold">{t(step.side === "left" ? "leftSide" : "rightSide")}</p>}
        {step?.type === "work" && step.exercise.cue && <p className="max-w-sm text-sm text-muted-foreground">{step.exercise.cue}</p>}
        {step?.type === "work" && step.exercise.sides && <p className="text-sm font-medium text-muted-foreground">{t("switchSides")}</p>}
        {resting && next?.type === "work" && (
          <p className="text-base text-muted-foreground">
            {t("next")} <span className="font-semibold text-foreground">{xl(next.exercise.name)}</span>
            {next.side && ` · ${t(next.side === "left" ? "leftSide" : "rightSide")}`}
          </p>
        )}
        {resting && next?.type === "work" && next.exercise.demo && (
          <button type="button" onClick={() => showDemo(next.exercise)} className="flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-text">
            <PlayCircle className="h-5 w-5" aria-hidden="true" />
            {t("demo")}
          </button>
        )}
      </div>

      <DemoDialog demo={demo} onClose={closeDemo} />

      <div className="grid grid-cols-3 gap-3 px-5 pb-8">
        <Button variant="outline" size="lg" className="h-14 rounded-2xl" onClick={finish} aria-label={t("stop")}>
          <Square className="h-5 w-5" aria-hidden="true" />
        </Button>
        <Button
          size="lg"
          className="h-14 rounded-2xl"
          aria-label={pausedLeft !== null ? t("resume") : t("pause")}
          onClick={() => {
            if (pausedLeft !== null) {
              setEndsAt(Date.now() + pausedLeft);
              setNow(Date.now());
              setPausedLeft(null);
            } else {
              setPausedLeft(Math.max(0, endsAt - Date.now()));
            }
          }}
        >
          {pausedLeft !== null ? <Play className="h-6 w-6" aria-hidden="true" /> : <Pause className="h-6 w-6" aria-hidden="true" />}
        </Button>
        <Button variant="outline" size="lg" className="h-14 rounded-2xl" onClick={() => goTo(index + 1, false)} aria-label={t("skip")}>
          <SkipForward className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
