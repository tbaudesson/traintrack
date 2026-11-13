"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Timer, Trophy, X } from "lucide-react";
import { guidedCursor } from "@/lib/guided";
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
}: {
  steps: GuidedStep[];
  rest: number | null;
  onDone: (id: number, values: { weightKg?: number; reps?: number; rpe?: number }) => Promise<void>;
  onExtendRest: () => void;
  onSkipRest: () => void;
  onFinish: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("guided");
  const [chosen, setChosen] = useState<number | null>(null);
  const order = steps.map((s) => s.id);
  const completed = new Set(steps.filter((s) => s.completed).map((s) => s.id));
  const cursor = guidedCursor(order, completed, chosen);
  const index = cursor === null ? -1 : order.indexOf(cursor);
  const current = index >= 0 ? steps[index] : null;
  const next = steps.slice(index + 1).find((s) => !s.completed);

  return (
    <div role="dialog" aria-modal="true" aria-label={t("title")} className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <p className="flex-1 text-sm font-medium text-muted-foreground tabular-nums">
          {t("progress", { done: completed.size, total: steps.length })}
        </p>
        <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-11 items-center justify-center rounded-full hover:bg-muted">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="h-1 bg-muted">
        <div className="h-full bg-accent-500 transition-all" style={{ width: `${(completed.size / Math.max(1, steps.length)) * 100}%` }} />
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
}: {
  step: GuidedStep;
  onDone: (values: { weightKg?: number; reps?: number; rpe?: number }) => Promise<void>;
  nextLabel: string;
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
        <h2 className="text-3xl font-bold tracking-tight">{step.exerciseName}</h2>
        {step.target && <p className="text-sm text-muted-foreground">{step.target}</p>}
        {step.advice && <p className="text-sm font-medium text-success-text">{step.advice}</p>}
        {step.completed && <p className="text-sm font-medium text-success-text">{t("alreadyDone")}</p>}
      </div>

      {!step.timed && (
        <Stepper label={t("weight")} unit="kg" value={weight} step={step.step} onChange={setWeight} />
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
                rpe === n ? "border-accent-500 bg-accent-500 text-white" : "border-border text-muted-foreground"
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
        <button type="button" onClick={() => set(value - step)} aria-label={`${label} −${step}`} className="t-well flex size-16 shrink-0 items-center justify-center rounded-2xl">
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
            className="w-full bg-transparent text-center text-5xl font-bold tabular-nums outline-none"
          />
          {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
        </label>
        <button type="button" onClick={() => set(value + step)} aria-label={`${label} +${step}`} className="t-well flex size-16 shrink-0 items-center justify-center rounded-2xl">
          <Plus className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
