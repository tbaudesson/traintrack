"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Minus, Play, Plus, Timer, Trophy, X } from "lucide-react";
import { guidedCursor } from "@/lib/guided";
import { useSessionFocus } from "@/hooks/useSessionFocus";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface GuidedStep {
  id: number;
  completed: boolean;
  exerciseName: string;
  /** "Set 2 of 3", "Warm-up 1". */
  label: string;
  /** "8-10 reps · rest 90 s", the program's line. */
  target?: string;
  /** The advice for the load, when there is one. */
  advice?: string;
  timed: boolean;
  /** What the boxes start with: what was typed, else the suggestions. */
  weightKg?: number;
  reps?: number;
  rpe?: number;
  step: number;
}

/**
 * The session one set at a time, full screen, for the gym: big steppers for
 * the weight and the reps, the RPE in one tap, "Set done" to save and rest,
 * then on to the next set. Built on the same handlers as the session page.
 */
export function GuidedSession({
  steps,
  rest,
  onDone,
  onExtendRest,
  onSkipRest,
  onFinish,
  onClose,
  timer = null,
  onStartTimer,
  onStopTimer,
}: {
  steps: GuidedStep[];
  rest: number | null;
  onDone: (id: number, values: { weightKg?: number; reps?: number; rpe?: number }) => Promise<void>;
  onExtendRest: () => void;
  onSkipRest: () => void;
  onFinish: () => void;
  onClose: () => void;
  /** The countdown of a timed set under way: it ends the set by itself. */
  timer?: { setId: number; left: number } | null;
  onStartTimer?: (id: number) => void;
  onStopTimer?: () => void;
}) {
  const t = useTranslations("guided");
  useSessionFocus(true);
  const [chosen, setChosen] = useState<number | null>(null);
  const order = steps.map((s) => s.id);
  const completed = new Set(steps.filter((s) => s.completed).map((s) => s.id));
  const cursor = guidedCursor(order, completed, chosen);
  const index = cursor === null ? -1 : order.indexOf(cursor);
  const current = index >= 0 ? steps[index] : null;
  const next = steps.slice(index + 1).find((s) => !s.completed);

  // A modal for the keyboard too: focus comes in on opening, Tab stays inside,
  // Escape leaves guided mode, and focus goes back to what opened it.
  const shellRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    shell.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...shell.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])")].filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (active === shell || !shell.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div ref={shellRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("title")} className="t-guided-shell fixed inset-0 z-[60] flex flex-col bg-background outline-none">
      <div className="t-guided-header flex items-center gap-2 border-b border-border px-4 py-3">
        <p aria-live="polite" className="flex-1 text-sm font-medium text-muted-foreground tabular-nums">
          {t("progress", { done: completed.size, total: steps.length })}
        </p>
        <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-11 items-center justify-center rounded-full hover:bg-muted">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="h-1 bg-black/30">
        <div className="t-guided-progress h-full transition-all motion-reduce:transition-none" style={{ width: `${(completed.size / Math.max(1, steps.length)) * 100}%` }} />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-5 py-6">
        {rest !== null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <Timer className="h-8 w-8 text-accent-text" aria-hidden="true" />
            <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">{t("rest")}</p>
            <p role="timer" className="font-mono text-7xl font-bold tabular-nums">
              {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={onExtendRest}>+30 s</Button>
              <Button size="lg" onClick={onSkipRest}>{t("skipRest")}</Button>
            </div>
            {current && <p className="text-sm text-muted-foreground">{t("upNext", { name: current.exerciseName, label: current.label })}</p>}
          </div>
        ) : current ? (
          <StepView
            key={current.id}
            step={current}
            onDone={async (values) => {
              await onDone(current.id, values);
              setChosen(null);
            }}
            nextLabel={next ? t("upNext", { name: next.exerciseName, label: next.label }) : t("lastSet")}
            left={timer?.setId === current.id ? timer.left : null}
            onStartTimer={onStartTimer && current.timed && !current.completed ? () => onStartTimer(current.id) : undefined}
            onStopTimer={onStopTimer}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <Trophy className="h-12 w-12 text-accent-text" aria-hidden="true" />
            <p className="text-2xl font-bold">{t("allDone")}</p>
            <Button size="lg" onClick={onFinish}>{t("finish")}</Button>
          </div>
        )}
      </div>

      {rest === null && current && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => setChosen(order[index - 1])}
            className="flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t("previous")}
          </button>
          <button
            type="button"
            disabled={index >= order.length - 1}
            onClick={() => setChosen(order[index + 1])}
            className="flex min-h-11 items-center gap-1 px-2 text-sm text-muted-foreground disabled:opacity-30"
          >
            {t("skip")}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

