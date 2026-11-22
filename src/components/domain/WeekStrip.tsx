"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Flame, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PlanDay } from "@/lib/weekPlan";

const weekday = (locale: string, day: number, width: "narrow" | "short") =>
  new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));

/**
 * The week at a glance: done, missed, planned and rest days, then what comes
 * next, and a way to put the weeks ahead in the phone's calendar.
 */
export function WeekStrip({
  plan,
  planned,
  onExport,
  upcoming,
  offset,
  onOffset,
  streak,
  movable,
  onPickDay,
  compact,
  count,
}: {
  plan: PlanDay[];
  planned: boolean;
  onExport?: () => void;
  /** With a planning: the next sessions, beyond this week too. */
  upcoming?: { date: string; label: string; program: string }[];
  /** With a planning: the week shown, 0 for this one, and how to move it. */
  offset?: number;
  onOffset?: (offset: number) => void;
  /** Weeks kept in a row, shown from two. */
  streak?: number;
  /** Days with a session that can be moved, and what tapping one does. */
  movable?: string[];
  onPickDay?: (date: string) => void;
  /**
   * The home screen's form: the title, the sessions done of the week's goal,
   * the seven days and a link to the full planning; the weeks before and
   * after, the coming sessions and the hints are there.
   */
  compact?: boolean;
  /** The week's goal: sessions done of those planned. */
  count?: { done: number; target: number } | null;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  // What comes next: each session with its program when several are planned.
  const today = plan.find((d) => d.today)?.date;
  const fromPlanning = upcoming?.map((u) => {
    const [y, m, dd] = u.date.split("-").map(Number);
    const wd = ((new Date(Date.UTC(y, m - 1, dd)).getUTCDay() + 6) % 7) + 1;
    return { date: u.date, weekday: wd, today: u.date === today, status: "planned" as const, label: u.label, program: u.program };
  });
  const next = fromPlanning?.slice(0, 4) ?? plan
    .filter((d) => d.status === "planned")
    .flatMap((d): (PlanDay & { label: string; program?: string })[] =>
      d.sessions ? d.sessions.map((x) => ({ ...d, label: x.label, program: x.program })) : d.label ? [{ ...d, label: d.label }] : []
    )
    .slice(0, 4);

  // The program's name is worth repeating only when several share the week.
  const severalPrograms = new Set(next.map((d) => d.program).filter(Boolean)).size > 1;

  if (compact) {
    return (
      <section className="t-panel space-y-2.5 rounded-xl p-3.5" aria-labelledby="week-title">
        <div className="flex items-center gap-1">
          {offset !== undefined && onOffset && (
            <button type="button" onClick={() => onOffset(offset - 1)} aria-label={t("weekPrevious")} className="-ml-1.5 flex size-9 items-center justify-center rounded-full hover:bg-muted pointer-coarse:size-11">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          )}
          <h2 id="week-title" className="text-sm font-semibold whitespace-nowrap" aria-live="polite">
            {!offset ? t("weekPlan") : offset === 1 ? t("weekNext") : offset === -1 ? t("weekLast") : t("weekOf", { date: `${Number(plan[0].date.slice(8))} ${new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${plan[0].date}T00:00:00Z`))}` })}
          </h2>
          {offset !== undefined && onOffset && (
            <button type="button" onClick={() => onOffset(offset + 1)} aria-label={t("weekFollowing")} className="flex size-9 items-center justify-center rounded-full hover:bg-muted pointer-coarse:size-11">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          )}
          {streak !== undefined && streak >= 2 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300" title={t("weekStreakHint")}>
              <Flame className="size-3.5" aria-hidden="true" />
              <span aria-hidden="true">{t("weekStreakShort", { weeks: streak })}</span>
              <span className="sr-only">{t("weekStreak", { weeks: streak })}</span>
            </span>
          )}
          {count && count.target > 0 && !offset && (
            <span className="ml-auto text-sm tabular-nums" aria-label={t("weekCount", { done: Math.min(count.done, count.target), target: count.target })}>
              <span className="font-semibold">{Math.min(count.done, count.target)}</span>
              <span className="text-muted-foreground"> / {count.target}</span>
            </span>
          )}
        </div>
        <ol className="grid grid-cols-7 gap-1 text-center">
          {plan.map((d) => (
            <li key={d.date} className="flex flex-col items-center gap-0.5">
              <span className={cn("text-[0.7rem]", d.today ? "font-bold text-accent-text" : "text-muted-foreground")}>{weekday(locale, d.weekday, "narrow")}</span>
              <DayMark
                date={d.date}
                onPick={onPickDay && movable?.includes(d.date) ? () => onPickDay(d.date) : undefined}
                title={d.label}
                label={`${weekday(locale, d.weekday, "short")} ${Number(d.date.slice(8))} : ${t(`plan_${d.status}`)}${d.label ? `, ${d.label}` : ""}`}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-semibold pointer-coarse:size-10",
                  d.status === "done" && "bg-green-500 text-white",
                  d.status === "planned" && "border-2 border-accent-500 text-accent-text",
                  d.status === "missed" && "border border-dashed border-muted-foreground/60 text-muted-foreground",
                  d.status === "rest" && "text-muted-foreground",
                  d.today && d.status !== "done" && "ring-2 ring-accent-500/40 ring-offset-1 ring-offset-background"
                )}
              >
                {d.status === "done" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : d.status === "missed" ? <X className="h-3 w-3" aria-hidden="true" /> : Number(d.date.slice(8))}
              </DayMark>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-1">
          {planned ? (
            <Link href="/log?view=calendar" className="flex min-h-10 items-center gap-0.5 text-sm font-medium text-accent-text">
              {t("fullPlanning")}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link href="/settings?section=plan" className="flex min-h-10 items-center gap-0.5 text-sm font-medium text-accent-text">
              {t("weekPlanChoose")}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          {planned && onExport && (
            <button type="button" onClick={onExport} aria-label={t("exportCalendar")} title={t("exportCalendar")} className="ml-auto flex size-10 items-center justify-center rounded-full text-accent-text hover:bg-muted">
              <CalendarPlus className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5">
      {/* On a narrow screen, "Edit" goes under the title rather than past the card's edge. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <div className="flex items-center gap-1">
          {offset !== undefined && onOffset && (
            <button type="button" onClick={() => onOffset(offset - 1)} aria-label={t("weekPrevious")} className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-muted">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          )}
          <h2 className="text-sm font-semibold whitespace-nowrap" aria-live="polite">
            {!offset
              ? t("weekPlan")
              : offset === 1
                ? t("weekNext")
                : offset === -1
                  ? t("weekLast")
                  : t("weekOf", { date: `${Number(plan[0].date.slice(8))} ${new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${plan[0].date}T00:00:00Z`))}` })}
          </h2>
          {offset !== undefined && onOffset && (
            <button type="button" onClick={() => onOffset(offset + 1)} aria-label={t("weekFollowing")} className="flex size-10 items-center justify-center rounded-full hover:bg-muted">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {streak !== undefined && streak >= 2 && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-800 dark:text-amber-300"
            title={`${t("weekStreak", { weeks: streak })} · ${t("weekStreakHint")}`}
          >
            <Flame className="size-3.5" aria-hidden="true" />
            <span aria-hidden="true">{t("weekStreakShort", { weeks: streak })}</span>
            <span className="sr-only">{t("weekStreak", { weeks: streak })}</span>
          </span>
        )}
        {/* With a planning, the days are set program by program. */}
        <Link href={upcoming ? "/programs" : "/settings"} className="ml-auto flex min-h-10 items-center text-sm font-medium text-accent-text">
          {planned ? t("weekPlanEdit") : t("weekPlanSetup")}
        </Link>
      </div>

      <ol className="grid grid-cols-7 gap-1 text-center">
        {plan.map((d) => (
          <li key={d.date} className="flex flex-col items-center gap-1">
            <span className={cn("text-xs", d.today ? "font-bold text-accent-text" : "text-muted-foreground")}>
              {weekday(locale, d.weekday, "narrow")}
            </span>
            <DayMark
              date={d.date}
              onPick={onPickDay && movable?.includes(d.date) ? () => onPickDay(d.date) : undefined}
              title={d.label}
              label={`${weekday(locale, d.weekday, "short")} ${Number(d.date.slice(8))} : ${t(`plan_${d.status}`)}${d.label ? `, ${d.label}` : ""}`}
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-xs font-semibold",
                d.status === "done" && "bg-green-500 text-white",
                d.status === "planned" && "border-2 border-accent-500 text-accent-text",
                d.status === "missed" && "border border-dashed border-muted-foreground/60 text-muted-foreground",
                d.status === "rest" && "text-muted-foreground",
                d.today && d.status !== "done" && "ring-2 ring-accent-500/40 ring-offset-2 ring-offset-background"
              )}
            >
              {d.status === "done" ? <Check className="h-4 w-4" aria-hidden="true" />
                : d.status === "missed" ? <X className="h-3.5 w-3.5" aria-hidden="true" />
                : Number(d.date.slice(8))}
            </DayMark>
          </li>
        ))}
      </ol>

      {next.length > 0 && (
        <ul className="space-y-1 text-sm">
          {next.map((d, i) => (
            <li key={`${d.date}-${i}`} className="flex gap-2">
              <span className="w-24 shrink-0 text-muted-foreground">
                {d.today ? t("planToday") : `${weekday(locale, d.weekday, "short")} ${Number(d.date.slice(8))}`}
              </span>
              <span className="min-w-0 truncate">
                <span className="font-medium">{d.label}</span>
                {d.program && severalPrograms && <span className="text-muted-foreground"> · {d.program}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!planned && <p className="text-xs text-muted-foreground">{t("weekPlanHint")}</p>}
      {planned && onPickDay && !!movable?.length && <p className="text-xs text-muted-foreground">{t("moveHint")}</p>}
      {planned && onExport && (
        <button type="button" onClick={onExport} className="flex min-h-10 items-center gap-1.5 text-sm font-medium text-accent-text">
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {t("exportCalendar")}
        </button>
      )}
    </section>
  );
}

/** A day of the strip: a button when its session can be moved. */
function DayMark({ date, onPick, title, label, className, children }: { date: string; onPick?: () => void; title?: string; label: string; className: string; children: React.ReactNode }) {
  if (!onPick) {
    return (
      <span title={title} aria-label={label} className={className}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" onClick={onPick} data-date={date} title={title} aria-label={label} aria-haspopup="dialog" className={cn(className, "cursor-pointer hover:bg-accent-500/10")}>
      {children}
    </button>
  );
}
