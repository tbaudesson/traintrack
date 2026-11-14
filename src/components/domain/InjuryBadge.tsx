"use client";

import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Bandage } from "lucide-react";
import { injuryWarning, type Injury } from "@/lib/injuries";
import { cn } from "@/lib/utils";

/**
 * A pill on an exercise that loads an injured area: red "Not advised" when it
 * is better left out, amber "Caution" when it can be done lighter and without
 * pain. Nothing when it is safe.
 */
export function InjuryBadge({ exerciseName, injuries, className }: { exerciseName?: string; injuries: Injury[]; className?: string }) {
  const t = useTranslations("injuries");
  const tp = useTranslations("pain");
  const locale = useLocale();
  const warning = injuryWarning(exerciseName, injuries);
  if (!warning) return null;
  const Icon = warning.level === "avoid" ? AlertTriangle : Bandage;
  const areas = warning.areas.map((a) => (locale === "de" ? tp(`area_${a}`) : tp(`area_${a}`).toLowerCase())).join(", ");
  return (
    <span
      title={t(`${warning.level}Hint`, { areas })}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        warning.level === "avoid"
          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t(warning.level, { areas })}
    </span>
  );
}
