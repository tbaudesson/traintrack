"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { usePrograms } from "@/hooks/usePrograms";
import { useExercises } from "@/hooks/useExercises";
import { useNutritionForDate, sumMacros } from "@/hooks/useNutrition";
import { useTodayReadiness, readinessScore } from "@/hooks/useReadiness";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useTeams } from "@/hooks/useTeams";
import { programDayTitle, startWorkoutFromDay } from "@/lib/startWorkout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Recommendations } from "@/components/domain/Recommendations";
import type { ComponentType, ReactNode } from "react";
import type { ProgramDay } from "@/db";
import {
  ArrowRight, Bell, ChevronRight, ClipboardList, Dumbbell, Flame, HeartPulse, Loader2, Settings, Target, TrendingUp, Trophy,
} from "lucide-react";

const DAY_MS = 86400000;

function isoDate(ms: number) {
  return new Date(ms).toISOString().split("T")[0];
}

/** Monday 00:00 of the week holding this moment. */
function mondayOf(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - ((d.getDay() + 6) % 7) * DAY_MS;
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
          className="stroke-accent-600 transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums">{percent}%</span>
    </div>
  );
}

function OverviewTile({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: ReactNode;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-foreground/5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-4 shrink-0 text-accent-text" aria-hidden={true} />
        <span className="truncate">{label}</span>
      </p>
      <p className={`mt-1 truncate text-2xl font-bold tabular-nums ${highlight ? "text-accent-text" : ""}`}>{value}</p>
      <p className="truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("home");
  const tr = useTranslations("readiness");
  const tm = useTranslations("more");
  const router = useRouter();
  const { user, profile: account } = useAuth();
  const profile = useAthleteProfile();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const programs = usePrograms();
  const exercises = useExercises();
  const todayReadiness = useTodayReadiness();
  const { hasFeature } = useFeatureAccess();
  const { memberships } = useTeams();
  const [now] = useState(() => Date.now());
  const [starting, setStarting] = useState(false);

  const today = isoDate(now);
  const nutritionToday = useNutritionForDate(today);
  const hasTeamInvite = memberships.some((m) => m.status === "pending");
  const name = account?.display_name ?? user?.email?.split("@")[0] ?? "";
  const readyScore = todayReadiness ? readinessScore(todayReadiness) : null;

  // The program most recently trained, otherwise the first one with days.
  const session = useMemo(() => {
    const usable = programs.filter((p) => (p.structure ?? []).length > 0);
    const dayOf = (title?: string) => {
      for (const program of usable) {
        const index = program.structure.findIndex((d) => programDayTitle(program.name, d.name) === title);
        if (index !== -1) return { program, index };
      }
      return null;
    };
    const lastDone = workouts.map((w) => ({ w, at: dayOf(w.title) })).find((x) => x.at && x.w.date < today);
    const todays = workouts.map((w) => ({ w, at: dayOf(w.title) })).find((x) => x.at && x.w.date === today);
    if (todays?.at) {
      const day: ProgramDay = todays.at.program.structure[todays.at.index];
      return { program: todays.at.program, day, workoutId: todays.w.id };
    }
    const program = lastDone?.at?.program ?? usable[0];
    if (!program) return null;
    const next = lastDone?.at ? (lastDone.at.index + 1) % program.structure.length : 0;
    return { program, day: program.structure[next], workoutId: undefined };
  }, [programs, workouts, today]);

  const percent = useMemo(() => {
    if (!session?.workoutId) return 0;
    const own = sets.filter((s) => s.workoutId === session.workoutId);
    return own.length ? Math.round((own.filter((s) => s.completed).length / own.length) * 100) : 0;
  }, [sets, session]);

  const week = useMemo(() => {
    const monday = isoDate(mondayOf(now));
    const lastMonday = isoDate(mondayOf(now) - 7 * DAY_MS);
    const volumeOf = (from: string, to: string) => {
      const ids = new Set(workouts.filter((w) => w.date >= from && w.date < to).map((w) => w.id));
      return sets.reduce((a, s) => (ids.has(s.workoutId) && s.completed && s.weightKg && s.reps ? a + s.weightKg * s.reps : a), 0);
    };
    const current = volumeOf(monday, "9999-12-31");
    const previous = volumeOf(lastMonday, monday);
    return {
      workouts: workouts.filter((w) => w.date >= monday).length,
      volume: Math.round(current),
      // No comparison without a previous week to compare to.
      change: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
    };
  }, [workouts, sets, now]);

  const goal = session ? session.program.structure.length : 0;
  const needsOnboarding = profile !== undefined && !profile;

  async function start() {
    if (session?.workoutId) {
      router.push(`/log/${session.workoutId}`);
      return;
    }
    if (!session) {
      router.push("/log");
      return;
    }
    setStarting(true);
    try {
      const id = await startWorkoutFromDay(session.program.name, session.day, exercises, today);
      router.push(`/log/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-5 p-4 pb-28">
      <header className="flex items-center gap-3 pt-2">
        <Link
          href="/profile"
          aria-label={tm("profile")}
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-text ring-1 ring-foreground/5 dark:bg-accent-900/30"
        >
          <Trophy className="size-6" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{t("greeting", { name })}</h1>
          <p className="truncate text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        {hasTeamInvite && (
          <Link href="/teams" aria-label={t("teamInvite")} className="relative flex size-11 items-center justify-center rounded-lg text-foreground">
            <Bell className="size-6" aria-hidden="true" />
            <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent-600 ring-2 ring-background" />
          </Link>
        )}
        <Link
          href="/settings"
          aria-label={tm("settings")}
          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings className="size-5" aria-hidden="true" />
        </Link>
      </header>

      {needsOnboarding ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
              <Dumbbell className="h-7 w-7 text-accent-text" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">{t("completeProfile")}</p>
            <Link href="/onboarding">
              <Button>{t("goToOnboarding")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="rounded-3xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-widest text-accent-text uppercase">{t("todaySession")}</p>
                <h2 className="mt-1 truncate text-3xl font-bold tracking-tight">{session?.day.name ?? t("freeSession")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {session
                    ? `${session.program.name} · ${t("exerciseCount", { count: session.day.exercises.length })}`
                    : t("freeSessionDesc")}
                </p>
              </div>
              <ProgressRing percent={percent} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button onClick={start} disabled={starting} className="rounded-full px-6">
                {starting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    {session?.workoutId ? t("continue") : t("start")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
              {session?.program.id !== undefined && (
                <Link
                  href={`/programs/${session.program.id}`}
                  className="flex h-11 items-center gap-2 rounded-xl bg-card px-3 text-sm font-medium whitespace-nowrap shadow-sm ring-1 ring-foreground/10"
                >
                  <ClipboardList className="size-4" aria-hidden="true" />
                  {t("details")}
                </Link>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{t("overview")}</h2>
              <Link href="/progress" className="flex min-h-10 items-center gap-1 text-sm font-medium text-accent-text">
                {t("seeAll")}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {hasFeature("nutrition") ? (
                <OverviewTile icon={Flame} label={t("calories")} value={Math.round(sumMacros(nutritionToday).calories).toLocaleString()} hint={t("kcalToday")} />
              ) : (
                <OverviewTile icon={Flame} label={t("weeklyVolume")} value={week.volume.toLocaleString()} hint="kg" />
              )}
              <OverviewTile icon={Dumbbell} label={t("workouts")} value={week.workouts} hint={t("thisWeek")} />
              <OverviewTile
                icon={TrendingUp}
                label={t("progression")}
                value={week.change === null ? "—" : `${week.change > 0 ? "+" : ""}${week.change}%`}
                hint={t("vsLastWeek")}
                highlight
              />
            </div>
          </section>

          {goal > 0 && (
            <section className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
              <Target className="size-8 shrink-0 text-accent-text" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t("weeklyGoal")}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.min(week.workouts, goal)} aria-valuemin={0} aria-valuemax={goal} aria-label={t("weeklyGoal")}>
                  <div className="h-full rounded-full bg-accent-600" style={{ width: `${Math.min(100, (week.workouts / goal) * 100)}%` }} />
                </div>
              </div>
              <p className="shrink-0 text-right">
                <span className="text-lg font-semibold tabular-nums">{week.workouts}</span>
                <span className="text-muted-foreground"> / {goal}</span>
                <span className="block text-xs text-muted-foreground">{t("sessions")}</span>
              </p>
            </section>
          )}

          {hasTeamInvite && (
            <Link href="/teams" className="block">
              <Card className="active:scale-[0.99]">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("teamInvite")}</p>
                    <p className="text-xs text-muted-foreground">{t("teamInviteDesc")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </CardContent>
              </Card>
            </Link>
          )}

          {hasFeature("readiness") && (
            <Link href="/readiness" className="block">
              <Card className="active:scale-[0.99]">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
                    <HeartPulse className="h-5 w-5 text-accent-text" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{tr("title")}</p>
                    <p className="text-xs text-muted-foreground">
                      {readyScore != null ? `${tr("score")}: ${readyScore}/100` : tr("todayPrompt")}
                    </p>
                  </div>
                  {readyScore == null && (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      {tr("checkIn")}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </CardContent>
              </Card>
            </Link>
          )}

          <Recommendations />
        </>
      )}
    </div>
  );
}
