"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { doneSessions } from "@/lib/doneSessions";
import { useTodayReadiness, readinessScore } from "@/hooks/useReadiness";
import { useNutritionForDate, sumMacros } from "@/hooks/useNutrition";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useHealthForDate } from "@/hooks/useHealth";
import { buildRecommendations, type RecKind, type RecTone } from "@/lib/recommendations";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, Dumbbell, BedDouble, Beef, Flame, CalendarCheck, Sparkles, Moon, type LucideIcon } from "lucide-react";
import { localDateIn } from "@/lib/dates";

const ICONS: Record<RecKind, LucideIcon> = {
  recover: HeartPulse,
  train: Dumbbell,
  rest: BedDouble,
  protein: Beef,
  calories: Flame,
  consistency: CalendarCheck,
  sleep: Moon,
  keepGoing: Sparkles,
};

const TONE_STYLES: Record<RecTone, string> = {
  good: "bg-green-100 text-green-600 dark:bg-green-900/30",
  info: "bg-accent-100 text-accent-text dark:bg-accent-900/30",
  warn: "bg-amber-100 text-amber-600 dark:bg-amber-900/30",
};

function dayStr(offsetDays = 0) {
  return localDateIn(-offsetDays);
}

/** Today's advice, most useful first. */
export function useRecommendations() {
  const all = useWorkouts();
  const sets = useAllWorkoutSets();
  // Only sessions done count as activity, as on the home screen and in Performance.
  const workouts = useMemo(() => doneSessions(all, sets), [all, sets]);
  const todayReadiness = useTodayReadiness();
  const today = dayStr(0);
  const nutritionToday = useNutritionForDate(today);
  const profile = useAthleteProfile();
  const healthToday = useHealthForDate(today);

  return useMemo(() => {
    const dates = workouts.map((w) => w.date).sort();
    const last = dates[dates.length - 1];
    const daysSinceLastWorkout = last
      ? Math.round((Date.parse(today) - Date.parse(last)) / 86400000)
      : null;

    const cutoff = dayStr(7);
    const workoutsLast7 = new Set(workouts.filter((w) => w.date >= cutoff).map((w) => w.date)).size;
    const trainedToday = workouts.some((w) => w.date === today);

    // Streak: consecutive days back from today (or yesterday) with a workout.
    const dateSet = new Set(workouts.map((w) => w.date));
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = dayStr(i);
      if (dateSet.has(d)) streak++;
      else if (i > 0) break;
    }

    const macros = sumMacros(nutritionToday);
    const targets = profile?.nutritionTargets;

    return buildRecommendations({
      daysSinceLastWorkout,
      workoutsLast7,
      trainedToday,
      streak,
      readinessScore: todayReadiness ? readinessScore(todayReadiness) : null,
      proteinToday: macros.protein,
      proteinTarget: targets?.protein,
      caloriesToday: macros.calories,
      caloriesTarget: targets?.calories,
      sleepHours: healthToday?.sleepHours,
    });
  }, [workouts, nutritionToday, todayReadiness, profile, healthToday, today]);
}

/** One piece of advice: its icon in the colour of its tone, and its text. */
export function RecommendationRow({ rec }: { rec: ReturnType<typeof useRecommendations>[number] }) {
  const t = useTranslations("recommend");
  const Icon = ICONS[rec.kind];
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_STYLES[rec.tone]}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="pt-1 text-sm">{t(rec.kind, rec.params ?? {})}</p>
    </div>
  );
}

/** Today's advice, the first ones. */
export function Recommendations({ limit = 3 }: { limit?: number }) {
  const t = useTranslations("recommend");
  const recs = useRecommendations().slice(0, limit);
  if (recs.length === 0) return null;

  return (
    <Card>
      <CardContent className="space-y-2.5 py-4">
        <p className="text-sm font-semibold text-muted-foreground">{t("title")}</p>
        {recs.map((r, idx) => (
          <RecommendationRow key={`${r.kind}-${idx}`} rec={r} />
        ))}
      </CardContent>
    </Card>
  );
}
