"use client";

import { sessionHref } from "@/lib/routes";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useTrainablePrograms } from "@/hooks/usePrograms";
import { useProgramTemplates } from "@/lib/templateService";
import { useUnreadComments } from "@/hooks/useCoachComments";
import { useExercises } from "@/hooks/useExercises";
import { useTodayReadiness, useReadiness, readinessScore } from "@/hooks/useReadiness";
import { DeloadCard, deloadLaterFor } from "@/components/domain/DeloadCard";
import { LOW_READINESS } from "@/lib/readinessAdjust";
import { ReadinessBanner } from "@/components/domain/ReadinessBanner";
import { useLighterToday } from "@/hooks/useLighterToday";
import { WeeklyReportCard } from "@/components/domain/WeeklyReportCard";
import { homePicture } from "@/lib/appTheme";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { usePainReports } from "@/hooks/usePain";
import { deloadAdvice } from "@/lib/deload";
import { trainingLoad } from "@/lib/trainingLoad";
import { TrainingLoadCard } from "@/components/domain/TrainingLoadCard";
import { FirstSteps } from "@/components/domain/FirstSteps";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useTeams } from "@/hooks/useTeams";
import { findWorkoutProgramDay } from "@/lib/startWorkout";
import { programWeek } from "@/lib/programWeek";
import { isCardio, isCardioDone } from "@/lib/cardio";
import { weekGoal } from "@/lib/weekGoal";
import { weekSummary } from "@/lib/weekSummary";
import { doneSessions } from "@/lib/doneSessions";
import { SportPicker } from "@/components/domain/SportPicker";
import { WeekStrip } from "@/components/domain/WeekStrip";
import { mondayOfDate, plannedSessions, upcomingSessions, weekPlan } from "@/lib/weekPlan";
import { planCalendar } from "@/lib/ics";
import { scheduleSessions, scheduleWeek, sessionsPerWeek } from "@/lib/schedule";
import { weekStreak } from "@/lib/weekStreak";
import { MoveSessionDialog } from "@/components/domain/MoveSessionDialog";
import { ExpressDialog } from "@/components/domain/ExpressDialog";
import { dayMinutes } from "@/lib/express";
import { isTestProgram, testsDue } from "@/lib/levelTests";
import { detectSport, kindOf } from "@/lib/activityProfile";
import { savePrefs } from "@/lib/appTheme";
import { downloadFile } from "@/lib/exportService";
import { useCompetitions } from "@/hooks/useCompetitions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { RecommendationRow, useRecommendations } from "@/components/domain/Recommendations";
import { SessionPickerDialog, useDayDetail } from "@/components/domain/SessionPickerDialog";
import { useStartActions } from "@/hooks/useStartActions";
import { useSessionOfTheDay } from "@/hooks/useSessionOfTheDay";
import { useInsights } from "@/hooks/useInsights";
import { HomeInsight } from "@/components/domain/InsightCard";
import type { ReactNode } from "react";
import {
  type LucideIcon,
  ArrowRight, Check, ListChecks, MessageSquare, Sparkles, Bell, ChevronRight, ClipboardList, HeartPulse, Loader2, Settings, Target, TrendingUp,
  Timer,
  PartyPopper,
  Gauge,
  X,
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
  const trec = useTranslations("recommend");
  const tm = useTranslations("more");
  const tcat = useTranslations("catalog");
  const router = useRouter();
  const { user, profile: account } = useAuth();
  const profile = useAthleteProfile();
  const readiness = useReadiness();
  const { num, short } = useFormat();
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
  const recommendations = useRecommendations();
  const { hasFeature } = useFeatureAccess();
  const { memberships } = useTeams();
  const [now] = useState(() => Date.now());
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

  const today = localDate(now);
  const hasTeamInvite = memberships.some((m) => m.status === "pending");
  const name = account?.display_name ?? user?.email?.split("@")[0] ?? "";
  const readyScore = todayReadiness ? readinessScore(todayReadiness) : null;

  // The programs in the planning (given days), all shown together in the week,
  // and the session of the day they lead to.
  const weekStart = mondayOfDate(today);
  const { planned, session, setPickKey } = useSessionOfTheDay({ programs, workouts, today, profile, userId: user?.id, sport: prefs.sport, catalogue });
  // Deload: running this week, or suggested from the weeks in a row and fatigue.
  const thisMonday = mondayOfDate(today);
  const deloading = profile?.deloadWeek === thisMonday;
  // A deload week or a day of low form: the session starts lighter.
  const lighterToday = useLighterToday();
  const actions = useStartActions({
    today,
    workouts,
    sets,
    exercises,
    profile,
    lighter: lighterToday.start,
    onStart: () => {
      setChoosing(false);
      setExpressOpen(false);
      setSportOpen(false);
    },
  });
  const { starting, startDay } = actions;
  // Last week's report, from Monday to Wednesday, until closed.
  const lastMonday = mondayOfDate(localDateIn(-7, now));
  const showReport =
    hasFeature("reports") &&
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
    // Only sessions done count, as for the week's goal and Performance.
    return target ? weekStreak({ today, workouts: doneSessions(workouts, sets), target }) : null;
  }, [planned, profile?.trainingDays, today, workouts, sets]);

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
  // "All sports": nothing guessed, the app as it was before it followed the sport.
  const detected = useMemo(() => (prefs.allSports ? null : detectSport({ today, workouts, sets })), [prefs.allSports, today, workouts, sets]);
  const mainSport = prefs.sport ?? detected;
  const activity = kindOf(mainSport) ?? "strength";
  // A sport chosen that the last weeks contradict: offer the one practised.
  const sportHint = detected && prefs.sport && kindOf(detected) !== kindOf(prefs.sport) && !closedCards.includes(`sport-${detected}`) ? detected : null;
  // Pressed for time: a shorter version of a strength session not begun, when it is long enough to shorten.
  const canExpress = hasFeature("planning") && !!session && session.date === today && !session.workoutId && !session.day.cardio && session.day.exercises.length > 1 && dayMinutes(session.day) > 25;
  // A plan just over (trained in the last four weeks): its review, until closed.
  const finishedProgram = !hasFeature("reports") ? undefined : programs.find(
    (p) =>
      !!p.startDate &&
      !isTestProgram(p) &&
      !closedCards.includes(`review-${p.uuid}`) &&
      !!programWeek(p, today)?.finished &&
      workouts.some((w) => w.date >= localDateIn(-28, now) && findWorkoutProgramDay([p], w))
  );
  // The level tests, once done, again every six weeks.
  const testProgram = programs.find((p) => isTestProgram(p) && !p.assignedToUserId);
  const tests = testProgram && hasFeature("level_tests") ? testsDue({ program: testProgram, workouts, today }) : null;

  // The signal of the day, most pressing first: a load rising too fast, a low
  // form, the same pain again, a coach's comments, a team invitation, a deload
  // week, a program just over, last week's report, the tests due, what the
  // last four weeks say (records, volume, distance, a stall, regularity),
  // today's form to give, the sport practised, the first piece of advice, the
  // work kept up, today's form given. Only the first shows open; the others
  // are folded under "Also to look at".
  const lowForm = lighterToday.reason === "deload" ? null : lighterToday.readiness;
  const deloadShown = deloading || (!!deload && deloadLaterFor() !== thisMonday);
  // Actionable news, in the signal of the day: a coach's comments, a team invitation.
  const commentsNode = comments.length > 0 && (
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
  );
  const inviteNode = hasTeamInvite && (
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
  );
  // Today's form: asked for when not given yet; otherwise its score, when nothing else is pressing.
  const readinessNode = hasFeature("readiness") && (
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
  );
  const topRecommendation = recommendations[0];
  // What the last four weeks say, as Performance reads it: placed in this list by its kind.
  // The load has its own card here; too little data is the first steps' business.
  const reading = useInsights({ today, workouts, sets, pains, readiness, profile });
  const exerciseName = (id: number) => exercises.find((e) => e.id === id)?.name;
  const insightOf = (kinds: string[]) => reading.insights.find((i) => kinds.includes(i.kind));
  const painInsight = insightOf(["pain"]);
  const progressInsight = insightOf(["records", "volumeUp", "volumeDown", "distanceUp", "distanceDown", "stagnation", "regularity"]);
  const steadyInsight = insightOf(["steady"]);
  const insightNote = (key: string, i: NonNullable<typeof painInsight>) => ({ key, node: <HomeInsight key={key} insight={i} exerciseName={exerciseName} /> });
  const notes: { key: string; node: ReactNode }[] = [
    ...(load && (load.zone === "caution" || load.zone === "danger") ? [{ key: "load", node: <TrainingLoadCard key="load" load={load} /> }] : []),
    ...(lowForm !== null && lowForm < LOW_READINESS ? [{ key: "form", node: <Fragment key="form"><ReadinessBanner readiness={lowForm} keptNormal={lighterToday.keptNormal} onKeep={lighterToday.setKeptNormal} /></Fragment> }] : []),
    ...(painInsight ? [insightNote("insight-pain", painInsight)] : []),
    ...(commentsNode ? [{ key: "comments", node: <Fragment key="comments">{commentsNode}</Fragment> }] : []),
    ...(inviteNode ? [{ key: "invite", node: <Fragment key="invite">{inviteNode}</Fragment> }] : []),
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
    ...(tests?.due && !closedCards.includes(`tests-${tests.next}`) ? [{ key: "tests", node: <Fragment key="tests">
            <HomeNote
              icon={Gauge}
              title={t("testsDue")}
              text={t("testsDueText", { date: short(tests.last) })}
              href="/tests"
              action={t("testsDueAction")}
              onClose={() => closeCard(`tests-${tests.next}`)}
            /></Fragment> }] : []),
    ...(progressInsight ? [insightNote("insight", progressInsight)] : []),
    ...(readinessNode && readyScore == null ? [{ key: "readiness", node: <Fragment key="readiness">{readinessNode}</Fragment> }] : []),
    ...(sportHint ? [{ key: "sport", node: <Fragment key="sport"><HomeNote
              icon={Sparkles}
              title={t("sportHint", { sport: tcat(sportHint === "callisthenics" ? "cat_timed" : `cat_${sportHint}`) })}
              text={t("sportHintText")}
              action={t("sportHintAction")}
              onAction={() => savePrefs({ sport: sportHint, sport2: prefs.sport === sportHint ? prefs.sport2 : prefs.sport })}
              onClose={() => closeCard(`sport-${sportHint}`)}
            /></Fragment> }] : []),
    ...(topRecommendation ? [{ key: "advice", node: (
      <Card key="advice">
        <CardContent className="space-y-2.5 py-4">
          <p className="text-sm font-semibold text-muted-foreground">{trec("title")}</p>
          <RecommendationRow rec={topRecommendation} />
        </CardContent>
      </Card>
    ) }] : []),
    ...(steadyInsight ? [insightNote("insight-steady", steadyInsight)] : []),
    ...(readinessNode && readyScore != null ? [{ key: "readiness", node: <Fragment key="readiness">{readinessNode}</Fragment> }] : []),
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

  // The week in one line: kilos only for loaded sets, otherwise the activities done.
  const summary = useMemo(() => weekSummary({ monday: weekStart, today, workouts, sets }), [weekStart, today, workouts, sets]);
  // The program's own sessions against its goal; the rest of the week apart.
  const goal = useMemo(
    () => (session ? weekGoal({ program: session.program, day: session.day, monday: weekStart, today, workouts, sets }) : null),
    [session, weekStart, today, workouts, sets]
  );
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

  const trainable = programs.filter((p) => (p.structure ?? []).length > 0);

  const runner = prefs.sport === "running" || prefs.sport2 === "running" || detected === "running";
  const dayDetail = useDayDetail();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-28 md:px-6 md:pt-6">
      <header className="t-brand-header relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 md:px-4">
        <Image
          src="/images/dumbbell.webp"
          alt=""
          width={128}
          height={99}
          unoptimized
          className="pointer-events-none absolute -top-8 -right-9 -z-10 opacity-15 grayscale dark:opacity-20"
        />
        <Link
          href="/profile"
          aria-label={tm("profile")}
          className="t-brand-mark flex size-12 shrink-0 items-center justify-center rounded-xl text-accent-text"
        >
          <Image src="/icons/logo.png" alt="" width={34} height={34} unoptimized priority />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="t-wordmark" aria-hidden="true"><span>Train</span>Track</p>
          <h1 className="truncate text-sm font-bold text-[#f7f7fb]/90">{t("greeting", { name })}</h1>
        </div>
        {comments.length > 0 ? (
          <Link href={sessionHref(comments[0].workoutId)} aria-label={t("newComments", { count: comments.length })} className="relative flex size-11 items-center justify-center rounded-lg text-[#f7f7fb]">
            <Bell className="size-6" aria-hidden="true" />
            <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent-600 ring-2 ring-background" />
          </Link>
        ) : hasTeamInvite && (
          <Link href="/teams" aria-label={t("teamInvite")} className="relative flex size-11 items-center justify-center rounded-lg text-[#f7f7fb]">
            <Bell className="size-6" aria-hidden="true" />
            <span className="absolute right-2 top-2 size-2.5 rounded-full bg-accent-600 ring-2 ring-background" />
          </Link>
        )}
        <Link
          href="/settings"
          aria-label={tm("settings")}
          className="t-panel flex size-11 items-center justify-center rounded-xl text-foreground"
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
          {/* Three zones: the next thing to do and the week, then the signal of the day. */}
          <div className="space-y-5 md:grid md:grid-cols-3 md:items-start md:gap-6 md:space-y-0">
            <div className="space-y-5 md:col-span-2">
              <section className="t-hero relative overflow-hidden rounded-2xl p-5 md:p-7">
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
                    <p className="t-kicker">
                      {session && session.date !== today
                        ? t("nextSessionOn", { date: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${session.date}T00:00:00Z`)) })
                        : t("todaySession")}
                    </p>
                    <h2 className="t-display mt-2 line-clamp-3 text-3xl break-words sm:text-4xl md:text-5xl">{session?.day.name ?? t("freeSession")}</h2>
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
                  <Button onClick={start} disabled={starting} className="px-5">
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
                      className="flex h-11 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold whitespace-nowrap text-white hover:bg-white/15"
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
                    ...(hasFeature("planning") ? [{ key: "calendar", done: !!flags.calendar, label: tf("calendar"), onClick: exportCalendar }] : []),
                    { key: "look", done: !!flags.look || prefs.style !== "classic", label: tf("look"), href: "/settings", onClick: () => setFlag("look", "look-seen") },
                  ]}
                />
              )}

              <WeekStrip
                plan={plan}
                planned={planned.length > 0 || (profile?.trainingDays ?? []).length > 0}
                onExport={hasFeature("planning") ? exportCalendar : undefined}
                upcoming={upcoming}
                offset={planned.length ? weekOffset : undefined}
                onOffset={(n) => setWeekChoice(Math.max(-4, Math.min(8, n)))}
                streak={streak?.weeks}
                movable={profile && hasFeature("planning") ? movable : undefined}
                onPickDay={setMoveDate}
              />
              {goal && goal.target > 0 && (
                <section className="t-panel flex items-center gap-3 rounded-xl p-4">
                  <Target className="size-8 shrink-0 text-accent-text" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t("weeklyGoal")}</p>
                    <p className="truncate text-xs text-muted-foreground">{t("goalProgram", { name: session!.program.name })}</p>
                    <div className="t-sunken mt-2 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.min(goal.done, goal.target)} aria-valuemin={0} aria-valuemax={goal.target} aria-label={t("weeklyGoal")}>
                      <div className="h-full rounded-full bg-linear-to-r from-accent-700 to-accent-400 shadow-[inset_0_1px_0_oklch(1_0_0/0.4)]" style={{ width: `${Math.min(100, (goal.done / goal.target) * 100)}%` }} />
                    </div>
                    {(goal.done >= goal.target || goal.others > 0) && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {goal.done >= goal.target && <span className="font-semibold text-accent-text">{t("goalReached", { beyond: goal.beyond })}</span>}
                        {goal.done >= goal.target && goal.others > 0 && " · "}
                        {goal.others > 0 && t("otherActivities", { count: goal.others })}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="text-lg font-semibold tabular-nums">{Math.min(goal.done, goal.target)}</span>
                    <span className="text-muted-foreground"> / {goal.target}</span>
                    <span className="block text-xs text-muted-foreground">{t("sessions")}</span>
                  </p>
                </section>
              )}

              {/* The week in one line; the details in Performance. */}
              <section>
                <Link href="/progress" className="t-panel flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:border-accent-500/40">
                  <TrendingUp className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t("overview")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {summary.kind === "volume"
                        ? `${t("weekVolume", { kg: num(summary.kg, 0) })}${summary.change !== null ? ` · ${summary.change > 0 ? "+" : ""}${summary.change}% ${t("vsSameDay")}` : ""}`
                        : t("weekActivities", { count: summary.count })}
                    </span>
                    {summary.kind === "activities" && <span className="block text-xs text-muted-foreground">{t("seeAnalysis")}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-accent-text">
                    {t("seeAll")}
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              </section>
            </div>

            <div className="space-y-3">
              {/* One thing at a time: the most pressing note, the others folded under "To look at". */}
              {notes.length > 0 && notes[0].node}
              {notes.length > 1 && (
                <details className="t-panel rounded-xl px-4 py-1">
                  <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
                    <ListChecks className="size-4 text-accent-text" aria-hidden="true" />
                    {t("toLookAt", { count: notes.length - 1 })}
                  </summary>
                  <div className="space-y-3 pt-1 pb-3">{notes.slice(1).map((n) => n.node)}</div>
                </details>
              )}
            </div>
          </div>

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
          <SportPicker open={sportOpen} onOpenChange={setSportOpen} onPick={actions.startCardio} />

          <SessionPickerDialog
            open={choosing}
            onOpenChange={setChoosing}
            programs={trainable}
            templates={templates}
            workouts={workouts}
            today={today}
            actions={actions}
            activity={activity}
            allSports={prefs.allSports}
            runner={runner}
            onEndurance={() => setSportOpen(true)}
          />
        </>
      )}
    </div>
  );
}
