"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useTrainablePrograms, createProgram } from "@/hooks/usePrograms";
import type { ProgramTemplate } from "@/lib/programTemplates";
import { useProgramTemplates } from "@/lib/templateService";
import { useUnreadComments } from "@/hooks/useCoachComments";
import { useExercises } from "@/hooks/useExercises";
import { useNutritionForDate, sumMacros } from "@/hooks/useNutrition";
import { useTodayReadiness, useReadiness, readinessScore } from "@/hooks/useReadiness";
import { DeloadCard } from "@/components/domain/DeloadCard";
import { WeeklyReportCard } from "@/components/domain/WeeklyReportCard";
import { MyPrograms } from "@/components/domain/MyPrograms";
import { PROGRAM_TEMPLATES } from "@/lib/programTemplates";
import { usePainReports } from "@/hooks/usePain";
import { deloadAdvice } from "@/lib/deload";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useTeams } from "@/hooks/useTeams";
import { daysToOffer, findWorkoutProgramDay, lastRepeatable, nextDayIndex, repeatWorkout, startWorkoutFromDay } from "@/lib/startWorkout";
import { programWeek } from "@/lib/programWeek";
import { describeTarget, isCardio, isCardioDone, weeklyGoal } from "@/lib/cardio";
import { SportPicker } from "@/components/domain/SportPicker";
import { WeekStrip } from "@/components/domain/WeekStrip";
import { GpxImport } from "@/components/domain/GpxImport";
import { mondayOfDate, upcomingSessions, weekPlan } from "@/lib/weekPlan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetailRow } from "@/components/ui/detail-row";
import { createWorkout } from "@/hooks/useWorkouts";
import Image from "next/image";
import { Recommendations } from "@/components/domain/Recommendations";
import type { ReactNode } from "react";
import type { Program, ProgramDay, Sport } from "@/db";
import {
  type LucideIcon,
  Activity, Upload, RotateCcw, ArrowRight, ListChecks, MessageSquare, Plus, Sparkles, Bell, ChevronRight, ClipboardList, Dumbbell, Flame, HeartPulse, Loader2, Settings, Target, TrendingUp, Trophy,
} from "lucide-react";
import { localDate, localDateIn } from "@/lib/dates";

const DAY_MS = 86400000;

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
      <svg viewBox="0 0 100 100" className="size-full -rotate-90 overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="ring-progress" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-300)" />
            <stop offset="1" stopColor="var(--accent-600)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-foreground/25" />
        <circle cx="50" cy="50" r="34" className="fill-background/85" />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
          stroke="url(#ring-progress)"
          style={{ filter: "drop-shadow(0 0 4px var(--accent-500))" }}
          className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums">{percent}%</span>
    </div>
  );
}

