"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Timer } from "lucide-react";
import type { ProgramDay } from "@/db";
import { dayMinutes, expressDay } from "@/lib/express";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// 15 min too: a session of half an hour still gets a real choice (15 or 20).
const CHOICES = [15, 20, 30, 45];

/**
 * The session of the day in less time: the minutes there are, and what is
 * kept, paired or left out. It still counts as the planned session.
 */
export function ExpressDialog({
  day,
  open,
  onOpenChange,
  onStart,
}: {
  day: ProgramDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (day: ProgramDay) => void;
}) {
  const t = useTranslations("express");
  const xl = useExerciseLabel();
  const full = dayMinutes(day);
  const choices = CHOICES.filter((m) => m < full);
  // Twenty minutes stays the first offer when the session allows it.
  const preferred = choices.find((m) => m >= 20) ?? choices[0] ?? CHOICES[0];
  const [minutes, setMinutes] = useState(preferred);
  const shown = choices.includes(minutes) ? minutes : preferred;
  const plan = expressDay(day, shown);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-accent-text" aria-hidden="true" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("intro", { minutes: full })}</p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t("time")}>
          {choices.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={m === shown}
              onClick={() => setMinutes(m)}
              className={cn("min-h-11 rounded-xl text-sm font-semibold", m === shown ? "bg-accent-600 text-white" : "bg-muted text-foreground")}
            >
              {t("minutes", { minutes: m })}
            </button>
          ))}
        </div>
        <ul className="space-y-1 text-sm">
          {plan.day.exercises.map((e, i) => (
            <li key={`${e.exerciseName}-${i}`} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">
                {xl(e.exerciseName)}
                {(e.supersetWithNext || plan.day.exercises[i - 1]?.supersetWithNext) && (
                  <span className="ml-1.5 rounded bg-accent-500/15 px-1 text-xs font-semibold text-accent-text">{t("superset")}</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {e.targetSets} × {e.targetReps}
              </span>
            </li>
          ))}
        </ul>
        {plan.dropped.length > 0 && <p className="text-xs text-muted-foreground">{t("dropped", { names: plan.dropped.map(xl).join(", ") })}</p>}
        <p className="text-xs text-muted-foreground">{t("about", { minutes: dayMinutes(plan.day) })}</p>
        <Button size="lg" className="w-full rounded-full" onClick={() => onStart(plan.day)}>
          {t("start")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
