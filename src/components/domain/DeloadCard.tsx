"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BatteryLow } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { DeloadAdvice } from "@/lib/deload";
import { updateTrainingSchedule } from "@/hooks/useAthleteProfile";
import { Button } from "@/components/ui/button";

const KEY = "traintrack-deload-later";

function laterFor(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * The deload week on the home screen: suggested with its reason, or running
 * this week with a way to call it off. "Later" hides it until next week, on
 * this device only.
 */
export function DeloadCard({
  advice,
  monday,
  active,
  hasProfile,
}: {
  advice: DeloadAdvice | null;
  monday: string;
  active: boolean;
  hasProfile: boolean;
}) {
  const t = useTranslations("deload");
  const [later, setLater] = useState(laterFor);

  if (active) {
    return (
      <section className="t-surface flex items-start gap-3 rounded-2xl p-4 ring-1 ring-foreground/5">
        <BatteryLow className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold">{t("activeTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("activeText")}</p>
        </div>
        <button
          type="button"
          onClick={() => updateTrainingSchedule({ deloadWeek: null })}
          className="min-h-10 shrink-0 px-1 text-sm font-medium text-muted-foreground underline"
        >
          {t("cancel")}
        </button>
      </section>
    );
  }

  if (!advice || later === monday) return null;
  const reason =
    advice.reason === "weeks" ? t("reasonWeeks", { weeks: advice.weeks })
    : advice.reason === "rpe" ? t("reasonRpe", { rpe: advice.rpe ?? 0 })
    : t("reasonReadiness", { score: advice.readiness ?? 0 });

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-amber-500/40">
      <div className="flex items-start gap-3">
        <BatteryLow className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{t("title")}</p>
          <p className="text-sm text-muted-foreground">{reason} {t("what")}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {hasProfile ? (
          <Button className="flex-1" onClick={() => updateTrainingSchedule({ deloadWeek: monday })}>
            {t("activate")}
          </Button>
        ) : (
          <Link href="/onboarding" className="flex-1">
            <Button className="w-full">{t("needProfile")}</Button>
          </Link>
        )}
        <Button
          variant="outline"
          onClick={() => {
            try {
              window.localStorage.setItem(KEY, monday);
            } catch {
              // Private browsing: it simply shows again next time.
            }
            setLater(monday);
          }}
        >
          {t("later")}
        </Button>
      </div>
    </section>
  );
}
