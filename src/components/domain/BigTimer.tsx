"use client";

import type { ReactNode } from "react";
import { Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE = 280;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** "1:05" from seconds. */
export const clockOf = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;

/**
 * A session's clock full screen: a big ring that empties as the time runs
 * (or fills, for a set counted up), the time in the middle, large enough to
 * read from the floor, what comes next under it, and big buttons. It can be
 * shrunk back to the small bar at any time.
 */
export function BigTimer({
  tone,
  label,
  step,
  seconds,
  progress,
  detail,
  minimizeLabel,
  onMinimize,
  children,
}: {
  tone: "rest" | "effort";
  label: string;
  /** Which set or step this is ("Set 2"), under the label. */
  step?: string | null;
  /** The time shown, in seconds. */
  seconds: number;
  /** 0 to 1: how much of the ring is drawn. */
  progress: number;
  /** What comes next, or the set being done. */
  detail?: string | null;
  minimizeLabel: string;
  onMinimize: () => void;
  /** The actions: +30 s, skip, finish… */
  children: ReactNode;
}) {
  const shown = Math.min(1, Math.max(0, progress));
  const ending = tone === "rest" && seconds <= 3;
  return (
    <div
      role="timer"
      aria-label={label}
      className={cn(
        "fixed inset-0 z-[60] flex flex-col items-center justify-between px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]",
        tone === "rest" ? "bg-background" : "bg-emerald-50 dark:bg-emerald-950"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
          {step && <p className="text-lg font-semibold">{step}</p>}
        </div>
        <button type="button" onClick={onMinimize} aria-label={minimizeLabel} className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted">
          <Minimize2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="relative grid place-items-center" style={{ width: "min(80vw, 340px)", aspectRatio: "1" }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-muted" />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - shown)}
            className={cn(
              "transition-[stroke-dashoffset] duration-500 ease-linear motion-reduce:transition-none",
              tone === "rest" ? (ending ? "stroke-amber-500" : "stroke-accent-500") : "stroke-emerald-600 dark:stroke-emerald-400"
            )}
          />
        </svg>
        <span className={cn("font-mono text-7xl font-bold tabular-nums sm:text-8xl", ending && "text-amber-600 dark:text-amber-400")}>{clockOf(seconds)}</span>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {detail && <p className="text-center text-base font-medium">{detail}</p>}
        <div className="grid grid-cols-2 gap-3">{children}</div>
      </div>
    </div>
  );
}
