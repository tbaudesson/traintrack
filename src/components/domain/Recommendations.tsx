"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useTodayReadiness, readinessScore } from "@/hooks/useReadiness";
import { useNutritionForDate, sumMacros } from "@/hooks/useNutrition";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { buildRecommendations, type RecKind, type RecTone } from "@/lib/recommendations";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, Dumbbell, BedDouble, Beef, Flame, CalendarCheck, Sparkles, type LucideIcon } from "lucide-react";

const ICONS: Record<RecKind, LucideIcon> = {
  recover: HeartPulse,
  train: Dumbbell,
  rest: BedDouble,
  protein: Beef,
  calories: Flame,
  consistency: CalendarCheck,
  keepGoing: Sparkles,
};

const TONE_STYLES: Record<RecTone, string> = {
  good: "bg-green-100 text-green-600 dark:bg-green-900/30",
  info: "bg-accent-100 text-accent-600 dark:bg-accent-900/30",
  warn: "bg-amber-100 text-amber-600 dark:bg-amber-900/30",
};

function dayStr(offsetDays = 0) {
  return new Date(Date.now() - offsetDays * 86400000).toISOString().split("T")[0];
}

export function Recommendations() {
  const t = useTranslations("recommend");
  const workouts = useWorkouts();
  const todayReadiness = useTodayReadiness();
  const today = dayStr(0);
  const nutritionToday = useNutritionForDate(today);
  const profile = useAthleteProfile();

  const recs = useMemo(() => {
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
    }).slice(0, 3);
  }, [workouts, nutritionToday, todayReadiness, profile, today]);

  if (recs.length === 0) return null;

  return (
    <Card>
      <CardContent className="space-y-2.5 py-4">
        <p className="text-sm font-semibold text-muted-foreground">{t("title")}</p>
        {recs.map((r, idx) => {
          const Icon = ICONS[r.kind];
          return (
            <div key={`${r.kind}-${idx}`} className="flex items-start gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_STYLES[r.tone]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="pt-1 text-sm">{t(r.kind, r.params ?? {})}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
