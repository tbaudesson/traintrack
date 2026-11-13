"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Bandage, ChevronLeft, ChevronRight, ClipboardCheck, Trophy, X } from "lucide-react";
import type { Exercise, Workout, WorkoutSet } from "@/db";
import { formatDistance, formatDuration } from "@/lib/cardio";
import type { PainReport } from "@/lib/pain";
import { weeklyReport } from "@/lib/weeklyReport";
import { cn } from "@/lib/utils";

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const short = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;

/**
 * A week at a glance: days trained against the plan, volume and its change,
 * records, effort, endurance and pains. Arrows walk through past weeks; on
 * the home screen it shows last week only and can be closed.
 */
export function WeeklyReportCard({
  workouts,
  sets,
  exercises,
  trainingDays,
  pains,
  lastMonday,
  navigable = true,
  onDismiss,
}: {
  workouts: Workout[];
  sets: WorkoutSet[];
  exercises: Exercise[];
  trainingDays?: number[];
  pains?: PainReport[];
  /** Monday of the last finished week. */
  lastMonday: string;
  navigable?: boolean;
  onDismiss?: () => void;
}) {
  const t = useTranslations("report");
  const tpain = useTranslations("pain");
  const [monday, setMonday] = useState(lastMonday);
  const report = useMemo(
    () => weeklyReport({ monday, workouts, sets, trainingDays, pains }),
    [monday, workouts, sets, trainingDays, pains]
  );
  const names = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises]);
  const current = monday > lastMonday;
  const empty = report.daysTrained === 0;

  const hours = Math.floor(report.minutes / 60);
  const time = report.minutes ? (hours ? `${hours} h ${String(report.minutes % 60).padStart(2, "0")}` : `${report.minutes} min`) : "–";

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 text-sm font-semibold">
          {t(current ? "titleCurrent" : "title", { from: short(report.monday), to: short(report.sunday) })}
        </h2>
        {navigable && (
          <>
            <button
              type="button"
              onClick={() => setMonday(addDays(monday, -7))}
              aria-label={t("previous")}
              className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setMonday(addDays(monday, 7))}
              disabled={current}
              aria-label={t("next")}
              className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t("close")}
            className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {empty ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Tile label={t("days")} value={report.planned !== null ? `${report.daysTrained}/${report.planned}` : String(report.daysTrained)} />
            <Tile
              label={t("volume")}
              value={`${report.volume.toLocaleString()} kg`}
              extra={
                report.volumeChange !== null ? (
                  <span className={cn("text-xs font-semibold", report.volumeChange >= 0 ? "text-success-text" : "text-amber-600 dark:text-amber-400")}>
                    {report.volumeChange >= 0 ? "+" : ""}
                    {report.volumeChange} %
                  </span>
                ) : undefined
              }
            />
            <Tile label={t("rpe")} value={report.avgRpe !== null ? String(report.avgRpe) : "–"} />
            <Tile label={t("time")} value={time} />
          </dl>

          {report.records.length > 0 && (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Trophy className="h-4 w-4 text-accent-text" aria-hidden="true" />
                {t("records", { count: report.records.length })}
              </p>
              <ul className="space-y-0.5 pl-6 text-sm text-muted-foreground">
                {report.records.slice(0, 5).map((r) => (
                  <li key={r.exerciseId}>
                    {names.get(r.exerciseId) ?? "?"} · {r.weightKg} kg × {r.reps}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.cardio.sessions > 0 && (
            <p className="text-sm">
              {t("cardio", { count: report.cardio.sessions })}
              {report.cardio.distanceM > 0 && ` · ${formatDistance(report.cardio.distanceM)}`}
              {report.cardio.durationSec > 0 && ` · ${formatDuration(report.cardio.durationSec)}`}
            </p>
          )}

          {report.pains.length > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
              <Bandage className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("pains")} {report.pains.map((p) => `${tpain(`area_${p.area}`)} ${p.level}/10`).join(", ")}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Tile({ label, value, extra }: { label: string; value: string; extra?: ReactNode }) {
  return (
    <div className="t-well rounded-xl p-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-1.5 font-semibold tabular-nums">
        {value}
        {extra}
      </dd>
    </div>
  );
}
