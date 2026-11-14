"use client";

import { sessionHref } from "@/lib/routes";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, Check, LogOut, Loader2, Pencil, Share2, UserCheck, Wand2 } from "lucide-react";
import { shareLink, shareProgram } from "@/lib/shareService";
import { getCurrentUserIdSync, type ProgramDay } from "@/db";
import { useRouter } from "@/i18n/navigation";
import { useLighterToday } from "@/hooks/useLighterToday";
import { deleteProgram, updateProgram, useProgram } from "@/hooks/usePrograms";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useExercises } from "@/hooks/useExercises";
import { describeTarget } from "@/lib/cardio";
import { localDate } from "@/lib/dates";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { useFormat } from "@/lib/format";
import { planWeeks, programCategory } from "@/lib/programCategories";
import { customisedName, programOrigin } from "@/lib/programOrigin";
import { programProgress } from "@/lib/programCards";
import { PROGRAM_TEMPLATES } from "@/lib/programTemplates";
import { nextMonday, programWeek } from "@/lib/programWeek";
import { findWorkoutProgramDay, nextDayIndex, startWorkoutFromDay } from "@/lib/startWorkout";
import { useReadyMadeNames } from "@/lib/templateService";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/domain/ProgramCatalog";
import { SeasonTarget } from "@/components/domain/SeasonTarget";

/**
 * A program as one follows it: what it is, how far one is, its sessions week
 * by week, and the next one to start. One's own programs open the editor from
 * here; a ready-made program can be left or customised; a coach's is followed
 * as it is.
 */
