"use client";

import { useTranslations } from "next-intl";
import { CircleCheck, CircleDashed, CirclePlus, CircleSlash } from "lucide-react";
import type { ProgramDay } from "@/db";
import { planVsDone, type PlanLine } from "@/lib/planSnapshot";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICON: Record<PlanLine["status"], typeof CircleCheck> = { asPlanned: CircleCheck, changed: CircleDashed, added: CirclePlus, skipped: CircleSlash };
const TONE: Record<PlanLine["status"], string> = {
  asPlanned: "text-emerald-600 dark:text-emerald-400",
  changed: "text-amber-600 dark:text-amber-400",
  added: "text-accent-text",
  skipped: "text-muted-foreground",
};

/**
 * The session beside its plan, as the plan was when it started (kept with the
 * session): each exercise planned, as planned, changed or not done, and those
 * added on the way. The program can change since; this does not.
 */
export function PlanVsDone({
  planned,
  sets,
  exercises,
  className,
}: {
  planned: ProgramDay;
  sets: Parameters<typeof planVsDone>[1];
  exercises: Parameters<typeof planVsDone>[2];
  className?: string;
}) {
  const t = useTranslations("planVsDone");
  const xl = useExerciseLabel();
  const { num } = useFormat();
  const lines = planVsDone(planned, sets, exercises);
  if (!lines.length) return null;
  const counts = { asPlanned: 0, changed: 0, added: 0, skipped: 0 };
  for (const l of lines) counts[l.status]++;

  return (
    <details className={cn("t-panel rounded-xl px-4 py-1", className)}>
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 text-sm font-semibold">
        {t("title")}
        <span className="text-xs font-normal text-muted-foreground">
          {(["asPlanned", "changed", "skipped", "added"] as const)
            .filter((k) => counts[k])
            .map((k) => t(`count_${k}`, { count: counts[k] }))
            .join(" · ")}
        </span>
      </summary>
      <p className="pb-2 text-xs text-muted-foreground">{t("hint")}</p>
      <ul className="space-y-2 pb-3">
        {lines.map((l, i) => {
          const Icon = ICON[l.status];
          return (
            <li key={`${l.name}-${i}`} className="flex items-start gap-2 text-sm">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONE[l.status])} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {xl(l.name)} <span className={cn("text-xs font-normal", TONE[l.status])}>· {t(`status_${l.status}`)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.planned ? t("planned", { sets: l.planned.sets, reps: l.planned.reps }) : t("notPlanned")}
                  {" → "}
                  {l.done
                    ? t("done", { sets: l.done.sets, reps: l.done.reps.join(", ") }) + (l.done.topKg ? ` · ${num(l.done.topKg)} kg` : "")
                    : t("notDone")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