function OverviewTile({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
  tile,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint: string;
  highlight?: boolean;
  tile: string;
}) {
  return (
    <div className="t-tile min-w-0 rounded-2xl p-3" style={{ "--tile": tile } as React.CSSProperties}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-4 shrink-0" style={{ color: tile }} aria-hidden={true} />
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
  const tl = useTranslations("log");
  const tp = useTranslations("programs");
  const tc = useTranslations("cardio");
  const router = useRouter();
  const { user, profile: account } = useAuth();
  const profile = useAthleteProfile();
  const readiness = useReadiness();
  const pains = usePainReports();
  const [reportClosed, setReportClosed] = useState(() => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem("traintrack-report-closed");
    } catch {
      return null;
    }
  });
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const programs = useTrainablePrograms();
  const comments = useUnreadComments();
  const catalogue = useProgramTemplates();
  const exercises = useExercises();
  const todayReadiness = useTodayReadiness();
  const { hasFeature } = useFeatureAccess();
  const { memberships } = useTeams();
  const [now] = useState(() => Date.now());
  const [starting, setStarting] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [sportOpen, setSportOpen] = useState(false);
  const pickerTop = useRef<HTMLDivElement>(null);

  const today = localDate(now);
  const nutritionToday = useNutritionForDate(today);
  const hasTeamInvite = memberships.some((m) => m.status === "pending");
  const name = account?.display_name ?? user?.email?.split("@")[0] ?? "";
  const readyScore = todayReadiness ? readinessScore(todayReadiness) : null;

  // The program most recently trained, otherwise the first one with days. A
  // program started since (a coach's new plan) takes over from the old one.
  const session = useMemo(() => {
    const usable = programs.filter((p) => (p.structure ?? []).length > 0);
    const linked = workouts.map((w) => ({ w, at: findWorkoutProgramDay(usable, w) }));
    const lastDone = linked.find((x) => x.at && x.w.date < today);
    const todays = linked.find((x) => x.at && x.w.date === today);
    if (todays?.at) {
      return { program: todays.at.program, index: todays.at.index, day: todays.at.program.structure[todays.at.index], workoutId: todays.w.id };
    }
    const newest = usable
      .filter((p) => p.startDate && p.startDate <= today && !programWeek(p, today)?.finished)
      .sort((a, b) => b.startDate!.localeCompare(a.startDate!))[0];
    const program =
      newest && (!lastDone || newest.startDate! > lastDone.w.date) ? newest : (lastDone?.at?.program ?? usable[0]);
    if (!program) return null;
    const next = nextDayIndex(program, workouts, today);
    return { program, index: next, day: program.structure[next], workoutId: undefined };
  }, [programs, workouts, today]);

  // Deload: running this week, or suggested from the weeks in a row and fatigue.
  const thisMonday = mondayOfDate(today);
  const deloading = profile?.deloadWeek === thisMonday;
  // Last week's report, from Monday to Wednesday, until closed.
  const lastMonday = mondayOfDate(localDateIn(-7, now));
  const showReport =
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${thisMonday}T00:00:00Z`)) / 86400000 < 3 &&
    reportClosed !== lastMonday &&
    workouts.some((w) => w.date >= lastMonday && w.date < thisMonday);
  const deload = useMemo(
    () =>
      deloadAdvice({
        today,
        workouts,
        sets,
        readiness: readiness.map((r) => ({ date: r.date, score: readinessScore(r) })),
        deloadWeek: profile?.deloadWeek ?? undefined,
      }),
    [today, workouts, sets, readiness, profile]
  );

  // The week: done, missed, and the next sessions placed on the training days ahead.
  const plan = useMemo(() => {
    const from = session ? (session.workoutId ? session.index + 1 : session.index) : 0;
    return weekPlan({
      monday: mondayOfDate(today),
      today,
      trainingDays: profile?.trainingDays ?? [],
      workouts,
      upcoming: session ? upcomingSessions(session.program, from, 7) : [],
    });
  }, [session, today, profile, workouts]);

  const sessionWeek = session ? programWeek(session.program, today) : null;

  const percent = useMemo(() => {
    if (!session?.workoutId) return 0;
    const running = workouts.find((w) => w.id === session.workoutId);
    if (running && isCardio(running)) return isCardioDone(running) ? 100 : 0;
    const own = sets.filter((s) => s.workoutId === session.workoutId);
    return own.length ? Math.round((own.filter((s) => s.completed).length / own.length) * 100) : 0;
  }, [sets, session, workouts]);

  const week = useMemo(() => {
    const monday = localDate(mondayOf(now));
    const lastMonday = localDateIn(-7, mondayOf(now));
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

  // Ready-made programs the user has not added yet.
  const templates = catalogue.filter((tpl) => !programs.some((p) => p.name === tpl.name));

  const goal = session ? weeklyGoal(session.program, session.day) : 0;
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
    await startDay(session.program, session.index);
  }

  async function startDay(program: Program, index: number) {
    setChoosing(false);
    setStarting(true);
    try {
      const id = await startWorkoutFromDay(program, index, exercises, today, { deload: deloading });
      router.push(`/log/${id}`);
    } finally {
      setStarting(false);
    }
  }

  const trainable = programs.filter((p) => (p.structure ?? []).length > 0);
  const repeatable = lastRepeatable(workouts, sets, today);

  async function repeatLast() {
    if (!repeatable) return;
    setChoosing(false);
    setStarting(true);
    try {
      const id = await repeatWorkout(repeatable, today, { deload: deloading });
      router.push(`/log/${id}`);
    } finally {
      setStarting(false);
    }
  }
  const templateGroups = (
    [
      { key: "readyMadeStrength", items: templates.filter((x) => x.goal !== "endurance") },
      { key: "readyMadeEndurance", items: templates.filter((x) => x.goal === "endurance") },
    ] as const
  ).filter((group) => group.items.length > 0);

  async function startCardio(sport: Sport) {
    setSportOpen(false);
    const id = await createWorkout({ date: today, title: tc(`sport_${sport}`), kind: "cardio", sport });
    router.push(`/log/${id}`);
  }

  const dayDetail = (day: ProgramDay) =>
    day.cardio ? describeTarget(day.cardio) : t("exerciseCount", { count: day.exercises.length });

  async function buildProgram() {
    setChoosing(false);
    const id = await createProgram({ name: tp("untitled"), structure: [{ name: `${tp("day")} 1`, exercises: [] }] });
    router.push(`/programs/${id}`);
  }

  // Stays in the picker: the program joins the list above, ready to start.
  async function addTemplate(template: ProgramTemplate) {
    await createProgram({ name: template.name, description: template.description, structure: template.structure });
    pickerTop.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function startFree() {
    setChoosing(false);
    setStarting(true);
    try {
      const id = await createWorkout({ date: today, title: tl("newWorkout") });
      router.push(`/log/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-5 p-4 pb-28">
      <header className="relative flex items-center gap-3 pt-2">
        <Image
          src="/images/dumbbell.webp"
          alt=""
          width={128}
          height={99}
          unoptimized
          className="pointer-events-none absolute -top-8 -right-9 -z-10 opacity-40 dark:opacity-40"
        />
        <Link
          href="/profile"
          aria-label={tm("profile")}
          className="t-well flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-accent-50 to-accent-200 text-accent-text dark:from-accent-800/50 dark:to-accent-900/40"
        >
          <Trophy className="size-6" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{t("greeting", { name })}</h1>
          <p className="truncate text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        {comments.length > 0 ? (
          <Link href={`/log/${comments[0].workoutId}`} aria-label={t("newComments", { count: comments.length })} className="relative flex size-11 items-center justify-center rounded-lg text-foreground">
            <Bell className="size-6" aria-hidden="true" />
            <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent-600 ring-2 ring-background" />
          </Link>
        ) : hasTeamInvite && (
          <Link href="/teams" aria-label={t("teamInvite")} className="relative flex size-11 items-center justify-center rounded-lg text-foreground">
            <Bell className="size-6" aria-hidden="true" />
            <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent-600 ring-2 ring-background" />
          </Link>
        )}
        <Link
          href="/settings"
          aria-label={tm("settings")}
          className="t-surface flex size-11 items-center justify-center rounded-xl text-foreground"
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
          <section className="t-hero relative overflow-hidden rounded-3xl p-5">
            <Image
              src="/images/athlete.webp"
              alt=""
              width={176}
              height={209}
              unoptimized
              className="pointer-events-none absolute top-2 left-[33%] opacity-55 [mask-image:linear-gradient(to_right,transparent_8%,black_45%)] dark:opacity-50"
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="max-w-[60%] min-w-0">
                <p className="text-xs font-semibold tracking-widest text-accent-text uppercase">{t("todaySession")}</p>
                <h2 className="mt-1 truncate text-3xl font-bold tracking-tight">{session?.day.name ?? t("freeSession")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {session
                    ? `${session.program.name} · ${dayDetail(session.day)}`
                    : t("freeSessionDesc")}
                  {sessionWeek && (
                    <span className="mt-0.5 block text-xs font-semibold text-accent-text">
                      {!sessionWeek.started
                        ? t("programStarts", { date: session!.program.startDate!.split("-").reverse().slice(0, 2).join("/") })
                        : sessionWeek.total
                          ? t("programWeekOf", { week: sessionWeek.week, total: sessionWeek.total })
                          : t("programWeek", { week: sessionWeek.week })}
                    </span>
                  )}
                </p>
              </div>
              <ProgressRing percent={percent} />
            </div>
            <div className="relative mt-4 flex items-center justify-between gap-2">
              <Button onClick={start} disabled={starting} className="rounded-full px-5">
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
                  className="t-surface flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap"
                >
                  <ClipboardList className="size-4" aria-hidden="true" />
                  {t("details")}
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => setChoosing(true)}
              className="relative mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 text-sm font-semibold text-accent-text"
            >
              <ListChecks className="size-4" aria-hidden="true" />
              {t("changeSession")}
            </button>
          </section>

          <DeloadCard advice={deload} monday={thisMonday} active={deloading} hasProfile={!!profile} />

          {showReport && (
            <WeeklyReportCard
              workouts={workouts}
              sets={sets}
              exercises={exercises}
              trainingDays={profile?.trainingDays}
              pains={pains}
              lastMonday={lastMonday}
              navigable={false}
              onDismiss={() => {
                try {
                  window.localStorage.setItem("traintrack-report-closed", lastMonday);
                } catch {
                  // Private browsing: it shows again next time.
                }
                setReportClosed(lastMonday);
              }}
            />
          )}

          <WeekStrip plan={plan} planned={(profile?.trainingDays ?? []).length > 0} />

          <MyPrograms
            programs={programs}
            workouts={workouts}
            catalogue={[...catalogue, ...PROGRAM_TEMPLATES]}
            today={today}
            onContinue={(program) => {
              const running = workouts.find((w) => w.date === today && findWorkoutProgramDay([program], w));
              if (running?.id) router.push(`/log/${running.id}`);
              else startDay(program, nextDayIndex(program, workouts, today));
            }}
          />

          <SportPicker open={sportOpen} onOpenChange={setSportOpen} onPick={startCardio} />

          <Dialog open={choosing} onOpenChange={setChoosing}>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("chooseSession")}</DialogTitle>
              </DialogHeader>
              <div ref={pickerTop} className="space-y-4">
                {trainable.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("myPrograms")}</h3>
                    {trainable.map((p) => (
                      <div key={p.id} className="space-y-2">
                        <h4 className="text-sm font-semibold">{p.name}</h4>
                        {daysToOffer(p, workouts, today).map(({ day, index }) => (
                          <DetailRow
                            key={`${p.id}-${index}`}
                            onClick={() => startDay(p, index)}
                            disabled={starting}
                            icon={day.cardio ? Activity : Dumbbell}
                            title={day.name}
                            subtitle={dayDetail(day)}
                          />
                        ))}
                      </div>
                    ))}
                  </section>
                )}

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("noProgram")}</h3>
                  {repeatable && (
                    <DetailRow
                      onClick={repeatLast}
                      disabled={starting}
                      icon={RotateCcw}
                      tone="neutral"
                      title={t("repeatLast")}
                      subtitle={`${repeatable.title || t("freeSession")} · ${repeatable.date.split("-").reverse().join("/")}`}
                    />
                  )}
                  <DetailRow onClick={startFree} disabled={starting} icon={Plus} tone="neutral" title={t("freeSession")} subtitle={t("freeSessionHint")} />
                  <DetailRow onClick={() => { setChoosing(false); setSportOpen(true); }} disabled={starting} icon={Activity} tone="neutral" title={tc("newSession")} subtitle={tc("newSessionHint")} />
                  <GpxImport
                    existing={workouts}
                    onImported={({ workoutId }) => {
                      setChoosing(false);
                      router.push(`/log/${workoutId}`);
                    }}
                    trigger={(open) => (
                      <DetailRow onClick={open} icon={Upload} tone="neutral" title={tc("importGpx")} subtitle={tc("importGpxHint")} />
                    )}
                  />
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("addProgram")}</h3>
                  <DetailRow onClick={buildProgram} icon={Plus} title={t("buildProgram")} subtitle={t("buildProgramHint")} />
                  <DetailRow href="/programs" icon={ClipboardList} tone="neutral" title={t("managePrograms")} subtitle={t("manageProgramsHint")} />
                </section>

                {templateGroups.map(({ key, items }) => (
                  <section key={key} className="space-y-2">
                    <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t(key)}</h3>
                    {items.map((template) => (
                      <DetailRow
                        key={template.id}
                        onClick={() => addTemplate(template)}
                        icon={key === "readyMadeEndurance" ? Activity : Sparkles}
                        title={template.name}
                        subtitle={
                          template.structure.some((d) => d.week !== undefined)
                            ? t("readyMadeWeeks", { count: new Set(template.structure.map((d) => d.week)).size })
                            : t("readyMadeDays", { count: template.structure.length })
                        }
                      />
                    ))}
                  </section>
                ))}
              </div>
            </DialogContent>
          </Dialog>

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
                <OverviewTile icon={Flame} label={t("calories")} value={Math.round(sumMacros(nutritionToday).calories).toLocaleString()} hint={t("kcalToday")} tile="oklch(0.74 0.17 55)" />
              ) : (
                <OverviewTile icon={Flame} label={t("weeklyVolume")} value={week.volume.toLocaleString()} hint="kg" tile="oklch(0.74 0.17 55)" />
              )}
              <OverviewTile icon={Dumbbell} label={t("workouts")} value={week.workouts} hint={t("thisWeek")} tile="var(--accent-400)" />
              <OverviewTile
                icon={TrendingUp}
                label={t("progression")}
                value={week.change === null ? "—" : `${week.change > 0 ? "+" : ""}${week.change}%`}
                hint={t("vsLastWeek")}
                highlight
                tile="oklch(0.74 0.12 200)"
              />
            </div>
          </section>

          {goal > 0 && (
            <section className="t-surface flex items-center gap-3 rounded-2xl p-4 ring-1 ring-foreground/5">
              <Target className="size-8 shrink-0 text-accent-text" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t("weeklyGoal")}</p>
                <div className="t-sunken mt-2 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.min(week.workouts, goal)} aria-valuemin={0} aria-valuemax={goal} aria-label={t("weeklyGoal")}>
                  <div className="h-full rounded-full bg-linear-to-r from-accent-700 to-accent-400 shadow-[inset_0_1px_0_oklch(1_0_0/0.4)]" style={{ width: `${Math.min(100, (week.workouts / goal) * 100)}%` }} />
                </div>
              </div>
              <p className="shrink-0 text-right">
                <span className="text-lg font-semibold tabular-nums">{week.workouts}</span>
                <span className="text-muted-foreground"> / {goal}</span>
                <span className="block text-xs text-muted-foreground">{t("sessions")}</span>
              </p>
            </section>
          )}

          {comments.length > 0 && (
            <Link href={`/log/${comments[0].workoutId}`} className="block">
              <Card className="active:scale-[0.99]">
                <CardContent className="flex items-center gap-3 py-3">
                  <MessageSquare className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t("newComments", { count: comments.length })}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {comments[0].authorName ?? "—"}{comments[0].body ? ` : ${comments[0].body}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </CardContent>
              </Card>
            </Link>
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
                  <div className="t-well flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-b from-accent-50 to-accent-200 dark:from-accent-800/50 dark:to-accent-900/40">
                    <HeartPulse className="h-5 w-5 text-accent-text" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{tr("title")}</p>
                    <p className="text-xs text-muted-foreground">
                      {readyScore != null ? `${tr("score")}: ${readyScore}/100` : tr("todayPrompt")}
                    </p>
                  </div>
                  {readyScore == null && (
                    <span className="rounded-full bg-linear-to-b from-[color-mix(in_oklab,var(--primary)_86%,white)] to-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.3)]">
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
