"use client";

import { sessionHref } from "@/lib/routes";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
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
import { DeloadCard, deloadLaterFor } from "@/components/domain/DeloadCard";
import { LOW_READINESS } from "@/lib/readinessAdjust";
import { ReadinessBanner } from "@/components/domain/ReadinessBanner";
import { useLighterToday } from "@/hooks/useLighterToday";
import { WeeklyReportCard } from "@/components/domain/WeeklyReportCard";
import { MyPrograms } from "@/components/domain/MyPrograms";
import { PROGRAM_TEMPLATES } from "@/lib/programTemplates";
import { programCategory } from "@/lib/programCategories";
import { homePicture } from "@/lib/appTheme";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { usePainReports } from "@/hooks/usePain";
import { deloadAdvice } from "@/lib/deload";
import { trainingLoad } from "@/lib/trainingLoad";
import { TrainingLoadCard } from "@/components/domain/TrainingLoadCard";
import { FirstSteps } from "@/components/domain/FirstSteps";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useTeams } from "@/hooks/useTeams";
import { daysToOffer, findWorkoutProgramDay, lastRepeatable, nextDayIndex, repeatWorkout, startWorkoutFromDay } from "@/lib/startWorkout";
import { programWeek } from "@/lib/programWeek";
import { describeTarget, isCardio, isCardioDone, weeklyGoal } from "@/lib/cardio";
import { SportPicker } from "@/components/domain/SportPicker";
import { WeekStrip } from "@/components/domain/WeekStrip";
import { GpxImport } from "@/components/domain/GpxImport";
import { mondayOfDate, plannedSessions, upcomingSessions, weekPlan } from "@/lib/weekPlan";
import { planCalendar } from "@/lib/ics";
import { plannedPrograms, scheduleSessions, scheduleWeek, sessionChoices, sessionsPerWeek, type SessionChoice } from "@/lib/schedule";
import { weekStreak } from "@/lib/weekStreak";
import { MoveSessionDialog } from "@/components/domain/MoveSessionDialog";
import { ExpressDialog } from "@/components/domain/ExpressDialog";
import { dayMinutes } from "@/lib/express";
import { isTestProgram, testsDue } from "@/lib/levelTests";
import { cardioSportOf, detectSport, kindOf, weekOverview } from "@/lib/activityProfile";
import { savePrefs } from "@/lib/appTheme";
import { downloadFile } from "@/lib/exportService";
import { useCompetitions } from "@/hooks/useCompetitions";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Activity, Upload, RotateCcw, ArrowRight, Check, ListChecks, MessageSquare, Plus, Sparkles, Bell, ChevronRight, ClipboardList, Dumbbell, Flame, HeartPulse, Loader2, Settings, Target, TrendingUp, Trophy,
  Timer,
  PersonStanding,
  PartyPopper,
  Gauge,
  X,
  Footprints,
  Repeat,
  CalendarCheck,
} from "lucide-react";
import { localDate, localDateIn } from "@/lib/dates";
import { useFormat } from "@/lib/format";


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

