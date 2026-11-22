"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Timer } from "lucide-react";
import type { ProgramDay } from "@/db";
import { dayMinutes, expressCardio, expressDay } from "@/lib/express";
import { describeTarget } from "@/lib/cardio";
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
  onMove,
  cardioFull,
}: {
  day: ProgramDay;
  /** An endurance day: the minutes it takes (its time, or its distance at one's usual speed). */
  cardioFull?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (day: ProgramDay) => void;
  /** No time at all today: the session moved to another day instead. */
  onMove?: () => void;
}) {
  const t = useTranslations("express");
  const xl = useExerciseLabel();
  const tc = useTranslations("cardio");
  const endurance = !!day.cardio && !!cardioFull;
  const full = endurance ? cardioFull! : dayMinutes(day);
  const choices = CHOICES.filter((m) => m < full);
  // Twenty minutes stays the first offer when the session allows it.
  const preferred = choices.find((m) => m >= 20) ?? choices[0] ?? CHOICES[0];
  const [minutes, setMinutes] = useState(preferred);
  const shown = choices.includes(minutes) ? minutes : preferred;
  const plan = endurance ? { day: expressCardio(day, full, shown).day, dropped: [] as string[] } : expressDay(day, shown);
  const stepsDropped = endurance && !!day.cardio?.steps?.length;

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
        {endurance && plan.day.cardio && (
          <div className="space-y-1 rounded-xl bg-muted/50 p-3 text-sm">
            <p className="font-semibold">{tc(`sport_${plan.day.cardio.sport}`)} · {describeTarget(plan.day.cardio)}</p>
            {!!plan.day.cardio.blocks?.length && <p className="text-xs text-muted-foreground">{t("blocksShortened", { count: plan.day.cardio.blocks.length })}</p>}
            {stepsDropped && <p className="text-xs text-muted-foreground">{t("stepsDropped")}</p>}
          </div>
        )}
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
        <p className="text-xs text-muted-foreground">{endurance ? t("aboutCardio") : t("about", { minutes: dayMinutes(plan.day) })}</p>
        <Button size="lg" className="w-full rounded-full" onClick={() => onStart(plan.day)}>
          {t("start")}
        </Button>
        {onMove && (
          <Button variant="ghost" className="w-full" onClick={onMove}>
            {t("notToday")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
