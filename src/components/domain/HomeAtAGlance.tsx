"use client";

import { useTranslations } from "next-intl";
import { Award, ChevronRight, Goal as GoalIcon, History } from "lucide-react";
import type { CompetitionResult, Exercise, Workout, WorkoutSet } from "@/db";
import { Link } from "@/i18n/navigation";
import { useGoals } from "@/hooks/useGoals";
import { useBodyMetrics } from "@/hooks/useBodyMetrics";
import { goalStatus } from "@/lib/goalTracking";
import { doneSessions } from "@/lib/doneSessions";
import { useFormat } from "@/lib/format";
import { useGoalText } from "@/components/domain/GoalsSection";

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/**
 * The home screen's three short lines, each opening its page: the main goal
 * and where it stands, the last session done, and the next competition.
 * Each shows only when it has something to say.
 */
export function HomeAtAGlance({ today, workouts, sets, exercises, competitions }: { today: string; workouts: Workout[]; sets: WorkoutSet[]; exercises: Exercise[]; competitions: CompetitionResult[] }) {
  const t = useTranslations("home");
  const tg = useTranslations("goals");
  const { short } = useFormat();
  const goals = useGoals();
  const bodyMetrics = useBodyMetrics();
  const text = useGoalText();

  const main = goals.find((g) => g.priority === 1) ?? goals[0];
  const status = main ? goalStatus(main, { today, workouts, sets, exercises, bodyMetrics }) : null;
  const last = doneSessions(workouts.filter((w) => w.date <= today), sets).sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))[0];
  const next = competitions.filter((c) => !c.deletedAt && c.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const ago = last ? daysBetween(last.date, today) : null;

  const row = "t-panel flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 transition-colors hover:border-accent-500/40";
  return (
    <section className="space-y-2" aria-label={t("atAGlance")}>
      {main && status ? (
        <Link href="/progress#goals" className={row}>
          <GoalIcon className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{text.title(main)} · {text.value(main, main.targetValue)}</span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={text.title(main)} aria-valuenow={Math.round(status.share * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span className={status.achievedOn ? "block h-full rounded-full bg-green-500" : "block h-full rounded-full bg-accent-500"} style={{ width: `${Math.max(3, status.share * 100)}%` }} />
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{text.status(main, status)}</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
        </Link>
      ) : (
        <Link href="/progress#goals" className={row}>
          <GoalIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm text-muted-foreground">{tg("homeEmpty")}</span>
          <ChevronRight className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
        </Link>
      )}
      {last && ago !== null && (
        <Link href={`/log/session?id=${last.id}`} className={row}>
          <History className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold">{t("lastSession")}</span>{" "}
            <span className="text-muted-foreground">
              {[ago === 0 ? t("lastToday") : ago === 1 ? t("lastYesterday") : t("lastDaysAgo", { count: ago }), last.title, last.sessionRpe ? t("lastEffort", { rpe: last.sessionRpe }) : null].filter(Boolean).join(" · ")}
            </span>
          </span>
        </Link>
      )}
      {next && (
        <Link href="/competitions" className={row}>
          <Award className="size-5 shrink-0 text-accent-text" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold">{daysBetween(today, next.date) === 0 ? t("competitionToday") : t("competitionIn", { count: daysBetween(today, next.date) })}</span>{" "}
            <span className="text-muted-foreground">{next.event} · {short(next.date)}</span>
          </span>
        </Link>
      )}
    </section>
  );
}
