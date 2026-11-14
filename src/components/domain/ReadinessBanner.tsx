"use client";

import { useTranslations } from "next-intl";
import { BatteryLow } from "lucide-react";
import { LOW_READINESS } from "@/lib/readinessAdjust";

/**
 * On a day of low form, says that today's session starts lighter — fewer sets,
 * loads a tenth lighter — and lets the athlete keep it normal instead.
 */
export function ReadinessBanner({ readiness, keptNormal, onKeep }: { readiness: number | null; keptNormal: boolean; onKeep: (keep: boolean) => void }) {
  const t = useTranslations("readinessAdjust");
  if (readiness === null || readiness >= LOW_READINESS) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
      <BatteryLow className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <p className="font-semibold">{t(keptNormal ? "keptTitle" : "title", { score: readiness })}</p>
        <p>{t(keptNormal ? "keptText" : "text")}</p>
        <button type="button" onClick={() => onKeep(!keptNormal)} className="min-h-9 font-semibold underline">
          {t(keptNormal ? "lighten" : "keep")}
        </button>
      </div>
    </div>
  );
}