function StepView({
  step,
  onDone,
  nextLabel,
  left = null,
  onStartTimer,
  onStopTimer,
}: {
  step: GuidedStep;
  onDone: (values: { weightKg?: number; reps?: number; rpe?: number }) => Promise<void>;
  nextLabel: string;
  /** Seconds left of this set's countdown, when it runs. */
  left?: number | null;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
}) {
  const t = useTranslations("guided");
  const [weight, setWeight] = useState(step.weightKg ?? 0);
  const [reps, setReps] = useState(step.reps ?? 0);
  const [rpe, setRpe] = useState<number | undefined>(step.rpe);
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold tracking-wide text-accent-text uppercase">{step.label}</p>
        <h2 className="t-display text-4xl md:text-5xl">{step.exerciseName}</h2>
        {step.target && <p className="text-sm text-muted-foreground">{step.target}</p>}
        {step.advice && <p className="text-sm font-medium text-success-text">{step.advice}</p>}
        {step.completed && <p className="text-sm font-medium text-success-text">{t("alreadyDone")}</p>}
      </div>

      {!step.timed && (
        <Stepper label={t("weight")} unit="kg" value={weight} step={step.step} onChange={setWeight} />
      )}
      {/* A timed set: a countdown that ends the set by itself, the rest and the next set following. */}
      {left !== null ? (
        <div role="timer" aria-label={t("timerLabel")} className="space-y-2 text-center">
          <p className="t-display font-mono text-7xl tabular-nums">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </p>
          <Button variant="outline" onClick={onStopTimer}>
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("stopTimer")}
          </Button>
        </div>
      ) : (
        onStartTimer && (
          <Button size="lg" variant="outline" className="h-14 w-full rounded-2xl text-base" onClick={onStartTimer}>
            <Play className="mr-2 h-5 w-5" aria-hidden="true" />
            {t("startTimer", { seconds: reps })}
          </Button>
        )
      )}
      <Stepper label={step.timed ? t("seconds") : t("reps")} value={reps} step={step.timed ? 5 : 1} onChange={setReps} />

      <div className="space-y-2">
        <p className="text-center text-sm font-medium">{t("rpe")}</p>
        <div className="grid grid-cols-5 gap-2">
          {[6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRpe(rpe === n ? undefined : n)}
              aria-pressed={rpe === n}
              className={cn(
                "h-12 rounded-xl border text-lg font-semibold",
                rpe === n ? "border-accent-600 bg-accent-600 text-white" : "border-border text-muted-foreground"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <Button
          size="lg"
          className="h-16 w-full rounded-2xl text-lg"
          disabled={saving || reps <= 0}
          onClick={async () => {
            setSaving(true);
            try {
              await onDone({ weightKg: step.timed ? undefined : weight || undefined, reps, rpe });
            } finally {
              setSaving(false);
            }
          }}
        >
          <Check className="mr-2 h-6 w-6" aria-hidden="true" />
          {t("done")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{nextLabel}</p>
      </div>
    </div>
  );
}

function Stepper({ label, unit, value, step, onChange }: { label: string; unit?: string; value: number; step: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.round(v * 100) / 100));
  return (
    <div className="space-y-1.5">
      <p className="text-center text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => set(value - step)} aria-label={`${label} -${step}`} className="t-guided-control t-well flex size-16 shrink-0 items-center justify-center rounded-2xl">
          <Minus className="h-6 w-6" aria-hidden="true" />
        </button>
        <label className="flex flex-1 items-baseline justify-center gap-1">
          <input
            type="number"
            inputMode="decimal"
            value={value || ""}
            placeholder="0"
            onChange={(e) => set(Number(e.target.value.replace(",", ".")) || 0)}
            aria-label={label}
            className="w-full rounded-xl bg-transparent text-center text-5xl font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60"
          />
          {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
        </label>
        <button type="button" onClick={() => set(value + step)} aria-label={`${label} +${step}`} className="t-guided-control t-well flex size-16 shrink-0 items-center justify-center rounded-2xl">
          <Plus className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
