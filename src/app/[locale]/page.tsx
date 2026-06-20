"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useTodayReadiness, readinessScore } from "@/hooks/useReadiness";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Plus, Settings, TrendingUp, Flame, HeartPulse, ChevronRight } from "lucide-react";

export default function HomePage() {
  const t = useTranslations("home");
  const tr = useTranslations("readiness");
  const { user } = useAuth();
  const profile = useAthleteProfile();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const todayReadiness = useTodayReadiness();
  const name = user?.email?.split("@")[0] ?? "";
  const readyScore = todayReadiness ? readinessScore(todayReadiness) : null;

  const workoutDates = useMemo(() => new Set(workouts.map((w) => w.date)), [workouts]);

  // Weekly volume (last 7 days)
  const weeklyVolume = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const recent = new Set(workouts.filter((w) => w.date >= cutoff).map((w) => w.id));
    let vol = 0;
    for (const s of sets) {
      if (recent.has(s.workoutId) && s.completed && s.weightKg && s.reps) vol += s.weightKg * s.reps;
    }
    return Math.round(vol);
  }, [workouts, sets]);

  // Simple streak: consecutive days back from today with a workout
  const streak = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      if (workoutDates.has(d)) n++;
      else if (i > 0) break;
    }
    return n;
  }, [workoutDates]);

  // profile === undefined while loading; null/empty means not onboarded
  const needsOnboarding = profile !== undefined && !profile;

  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="relative -mx-4 -mt-4 overflow-hidden px-4 pb-2 pt-6">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent" />
        <div className="relative flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("greeting", { name })}</h1>
          <Link href="/settings">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
              <Settings className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </div>

      {needsOnboarding ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Dumbbell className="h-7 w-7 text-indigo-600" />
            </div>
            <p className="text-sm text-muted-foreground">{t("completeProfile")}</p>
            <Link href="/onboarding">
              <Button>{t("goToOnboarding")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-4">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                <p className="text-xl font-bold">{weeklyVolume.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t("weeklyVolume")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center gap-1 py-4">
                <Flame className="h-5 w-5 text-orange-500" />
                <p className="text-xl font-bold">{streak}</p>
                <p className="text-xs text-muted-foreground">{t("streak")} · {t("days")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Readiness prompt / score */}
          <Link href="/readiness" className="block">
            <Card className="active:scale-[0.99]">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                  <HeartPulse className="h-5 w-5 text-rose-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{tr("title")}</p>
                  <p className="text-xs text-muted-foreground">
                    {readyScore != null ? `${tr("score")}: ${readyScore}/100` : tr("todayPrompt")}
                  </p>
                </div>
                {readyScore == null && (
                  <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-medium text-white">
                    {tr("checkIn")}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">{t("noWorkoutToday")}</p>
              <Link href="/log">
                <Button>
                  <Plus className="mr-1 h-4 w-4" />
                  {t("startWorkout")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