export default function ProgramPage() {
  const t = useTranslations("programView");
  const tp = useTranslations("programs");
  const tc = useTranslations("catalog");
  const xl = useExerciseLabel();
  const { day } = useFormat();
  const router = useRouter();
  const programId = Number(useParams().id);
  const program = useProgram(programId);
  const workouts = useWorkouts();
  const exercises = useExercises();
  const readyMade = useReadyMadeNames();
  const lighterToday = useLighterToday();
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const locale = useLocale();
  const today = localDate();

  const origin = program ? programOrigin(program, getCurrentUserIdSync(), readyMade) : null;
  const days = useMemo(() => program?.structure ?? [], [program]);
  const done = useMemo(() => {
    if (!program) return new Set<number>();
    return new Set(workouts.map((w) => findWorkoutProgramDay([program], w)?.index).filter((i): i is number => i !== undefined));
  }, [program, workouts]);

  if (!program || !origin) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  const category = programCategory(program, PROGRAM_TEMPLATES);
  const weeks = planWeeks(days);
  const calendar = programWeek(program, today);
  const progress = programProgress(program, workouts);
  // A coach looking at a client's copy does not train it.
  const forSomeoneElse = !!program.assignedToUserId && program.assignedToUserId !== getCurrentUserIdSync();
  const next = days.length && !forSomeoneElse ? nextDayIndex(program, workouts, today) : null;
  const running = workouts.find((w) => w.date === today && findWorkoutProgramDay([program], w));
  const perWeek = weeks ? Math.round(days.length / weeks) : days.length;

  async function start() {
    if (running?.id) return router.push(sessionHref(running.id));
    if (next === null || !program) return;
    setBusy(true);
    try {
      const id = await startWorkoutFromDay(program, next, exercises, today, lighterToday.start);
      router.push(sessionHref(id));
    } finally {
      setBusy(false);
    }
  }

  async function customise() {
    // Renamed, it is no longer the ready-made program: one's own, to edit.
    // The sessions done stay linked to it.
    await updateProgram(programId, { name: customisedName(program!.name, t("customSuffix")) });
    router.push(`/programs/${programId}/edit`);
  }

  /** A link to a copy of this program, sent with the phone's share sheet or copied. */
  async function share() {
    if (!program) return;
    setSharing(true);
    setShareMessage(null);
    try {
      const id = await shareProgram({ name: program.name, description: program.description, structure: program.structure ?? [] });
      const url = shareLink(window.location.origin, locale, id);
      if (navigator.share) {
        await navigator.share({ title: program.name, text: t("shareText", { name: program.name }), url }).catch(() => undefined);
      } else {
        await navigator.clipboard.writeText(url);
        setShareMessage(t("linkCopied"));
      }
    } catch (e) {
      const tooMany = e instanceof Error && e.message.includes("TOO_MANY_SHARES");
      setShareMessage(t(tooMany ? "tooManyShares" : navigator.onLine ? "shareFailed" : "shareOffline"));
    } finally {
      setSharing(false);
    }
  }

  async function leave() {
    await deleteProgram(programId);
    router.push("/programs");
  }

  // Days grouped by week for a plan; one group for a program that repeats.
  const groups: { week: number | null; items: { d: ProgramDay; index: number }[] }[] = [];
  days.forEach((d, index) => {
    const week = d.week ?? null;
    const group = groups.find((g) => g.week === week) ?? (groups.push({ week, items: [] }), groups[groups.length - 1]);
    group.items.push({ d, index });
  });
  const currentWeek = next !== null ? (days[next]?.week ?? null) : null;

  return (
    <>
      <PageHeader
        title={program.name}
        showBack
        actions={
          origin === "mine" ? (
            <Button size="sm" variant="outline" onClick={() => router.push(`/programs/${programId}/edit`)}>
              <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("edit")}
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-5 p-4 pb-28">
        <section className="t-hero space-y-3 rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <CategoryIcon category={category ?? "custom"} size="lg" />
            <div className="min-w-0">
              {category && <p className="text-sm font-semibold">{tc(`cat_${category}`)}</p>}
              <p className={category ? "text-xs text-muted-foreground" : "text-sm font-semibold"}>{t(`origin_${origin}`)}</p>
            </div>
          </div>
          {program.description && <p className="text-sm text-muted-foreground">{program.description}</p>}
          <div className="flex flex-wrap gap-1.5">
            {weeks && <Tag>{tc("weeks", { count: weeks })}</Tag>}
            <Tag>{tc("perWeek", { count: perWeek })}</Tag>
            <Tag>{t("sessionsDone", { count: progress.sessions })}</Tag>
          </div>
          {progress.share !== null && (
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress.share * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={program.name}>
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.max(3, progress.share * 100)}%` }} />
            </div>
          )}
          {next !== null && (
            <Button size="lg" className="w-full rounded-full" onClick={start} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  {running ? t("continue") : t("start", { name: days[next].name })}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          )}
        </section>

        {/* Start date: a plan in weeks follows the calendar from it. */}
        {weeks && (
          <section className="t-surface space-y-2 rounded-2xl p-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-accent-text" aria-hidden="true" />
              <label htmlFor="program-start" className="flex-1 text-sm font-medium">{tp("startDate")}</label>
              {origin === "coach" ? (
                <span className="text-sm">{program.startDate ? day(program.startDate) : "—"}</span>
              ) : (
                <Input
                  id="program-start"
                  type="date"
                  value={program.startDate ?? ""}
                  onChange={(e) => updateProgram(programId, { startDate: e.target.value || null })}
                  className="w-auto"
                />
              )}
            </div>
            {origin !== "coach" && !program.startDate && (
              <Button size="sm" variant="outline" onClick={() => updateProgram(programId, { startDate: nextMonday(today) })}>
                {tp("startNextMonday")}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {calendar
                ? calendar.started
                  ? calendar.total
                    ? tp("weekOf", { week: calendar.week, total: calendar.total })
                    : tp("weekSince", { week: calendar.week })
                  : tp("startsOn", { date: day(program.startDate!) })
                : tp("startHint")}
            </p>
          </section>
        )}

        {/* A competition or a race to peak for: the plan ends on its week. */}
        {weeks && origin !== "coach" && (
          <SeasonTarget weeks={weeks} today={today} onApply={(start) => updateProgram(programId, { startDate: start })} />
        )}

        {/* The sessions, week by week. */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">{t("sessions")}</h2>
          {groups.map((g) => {
            const list = (
              <ul className="mt-1 space-y-1.5">
                {g.items.map(({ d, index }) => (
                  <li key={index} className={cn("flex items-start gap-2.5 rounded-xl p-2 text-sm", index === next && "bg-accent-500/10 ring-1 ring-accent-500/40")}>
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        done.has(index) ? "bg-green-500 text-white" : "ring-1 ring-border"
                      )}
                    >
                      {done.has(index) && <Check className="size-3.5" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{d.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.cardio
                          ? describeTarget(d.cardio)
                          : d.exercises.map((e) => xl(e.exerciseName)).join(" · ") || t("noExercises")}
                      </span>
                    </span>
                    {index === next && <span className="shrink-0 text-xs font-semibold text-accent-text">{t("next")}</span>}
                  </li>
                ))}
              </ul>
            );
            // A program that repeats: its days as they are. A plan: one fold per week, this week open.
            return g.week === null ? (
              <div key="all" className="t-surface rounded-2xl p-3">{list}</div>
            ) : (
              <details key={g.week} open={g.week === currentWeek} className="t-surface rounded-2xl p-3">
                <summary className="flex min-h-9 cursor-pointer items-center justify-between text-sm font-semibold">
                  {t("week", { week: g.week })}
                  <span className="text-xs font-normal text-muted-foreground">
                    {t("doneOf", { done: g.items.filter((x) => done.has(x.index)).length, total: g.items.length })}
                  </span>
                </summary>
                {list}
              </details>
            );
          })}
        </section>

        {origin !== "coach" && days.length > 0 && (
          <div className="space-y-1">
            <Button variant="outline" className="w-full" onClick={share} disabled={sharing}>
              {sharing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" /> : <Share2 className="mr-1 h-4 w-4" aria-hidden="true" />}
              {t("share")}
            </Button>
            {shareMessage && <p className="text-center text-xs text-muted-foreground" role="status">{shareMessage}</p>}
          </div>
        )}

        {origin === "followed" && (
          <section className="space-y-2">
            <Button variant="outline" className="w-full" onClick={customise}>
              <Wand2 className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("customise")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("customiseHint")}</p>
            <Button variant="ghost" className="w-full text-destructive" onClick={() => setLeaving(true)}>
              <LogOut className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("leave")}
            </Button>
          </section>
        )}

        {origin === "coach" && (
          <p className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            <UserCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("coachHint")}
          </p>
        )}
      </div>

      <Dialog open={leaving} onOpenChange={setLeaving}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pr-8">{t("leaveTitle", { name: program.name })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("leaveText")}</p>
          <div className="grid gap-2">
            <Button variant="destructive" onClick={leave}>{t("leave")}</Button>
            <Button variant="outline" onClick={() => setLeaving(false)}>{t("cancel")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{children}</span>;
}
