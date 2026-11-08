"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useTodayReadiness, readinessScore } from "@/hooks/useReadiness";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useTeams } from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Recommendations } from "@/components/domain/Recommendations";
import { Dumbbell, Plus, Settings, TrendingUp, Flame, HeartPulse, ChevronRight, Trophy } from "lucide-react";
import { StatTile } from "@/components/ui/detail-row";

export default function HomePage() {
  const t = useTranslations("home");
  const tr = useTranslations("readiness");
  const tm = useTranslations("more");
  const { user, profile: account } = useAuth();
  const profile = useAthleteProfile();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const todayReadiness = useTodayReadiness();
  const { hasFeature } = useFeatureAccess();
  const { memberships } = useTeams();
  const hasTeamInvite = memberships.some((m) => m.status === "pending");
  const name = account?.display_name ?? user?.email?.split("@")[0] ?? "";
  const readyScore = todayReadiness ? readinessScore(todayReadiness) : null;

  const [now] = useState(() => Date.now());

  const workoutDates = useMemo(() => new Set(workouts.map((w) => w.date)), [workouts]);

  // Weekly volume (last 7 days)
  const weeklyVolume = useMemo(() => {
    const cutoff = new Date(now - 7 * 86400000).toISOString().split("T")[0];
    const recent = new Set(workouts.filter((w) => w.date >= cutoff).map((w) => w.id));
    let vol = 0;
    for (const s of sets) {
      if (recent.has(s.workoutId) && s.completed && s.weightKg && s.reps) vol += s.weightKg * s.reps;
    }
    return Math.round(vol);
  }, [workouts, sets, now]);

  // Simple streak: consecutive days back from today with a workout
  const streak = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now - i * 86400000).toISOString().split("T")[0];
      if (workoutDates.has(d)) n++;
      else if (i > 0) break;
    }
    return n;
  }, [workoutDates, now]);

  // profile === undefined while loading; null/empty means not onboarded
  const needsOnboarding = profile !== undefined && !profile;

  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="relative -mx-4 -mt-4 overflow-hidden px-4 pb-2 pt-6">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-500/5 to-transparent" />
        <div className="relative flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("greeting", { name })}</h1>
          <div className="flex items-center gap-1">
            <Link href="/profile" aria-label={tm("profile")} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link href="/settings" aria-label={tm("settings")} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {needsOnboarding ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
              <Dumbbell className="h-7 w-7 text-accent-text" />
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
            <StatTile icon={TrendingUp} iconClassName="text-accent-500" value={weeklyVolume.toLocaleString()} label={t("weeklyVolume")} />
            <StatTile icon={Flame} iconClassName="text-orange-500" value={streak} label={`${t("streak")} · ${t("days")}`} />
          </div>

          {hasTeamInvite && (
            <Link href="/teams" className="block">
              <Card className="active:scale-[0.99]">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("teamInvite")}</p>
                    <p className="text-xs text-muted-foreground">{t("teamInviteDesc")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Readiness prompt / score */}
          {hasFeature("readiness") && (
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
          )}

          <Recommendations />

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
