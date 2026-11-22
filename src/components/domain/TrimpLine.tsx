"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { HeartPulse } from "lucide-react";
import type { Workout } from "@/db";
import { useAllHealth } from "@/hooks/useHealth";
import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useWorkouts } from "@/hooks/useWorkouts";
import { maxHrForAge, trimp } from "@/lib/recovery";

const DEFAULT_REST = 60;

/** The session's training impulse, when its average heart rate is known: one line, with what it means. */
export function TrimpLine({ workout }: { workout: Pick<Workout, "avgHr" | "durationSec" | "durationMin" | "date"> }) {
  const t = useTranslations("recovery");
  const health = useAllHealth();
  const profile = useAthleteProfileOrNull();
  const workouts = useWorkouts();
  const value = useMemo(() => {
    if (!workout.avgHr) return null;
    const minutes = workout.durationSec ? workout.durationSec / 60 : workout.durationMin ?? 0;
    // The resting HR of the latest reading up to that day; the maximum seen, or the age's.
    const rest = health.find((h) => h.restingHr && h.date <= workout.date)?.restingHr ?? DEFAULT_REST;
    const age = profile?.birthDate ? Math.floor((Date.parse(workout.date) - Date.parse(profile.birthDate)) / (365.25 * 86_400_000)) : null;
    const seen = Math.max(0, ...workouts.map((w) => w.maxHr ?? 0));
    const max = Math.max(seen, age && age > 10 ? maxHrForAge(age) : 0) || 190;
    return trimp({ minutes, avgHr: workout.avgHr, restHr: rest, maxHr: max, sex: profile?.sex ?? null });
  }, [workout, health, profile, workouts]);
  if (value === null) return null;
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <HeartPulse className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
        {t("trimp", { value })}
      </p>
      <p className="text-xs text-muted-foreground">{t("trimpHint")}</p>
    </div>
  );
}