/** A note on the home screen: something worth a look, with a link, until closed. */
function HomeNote({
  icon: Icon,
  title,
  text,
  href,
  onAction,
  action,
  onClose,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
  onAction?: () => void;
  action: string;
  onClose: () => void;
}) {
  const tc = useTranslations("common");
  return (
    <section className="t-surface relative space-y-1.5 rounded-2xl p-4 pr-12 ring-1 ring-accent-500/30">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{text}</p>
      {href ? (
        <Link href={href} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-text">
          {action}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <button type="button" onClick={onAction} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-text">
          {action}
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      )}
      <button type="button" onClick={onClose} aria-label={tc("close")} className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
        <X className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}

export default function HomePage() {
  const t = useTranslations("home");
  const tf = useTranslations("firstSteps");
  const locale = useLocale();
  const tr = useTranslations("readiness");
  const tm = useTranslations("more");
  const tl = useTranslations("log");
  const tp = useTranslations("programs");
  const tc = useTranslations("cardio");
  const ti = useTranslations("intervals");
  const tmo = useTranslations("mobility");
  const tcat = useTranslations("catalog");
  const router = useRouter();
  const { user, profile: account } = useAuth();
  const profile = useAthleteProfile();
  const readiness = useReadiness();
  const { num, day, short } = useFormat();
  const pains = usePainReports();
  const [reportClosed, setReportClosed] = useState(() => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem("traintrack-report-closed");
    } catch {
      return null;
    }
  });
  // Small flags of this device: the first steps hidden, the calendar exported, the look seen.
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const read = (k: string) => {
      try {
        return typeof window !== "undefined" && window.localStorage.getItem(`traintrack-${k}`) === "1";
      } catch {
        return false;
      }
    };
    return { stepsClosed: read("first-steps-closed"), calendar: read("calendar-exported"), look: read("look-seen"), onboardingLater: read("onboarding-later") };
  });
  const setFlag = (key: string, storageKey: string) => {
    try {
      window.localStorage.setItem(`traintrack-${storageKey}`, "1");
    } catch {
      // Private window: remembered until the page is closed.
    }
    setFlags((f) => ({ ...f, [key]: true }));
  };
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const programs = useTrainablePrograms();
  const comments = useUnreadComments();
  const catalogue = useProgramTemplates();
  const prefs = useAppPrefs();
  const picture = homePicture(prefs);
  const exercises = useExercises();
  const todayReadiness = useTodayReadiness();
  const { hasFeature } = useFeatureAccess();
  const { memberships } = useTeams();
  const [now] = useState(() => Date.now());
  const [starting, setStarting] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [expressOpen, setExpressOpen] = useState(false);
  // Cards closed on this device: a program's review, a round of tests due.
  const [closedCards, setClosedCards] = useState<string[]>(() => {
    try {
      return typeof window === "undefined" ? [] : (JSON.parse(window.localStorage.getItem("traintrack-closed-cards") ?? "[]") as string[]);
    } catch {
      return [];
    }
  });
  const closeCard = (key: string) => {
    const next = [...closedCards.filter((k) => k !== key), key].slice(-50);
    try {
      window.localStorage.setItem("traintrack-closed-cards", JSON.stringify(next));
    } catch {
      // Private window: closed until the page is left.
    }
    setClosedCards(next);
  };
  const [sportOpen, setSportOpen] = useState(false);
  const pickerTop = useRef<HTMLDivElement>(null);

  const today = localDate(now);
  const nutritionToday = useNutritionForDate(today);
  const hasTeamInvite = memberships.some((m) => m.status === "pending");
  const name = account?.display_name ?? user?.email?.split("@")[0] ?? "";
  const readyScore = todayReadiness ? readinessScore(todayReadiness) : null;

  // The programs in the planning (given days), all shown together in the week.
  const weekStart = mondayOfDate(today);
  const planned = useMemo(
    () => plannedPrograms({ programs, me: user?.id, trainingDays: profile?.trainingDays ?? [], from: weekStart, moves: profile?.scheduleMoves }),
    [programs, user?.id, profile?.trainingDays, profile?.scheduleMoves, weekStart]
  );

  // Today's session already begun; otherwise the next one of the planning;
  // without a planning, the program most recently trained, or the first one
  // with days. A program started since (a coach's new plan) takes over.
  // With several sessions on the day shown, the one picked by the athlete.
  const [pickKey, setPickKey] = useState<string | null>(null);
  const session = useMemo(() => {
    // The level tests are done from their own page, never as the session of the day.
    const usable = programs.filter((p) => (p.structure ?? []).length > 0 && !isTestProgram(p));
    const linked = workouts.map((w) => ({ w, at: findWorkoutProgramDay(usable, w) }));
    const lastDone = linked.find((x) => x.at && x.w.date < today);
    const choose = (date: string, options: SessionChoice[]) => {
      const o = options.find((x) => x.key === pickKey) ?? options[0];
      return { program: o.program, index: o.index, day: o.program.structure[o.index], workoutId: o.workoutId, date, options };
    };
    // Today's sessions begun and planned, or the next day planned.
    const day = sessionChoices({ planned, programs: usable, workouts, today });
    if (day) return choose(day.date, day.options);
    const newest = usable
      .filter((p) => p.startDate && p.startDate <= today && !programWeek(p, today)?.finished)
      .sort((a, b) => b.startDate!.localeCompare(a.startDate!))[0];
    // With nothing going on, the program of one's favourite sport comes first.
    const favorite = prefs.sport ? usable.find((p) => programCategory(p, [...catalogue, ...PROGRAM_TEMPLATES]) === prefs.sport) : undefined;
    const program =
      newest && (!lastDone || newest.startDate! > lastDone.w.date) ? newest : (lastDone?.at?.program ?? favorite ?? usable[0]);
    if (!program) return null;
    const next = nextDayIndex(program, workouts, today);
    return { program, index: next, day: program.structure[next], workoutId: undefined, date: today, options: [] as SessionChoice[] };
  }, [programs, workouts, today, prefs.sport, catalogue, planned, pickKey]);

  // Deload: running this week, or suggested from the weeks in a row and fatigue.
  const thisMonday = mondayOfDate(today);
  const deloading = profile?.deloadWeek === thisMonday;
  // A deload week or a day of low form: the session starts lighter.
  const lighterToday = useLighterToday();
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
  // The load: on the home screen only when it rises too fast.
  const load = useMemo(() => trainingLoad({ today, workouts, sets }), [today, workouts, sets]);

  // The week: done, missed, and the next sessions placed on the training days ahead.
  // With a planning, the week shown can be moved; by default the next one
  // once nothing is left to do in this one (on a Saturday, say).
  const [weekChoice, setWeekChoice] = useState<number | null>(null);
  const shiftDays = (date: string, days: number) => localDateIn(days, Date.parse(`${date}T12:00:00`));
  const scheduleOf = useCallback(
    (monday: string) => {
      const sessions = scheduleSessions({ planned, workouts, from: monday, to: shiftDays(monday, 6), today });
      return scheduleWeek({ monday, today, planned, sessions, workouts });
    },
    [planned, workouts, today]
  );
  const weekOffset = useMemo(() => {
    if (!planned.length) return 0;
    if (weekChoice !== null) return weekChoice;
    return scheduleOf(weekStart).some((d) => d.status === "planned") ? 0 : 1;
  }, [planned, weekChoice, scheduleOf, weekStart]);

  // The week shown, with its sessions: a session there can be moved.
  const shownWeek = useMemo(
    () => (planned.length ? scheduleOf(shiftDays(weekStart, weekOffset * 7)) : []),
    [planned, scheduleOf, weekStart, weekOffset]
  );
  const [moveDate, setMoveDate] = useState<string | null>(null);
  const moves = profile?.scheduleMoves ?? [];
  const skippedOn = (date: string) =>
    planned.filter((p) => (p.moves ?? []).some((m) => m.from === date && m.to === null)).map((p) => p.program);
  const movable = shownWeek
    .filter((d) => d.sessions.some((x) => x.status === "planned" || x.status === "missed") || skippedOn(d.date).length > 0)
    .map((d) => d.date);
  const moveDay = shownWeek.find((d) => d.date === moveDate);
  // Weeks kept in a row: as many sessions as the planning asks for.
  const streak = useMemo(() => {
    const target = planned.length
      ? planned.reduce((sum, p) => sum + Math.min(p.days.length, sessionsPerWeek(p.program) || p.days.length), 0)
      : (profile?.trainingDays ?? []).length;
    return target ? weekStreak({ today, workouts, target }) : null;
  }, [planned, profile?.trainingDays, today, workouts]);

  const plan = useMemo(() => {
    if (planned.length) {
      return shownWeek.map((d) => ({
        date: d.date,
        weekday: d.weekday,
        today: d.today,
        status: d.status,
        label: d.sessions.filter((x) => x.status !== "missed").map((x) => x.label).concat(d.others).join(" + ") || undefined,
        sessions: d.sessions.filter((x) => x.status === "planned").map((x) => ({ label: x.label, program: x.program.name })),
      }));
    }
    const from = session ? (session.workoutId ? session.index + 1 : session.index) : 0;
    return weekPlan({
      monday: mondayOfDate(today),
      today,
      trainingDays: profile?.trainingDays ?? [],
      workouts,
      upcoming: session ? upcomingSessions(session.program, from, 7) : [],
    });
  }, [session, today, profile, workouts, planned, shownWeek]);

  const sessionWeek = session ? programWeek(session.program, today) : null;
  // The sport practised: the one chosen, else the one the last weeks show.
  const detected = useMemo(() => detectSport({ today, workouts, sets }), [today, workouts, sets]);
  const mainSport = prefs.sport ?? detected;
  const activity = kindOf(mainSport) ?? "strength";
  const overview = useMemo(
    () => weekOverview({ kind: activity, cardioSport: cardioSportOf(mainSport), monday: weekStart, today, workouts, sets }),
    [activity, mainSport, weekStart, today, workouts, sets]
  );
  // A sport chosen that the last weeks contradict: offer the one practised.
  const sportHint = detected && prefs.sport && kindOf(detected) !== kindOf(prefs.sport) && !closedCards.includes(`sport-${detected}`) ? detected : null;
  // Pressed for time: a shorter version of a strength session not begun, when it is long enough to shorten.
  const canExpress = !!session && session.date === today && !session.workoutId && !session.day.cardio && session.day.exercises.length > 1 && dayMinutes(session.day) > 25;
  // A plan just over (trained in the last four weeks): its review, until closed.
  const finishedProgram = programs.find(
    (p) =>
      !!p.startDate &&
      !isTestProgram(p) &&
      !closedCards.includes(`review-${p.uuid}`) &&
      !!programWeek(p, today)?.finished &&
      workouts.some((w) => w.date >= localDateIn(-28, now) && findWorkoutProgramDay([p], w))
  );
  // The level tests, once done, again every six weeks.
  const testProgram = programs.find((p) => isTestProgram(p) && !p.assignedToUserId);
  const tests = testProgram ? testsDue({ program: testProgram, workouts, today }) : null;

  // The notes of the home screen, most pressing first: a load rising too fast,
  // a low form, a deload week, a program just over, last week's report, the
  // tests due, the sport practised. Only the first shows open.
  const lowForm = lighterToday.reason === "deload" ? null : lighterToday.readiness;
  const deloadShown = deloading || (!!deload && deloadLaterFor() !== thisMonday);
  const notes: { key: string; node: ReactNode }[] = [
    ...(load && (load.zone === "caution" || load.zone === "danger") ? [{ key: "load", node: <TrainingLoadCard key="load" load={load} /> }] : []),
    ...(lowForm !== null && lowForm < LOW_READINESS ? [{ key: "form", node: <Fragment key="form"><ReadinessBanner readiness={lowForm} keptNormal={lighterToday.keptNormal} onKeep={lighterToday.setKeptNormal} /></Fragment> }] : []),
    ...(deloadShown ? [{ key: "deload", node: <DeloadCard key="deload" advice={deload} monday={thisMonday} active={deloading} hasProfile={!!profile} /> }] : []),
    ...(finishedProgram ? [{ key: "review", node: <Fragment key="review"><HomeNote
              icon={PartyPopper}
              title={t("programDone", { name: finishedProgram.name })}
              text={t("programDoneText")}
              href={`/programs/${finishedProgram.id}#bilan`}
              action={t("programDoneAction")}
              onClose={() => closeCard(`review-${finishedProgram.uuid}`)}
            /></Fragment> }] : []),
    ...(showReport ? [{ key: "report", node: <Fragment key="report"><WeeklyReportCard
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
            /></Fragment> }] : []),
    ...(tests?.due && !closedCards.includes(`tests-${tests.next}`) ? [{ key: "tests", node: <Fragment key="tests">`tests-${tests.next}`) && (
            <HomeNote
              icon={Gauge}
              title={t("testsDue")}
              text={t("testsDueText", { date: short(tests.last) })}
              href="/tests"
              action={t("testsDueAction")}
              onClose={() => closeCard(`tests-${tests.next}`)}
            /></Fragment> }] : []),
    ...(sportHint ? [{ key: "sport", node: <Fragment key="sport"><HomeNote
              icon={Sparkles}
              title={t("sportHint", { sport: tcat(sportHint === "callisthenics" ? "cat_timed" : `cat_${sportHint}`) })}
              text={t("sportHintText")}
              action={t("sportHintAction")}
              onAction={() => savePrefs({ sport: sportHint, sport2: prefs.sport === sportHint ? prefs.sport2 : prefs.sport })}
              onClose={() => closeCard(`sport-${sportHint}`)}
            /></Fragment> }] : []),
  ];
  // The next sessions of the planning, over two weeks: a plan starting next Monday shows already.
  const upcoming = useMemo(
    () =>
      planned.length
        ? scheduleSessions({ planned, workouts, from: today, to: localDateIn(13, now), today })
            .filter((x) => x.status === "planned")
            .map((x) => ({ date: x.date, label: x.label, program: x.program.name }))
        : undefined,
    [planned, workouts, today, now]
  );
  const competitions = useCompetitions();

  /** The next eight weeks of sessions, and the competitions ahead, as a calendar file. */
  function exportCalendar() {
    const from = session ? (session.workoutId ? session.index + 1 : session.index) : 0;
    const sessions = planned.length
      ? scheduleSessions({ planned, workouts, from: today, to: localDateIn(55, now), today })
          .filter((x) => x.status === "planned")
          .map((x) => ({ date: x.date, label: x.label, program: x.program.name }))
      : plannedSessions({
      today,
      trainingDays: profile?.trainingDays ?? [],
      workouts,
          upcoming: session ? upcomingSessions(session.program, from, 8 * 7) : [],
          weeks: 8,
        }).map((x) => ({ ...x, program: session?.program.name }));
    const ics = planCalendar({
      sessions: sessions.map((s) => ({ date: s.date, title: t("calendarSession", { name: s.label }), description: s.program })),
      competitions: competitions
        .filter((c) => c.date >= today)
        .map((c) => ({ date: c.date, title: t("calendarCompetition", { name: c.event }), description: c.category ?? undefined })),
      time: profile?.trainingTime ?? null,
      owner: user?.id ?? "me",
      calendarName: "TrainTrack",
      now: new Date(),
    });
    downloadFile(ics, "traintrack-seances.ics", "text/calendar");
    setFlag("calendar", "calendar-exported");
  }

  const percent = useMemo(() => {
    if (!session?.workoutId) return 0;
    const running = workouts.find((w) => w.id === session.workoutId);
    if (running && isCardio(running)) return isCardioDone(running) ? 100 : 0;
    const own = sets.filter((s) => s.workoutId === session.workoutId);
    return own.length ? Math.round((own.filter((s) => s.completed).length / own.length) * 100) : 0;
  }, [sets, session, workouts]);


  // Ready-made programs the user has not added yet.
  const templates = catalogue.filter((tpl) => !programs.some((p) => p.name === tpl.name));

  const goal = session ? weeklyGoal(session.program, session.day) : 0;
  const needsOnboarding = profile !== undefined && !profile;
  // A new athlete goes straight to the guided set-up, unless they chose "later".
  useEffect(() => {
    if (needsOnboarding && !flags.onboardingLater) router.replace("/onboarding");
  }, [needsOnboarding, flags.onboardingLater, router]);

  async function start() {
    if (session?.workoutId) {
      router.push(sessionHref(session.workoutId));
      return;
    }
    if (!session) {
      router.push("/log");
      return;
    }
    await startDay(session.program, session.index);
  }

  /** Start a program day; a shorter version of it when given (still that day of the program). */
  async function startDay(program: Program, index: number, shorter?: ProgramDay) {
    setChoosing(false);
    setExpressOpen(false);
    setStarting(true);
    try {
      // A beginner's very first session opens in guided mode.
      const first = workouts.length === 0 && profile?.fitnessLevel === "beginner";
      const source = shorter ? { ...program, structure: program.structure.map((d, i) => (i === index ? shorter : d)) } : program;
      const id = await startWorkoutFromDay(source, index, exercises, today, lighterToday.start);
      router.push(first && !program.structure[index]?.cardio ? `${sessionHref(id)}&guided=1` : sessionHref(id));
    } finally {
      setStarting(false);
    }
  }

  const trainable = programs.filter((p) => (p.structure ?? []).length > 0);

  // The sessions without a program, those of one's sports first.
  const runner = prefs.sport === "running" || prefs.sport2 === "running" || detected === "running";
  const freeRows = [
    { key: "free", rank: activity === "strength" ? 0 : 3, node: <DetailRow key="free" onClick={startFree} disabled={starting} icon={Plus} tone="neutral" title={t("freeSession")} subtitle={t("freeSessionHint")} /> },
    { key: "intervals", rank: activity === "bodyweight" ? 0 : 4, node: <DetailRow key="intervals" href="/intervals" icon={Timer} tone="neutral" title={ti("title")} subtitle={ti("hint")} /> },
    ...(runner ? [{ key: "running", rank: 1, node: <DetailRow key="running" href="/running" icon={Footprints} tone="neutral" title={t("runIntervals")} subtitle={t("runIntervalsHint")} /> }] : []),
    { key: "mobility", rank: 5, node: <DetailRow key="mobility" href="/mobility" icon={PersonStanding} tone="neutral" title={tmo("title")} subtitle={tmo("hint")} /> },
    {
      key: "endurance",
      rank: activity === "endurance" || activity === "vaulting" ? 0 : 2,
      node: <DetailRow key="endurance" onClick={() => { setChoosing(false); setSportOpen(true); }} disabled={starting} icon={Activity} tone="neutral" title={tc("newSession")} subtitle={tc("newSessionHint")} />,
    },
  ].sort((a, b) => a.rank - b.rank);
  const repeatable = lastRepeatable(workouts, sets, today);

  async function repeatLast() {
    if (!repeatable) return;
    setChoosing(false);
    setStarting(true);
    try {
      const id = await repeatWorkout(repeatable, today, lighterToday.start);
      router.push(sessionHref(id));
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
    router.push(sessionHref(id));
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
      router.push(sessionHref(id));
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
          <Link href={sessionHref(comments[0].workoutId)} aria-label={t("newComments", { count: comments.length })} className="relative flex size-11 items-center justify-center rounded-lg text-foreground">
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
        <section className="t-hero space-y-4 rounded-3xl p-6">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-text">
            <Sparkles className="size-7" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{t("welcomeTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("welcomeText")}</p>
          </div>
          <ul className="space-y-1.5 text-sm">
            {(["welcomeStep1", "welcomeStep2", "welcomeStep3"] as const).map((k) => (
              <li key={k} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden="true" />
                {t(k)}
              </li>
            ))}
          </ul>
          <Link href="/onboarding" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full")}>
            {t("welcomeStart")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <>
          <section className="t-hero relative overflow-hidden rounded-3xl p-5">
            {picture.scene ? (
              <>
                {/* A whole illustration: behind the card, faded on the side of the text. */}
                <Image
                  src={picture.src}
                  alt=""
                  fill
                  unoptimized
                  className="pointer-events-none object-cover object-right opacity-90 [mask-image:linear-gradient(to_right,transparent_15%,black_70%)]"
                />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-r from-background/70 via-background/25 to-transparent" />
              </>
            ) : (
              <Image
                src={picture.src}
                alt=""
                width={Math.round((picture.width * 209) / picture.height)}
                height={209}
                unoptimized
                className="pointer-events-none absolute top-2 left-[33%] opacity-55 [mask-image:linear-gradient(to_right,transparent_8%,black_45%)] dark:opacity-50"
              />
            )}
            <div className="relative flex items-start justify-between gap-3">
              <div className="max-w-[60%] min-w-0">
                <p className="text-xs font-semibold tracking-widest text-accent-text uppercase">
                  {session && session.date !== today
                    ? t("nextSessionOn", { date: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${session.date}T00:00:00Z`)) })
                    : t("todaySession")}
                </p>
                <h2 className="mt-1 line-clamp-2 text-3xl leading-tight font-bold tracking-tight break-words">{session?.day.name ?? t("freeSession")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {session
                    ? `${session.program.name} · ${dayDetail(session.day)}`
                    : t("freeSessionDesc")}
                  {sessionWeek && (
                    <span className="mt-0.5 block text-xs font-semibold text-accent-text">
                      {!sessionWeek.started
                        ? t("programStarts", { date: short(session!.program.startDate!) })
                        : sessionWeek.total
                          ? t("programWeekOf", { week: sessionWeek.week, total: sessionWeek.total })
                          : t("programWeek", { week: sessionWeek.week })}
                    </span>
                  )}
                </p>
              </div>
              <ProgressRing percent={percent} />
            </div>
            {session && session.options.length > 1 && (
              <div className="relative mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t("sameDay")}>
                {session.options.map((o) => {
                  const on = o.program.id === session.program.id && o.index === session.index && o.workoutId === session.workoutId;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setPickKey(o.key)}
                      aria-pressed={on}
                      className={cn(
                        "min-h-9 rounded-full px-3 text-xs font-semibold",
                        on ? "bg-accent-600 text-white" : "t-surface text-foreground ring-1 ring-foreground/10"
                      )}
                    >
                      {o.workoutId ? "✓ " : ""}
                      {o.program.structure[o.index]?.name} · {o.program.name}
                    </button>
                  );
                })}
              </div>
            )}
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
            {canExpress && (
              <button
                type="button"
                onClick={() => setExpressOpen(true)}
                className="relative mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-accent-text ring-1 ring-accent-500/30"
              >
                <Timer className="size-4" aria-hidden="true" />
                {t("express")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setChoosing(true)}
              className="relative mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 text-sm font-semibold text-accent-text"
            >
              <ListChecks className="size-4" aria-hidden="true" />
              {t("changeSession")}
            </button>
          </section>

          {/* A new athlete's first steps, for a month, until done or hidden. */}
          {profile && !flags.stepsClosed && Date.parse(profile.createdAt) > now - 30 * 86_400_000 && (
            <FirstSteps
              onDismiss={() => setFlag("stepsClosed", "first-steps-closed")}
              steps={[
                { key: "plan", done: programs.some((p) => (p.weekdays ?? []).length > 0), label: tf("plan"), href: "/programs" },
                { key: "session", done: workouts.length > 0, label: tf("session"), onClick: start },
                ...(hasFeature("readiness") ? [{ key: "readiness", done: readiness.length > 0, label: tf("readiness"), href: "/readiness" }] : []),
                { key: "calendar", done: !!flags.calendar, label: tf("calendar"), onClick: exportCalendar },
                { key: "look", done: !!flags.look || prefs.style !== "classic", label: tf("look"), href: "/settings", onClick: () => setFlag("look", "look-seen") },
              ]}
            />
          )}

          {/* One thing at a time: the most pressing note, the others folded under "To look at". */}
          {notes.length > 0 && notes[0].node}
          {notes.length > 1 && (
            <details className="t-surface rounded-2xl px-4 py-1 ring-1 ring-foreground/5">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
                <ListChecks className="size-4 text-accent-text" aria-hidden="true" />
                {t("toLookAt", { count: notes.length - 1 })}
              </summary>
              <div className="space-y-3 pt-1 pb-3">{notes.slice(1).map((n) => n.node)}</div>
            </details>
          )}

          <WeekStrip
            plan={plan}
            planned={planned.length > 0 || (profile?.trainingDays ?? []).length > 0}
            onExport={exportCalendar}
            upcoming={upcoming}
            offset={planned.length ? weekOffset : undefined}
            onOffset={(n) => setWeekChoice(Math.max(-4, Math.min(8, n)))}
            streak={streak?.weeks}
            movable={profile ? movable : undefined}
            onPickDay={setMoveDate}
          />
          {canExpress && (
            <ExpressDialog
              key={`${session!.program.id}-${session!.index}`}
              day={session!.day}
              open={expressOpen}
              onOpenChange={setExpressOpen}
              onStart={(shorter) => startDay(session!.program, session!.index, shorter)}
            />
          )}
          <MoveSessionDialog
            date={moveDay ? moveDate : null}
            sessions={moveDay?.sessions.filter((x) => x.status === "planned" || x.status === "missed") ?? []}
            skipped={moveDate ? skippedOn(moveDate) : []}
            planned={planned}
            moves={moves}
            today={today}
            workouts={workouts}
            onClose={() => setMoveDate(null)}
          />

          <MyPrograms
            programs={programs}
            workouts={workouts}
            catalogue={[...catalogue, ...PROGRAM_TEMPLATES]}
            today={today}
            favorite={prefs.sport}
            onContinue={(program) => {
              const running = workouts.find((w) => w.date === today && findWorkoutProgramDay([program], w));
              if (running?.id) router.push(sessionHref(running.id));
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
                      subtitle={`${repeatable.title || t("freeSession")} · ${day(repeatable.date)}`}
                    />
                  )}
                  {freeRows.map((row) => row.node)}
                  <GpxImport
                    existing={workouts}
                    onImported={({ workoutId }) => {
                      setChoosing(false);
                      router.push(sessionHref(workoutId));
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
              <OverviewTile
                icon={overview.metric === "distance" ? Footprints : overview.metric === "volume" ? Dumbbell : overview.metric === "reps" ? Repeat : Timer}
                label={t(`metric_${overview.metric}`)}
                value={num(overview.value, overview.unit === "km" ? 1 : 0)}
                hint={t(`unit_${overview.unit}`)}
                tile="oklch(0.74 0.17 55)"
              />
              {hasFeature("nutrition") ? (
                <OverviewTile icon={Flame} label={t("calories")} value={num(Math.round(sumMacros(nutritionToday).calories), 0)} hint={t("kcalToday")} tile="var(--accent-400)" />
              ) : (
                <OverviewTile icon={CalendarCheck} label={t("workouts")} value={overview.sessions} hint={t("thisWeek")} tile="var(--accent-400)" />
              )}
              <OverviewTile
                icon={TrendingUp}
                label={t("progression")}
                value={overview.change === null ? "—" : `${overview.change > 0 ? "+" : ""}${overview.change}%`}
                hint={t("vsSameDay")}
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
                <div className="t-sunken mt-2 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.min(overview.sessions, goal)} aria-valuemin={0} aria-valuemax={goal} aria-label={t("weeklyGoal")}>
                  <div className="h-full rounded-full bg-linear-to-r from-accent-700 to-accent-400 shadow-[inset_0_1px_0_oklch(1_0_0/0.4)]" style={{ width: `${Math.min(100, (overview.sessions / goal) * 100)}%` }} />
                </div>
              </div>
              <p className="shrink-0 text-right">
                <span className="text-lg font-semibold tabular-nums">{overview.sessions}</span>
                <span className="text-muted-foreground"> / {goal}</span>
                <span className="block text-xs text-muted-foreground">{t("sessions")}</span>
              </p>
            </section>
          )}

          {comments.length > 0 && (
            <Link href={sessionHref(comments[0].workoutId)} className="block">
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
