"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocale, useTranslations } from "next-intl";
import { Bandage, ChevronLeft, ChevronRight, Loader2, Medal, Printer, Send, Share2, TrendingUp, Trophy } from "lucide-react";
import db, { getCurrentUserIdSync } from "@/db";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { usePainReports } from "@/hooks/usePain";
import { readinessScore, useReadiness } from "@/hooks/useReadiness";
import { useCompetitions } from "@/hooks/useCompetitions";
import { sendMessage } from "@/hooks/useMessages";
import { monthlyReport, shiftMonth, type MonthlyReport } from "@/lib/monthlyReport";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { formatDistance, formatDuration } from "@/lib/cardio";
import { localDate } from "@/lib/dates";
import { useFormat } from "@/lib/format";
import { Button } from "@/components/ui/button";

/**
 * One month of an athlete, for the athlete and their coach: attendance,
 * volume, records and gains, endurance, effort, form, pains, competitions.
 * The coach can send it as a message; anyone can share or print it.
 */
export function MonthlyReportView({ userId, name }: { userId?: string; name?: string }) {
  const t = useTranslations("monthly");
  const tpain = useTranslations("pain");
  const locale = useLocale();
  const xl = useExerciseLabel();
  const { num, day } = useFormat();
  const today = localDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const workouts = useWorkouts(userId);
  const sets = useAllWorkoutSets(userId);
  const exercises = useExercises();
  const pains = usePainReports(userId);
  const readiness = useReadiness(userId);
  const competitions = useCompetitions(userId);
  const profile = useLiveQuery(async () => {
    const uid = userId ?? getCurrentUserIdSync();
    return (await db.athleteProfiles.toArray()).find((p) => !p.deletedAt && p.userId === uid) ?? null;
  }, [userId]);

  const report = useMemo(
    () =>
      monthlyReport({
        month,
        today,
        workouts,
        sets,
        trainingDays: profile?.trainingDays ?? undefined,
        pains,
        readiness: readiness.map((r) => ({ date: r.date, score: readinessScore(r) })),
        competitions,
      }),
    [month, today, workouts, sets, profile, pains, readiness, competitions]
  );
  const names = new Map(exercises.map((e) => [e.id, xl(e.name)]));
  const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const isCoach = !!userId && userId !== getCurrentUserIdSync();

  if (profile === undefined) {
    return <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />;
  }

  /** The report as plain text, for a message or a share. */
  function asText(r: MonthlyReport): string {
    const lines = [t("textTitle", { month: label, name: name ?? "" }).trim()];
    lines.push(r.planned ? t("textAttendance", { days: r.daysTrained, planned: r.planned, percent: r.adherence ?? 0 }) : t("textDays", { days: r.daysTrained }));
    if (r.volume) lines.push(t("textVolume", { kg: num(r.volume, 0), change: r.volumeChange === null ? "" : ` (${r.volumeChange >= 0 ? "+" : ""}${r.volumeChange} %)` }));
    if (r.records.length) lines.push(t("textRecords", { list: r.records.map((x) => `${names.get(x.exerciseId) ?? "?"} ${num(x.weightKg)} kg × ${x.reps}`).join(", ") }));
    if (r.progress.length) lines.push(t("textProgress", { list: r.progress.map((p) => `${names.get(p.exerciseId) ?? "?"} +${num(p.percent)} %`).join(", ") }));
    if (r.cardio.sessions) lines.push(t("textCardio", { count: r.cardio.sessions, distance: formatDistance(r.cardio.distanceM) }));
    if (r.competitions.length) lines.push(t("textCompetitions", { list: r.competitions.map((c) => `${c.event} ${num(c.final ?? 0, 3)}`).join(", ") }));
    if (r.pains.length) lines.push(t("textPains", { count: r.pains.length }));
    return lines.join("\n");
  }

  async function send() {
    if (!userId) return;
    setSending(true);
    try {
      await sendMessage(userId, asText(report));
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  async function share() {
    const text = asText(report);
    try {
      if (navigator.share) await navigator.share({ title: t("title"), text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // Cancelled by the user: nothing to do.
    }
  }

  const r = report;
  const empty = r.sessions === 0 && !r.competitions.length && !r.pains.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => { setMonth(shiftMonth(month, -1)); setSent(false); }} aria-label={t("previous")}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <p className="text-lg font-semibold capitalize">{label}</p>
        <Button variant="ghost" size="icon" onClick={() => { setMonth(shiftMonth(month, 1)); setSent(false); }} disabled={month >= today.slice(0, 7)} aria-label={t("next")}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      {empty ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Tile value={r.planned ? `${r.adherence} %` : String(r.daysTrained)} label={r.planned ? t("attendance", { days: r.daysTrained, planned: r.planned }) : t("daysTrained")} />
            <Tile value={String(r.sessions)} label={t("sessions", { strength: r.strengthSessions, cardio: r.cardio.sessions })} />
            <Tile
              value={`${num(r.volume, 0)} kg`}
              label={r.volumeChange === null ? t("volume") : t("volumeChange", { change: `${r.volumeChange >= 0 ? "+" : ""}${r.volumeChange}` })}
            />
            <Tile value={r.minutes ? formatDuration(r.minutes * 60) : "—"} label={t("time")} />
            {r.avgRpe !== null && <Tile value={num(r.avgRpe)} label={t("rpe")} />}
            {r.readiness !== null && <Tile value={`${r.readiness}/100`} label={t("readiness")} />}
            {r.cardio.sessions > 0 && <Tile value={formatDistance(r.cardio.distanceM)} label={t("cardio", { count: r.cardio.sessions })} />}
          </div>

          {r.progress.length > 0 && (
            <Block icon={TrendingUp} title={t("progressTitle")}>
              {r.progress.map((p) => (
                <li key={p.exerciseId}>
                  {t("progressLine", { name: names.get(p.exerciseId) ?? "?", before: num(p.before), best: num(p.best), percent: num(p.percent) })}
                </li>
              ))}
            </Block>
          )}

          {r.records.length > 0 && (
            <Block icon={Trophy} title={t("recordsTitle", { count: r.records.length })}>
              {r.records.map((x) => (
                <li key={x.exerciseId}>
                  {names.get(x.exerciseId) ?? "?"} · {num(x.weightKg)} kg × {x.reps}
                </li>
              ))}
            </Block>
          )}

          {r.competitions.length > 0 && (
            <Block icon={Medal} title={t("competitionsTitle")}>
              {r.competitions.map((c) => (
                <li key={`${c.date}-${c.event}`}>
                  {c.event} · {day(c.date)} · {num(c.final ?? 0, 3)}
                  {c.rank ? ` · ${c.participants ? `${c.rank}/${c.participants}` : `#${c.rank}`}` : ""}
                </li>
              ))}
            </Block>
          )}

          {r.pains.length > 0 && (
            <Block icon={Bandage} title={t("painsTitle", { count: r.pains.length })}>
              {r.pains.map((p, i) => (
                <li key={i}>
                  {day(p.date)} · {tpain(`area_${p.area}`)} {p.level}/10{p.exerciseName ? ` · ${xl(p.exerciseName)}` : ""}
                </li>
              ))}
            </Block>
          )}
        </>
      )}

      {!empty && (
        <div className="grid gap-2 print:hidden">
          {isCoach && (
            <Button onClick={send} disabled={sending || sent}>
              <Send className="mr-1 h-4 w-4" aria-hidden="true" />
              {sent ? t("sent") : t("send", { name: name ?? "" })}
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={share}>
              <Share2 className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("share")}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("print")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="t-surface rounded-2xl p-3 ring-1 ring-foreground/5">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Trophy; title: string; children: React.ReactNode }) {
  return (
    <section className="t-surface space-y-1.5 rounded-2xl p-3 ring-1 ring-foreground/5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-accent-text" aria-hidden="true" />
        {title}
      </h3>
      <ul className="space-y-0.5 text-sm">{children}</ul>
    </section>
  );
}
