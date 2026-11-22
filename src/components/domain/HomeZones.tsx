"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Activity, Bandage, ChevronDown, ChevronRight, Goal as GoalIcon, MoreHorizontal, Stethoscope, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Goal } from "@/db";
import type { Injury } from "@/lib/injuries";
import { activeInjuries, returnPhases } from "@/lib/injuries";
import { persistentPains, type InjuryGuidance } from "@/lib/injuryGuidance";
import type { PainReport } from "@/lib/pain";
import type { TrainingLoad } from "@/lib/trainingLoad";
import { goalStatus, type GoalData } from "@/lib/goalTracking";
import { useGoalText } from "@/components/domain/GoalsSection";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The home screen's zones under the session card: what is worth knowing now
 * (a few lines), the progress in three figures, and the rest folded. Each
 * opens the screen where its detail lives; nothing here computes anew.
 */

/** One line of "Worth knowing": an icon, what it is, where to see it. */
export function AlertLine({ icon: Icon, tone = "info", title, text, href, action }: { icon: LucideIcon; tone?: "danger" | "warn" | "info"; title: string; text?: string; href: string; action: string }) {
  return (
    <Link href={href} className="t-panel flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors hover:border-accent-500/40">
      <Icon
        className={cn("size-5 shrink-0", tone === "danger" ? "text-rose-600 dark:text-rose-400" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-accent-text")}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {text && <span className="block truncate text-xs text-muted-foreground">{text}</span>}
      </span>
      <span className="flex shrink-0 items-center text-sm font-medium text-accent-text">
        {action}
        <ChevronRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** "Worth knowing": the first lines shown, the others behind "+ n others". */
export function HomeAlerts({ items, max = 2 }: { items: { key: string; node: ReactNode }[]; max?: number }) {
  const t = useTranslations("homeZones");
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const shown = all ? items : items.slice(0, max);
  return (
    <section className="space-y-2" aria-labelledby="home-alerts">
      <h2 id="home-alerts" className="sr-only">{t("alerts")}</h2>
      {shown.map((i) => <div key={i.key}>{i.node}</div>)}
      {!all && items.length > max && (
        <button type="button" onClick={() => setAll(true)} className="flex min-h-10 items-center gap-1 text-sm font-medium text-accent-text">
          <ChevronDown className="size-4" aria-hidden="true" />
          {t("moreAlerts", { count: items.length - max })}
        </button>
      )}
    </section>
  );
}

/** The injury in one line: the area, where it stands, a pain that keeps coming back first. */
export function useInjurySummary(guidance: InjuryGuidance | null, injuries: Injury[], pains: PainReport[], today: string): { title: string; text: string; tone: "danger" | "warn"; icon: LucideIcon } | null {
  const t = useTranslations("homeZones");
  const tpain = useTranslations("pain");
  const { short } = useFormat();
  if (!guidance) return null;
  const area = (a: string) => tpain(`area_${a}`);
  const persistent = persistentPains(guidance, pains, today);
  if (persistent.length) {
    return { title: t("painTitle", { area: area(persistent[0].area) }), text: t("painText", { reports: persistent[0].reports, days: guidance.persistent.days }), tone: "danger", icon: Stethoscope };
  }
  const injured = activeInjuries(injuries);
  if (injured.length) {
    return {
      title: t("injuryTitle", { areas: injured.map((i) => area(i.area)).join(", ") }),
      text: t("injurySince", { date: short(injured[0].since) }),
      tone: "warn",
      icon: Bandage,
    };
  }
  const back = returnPhases(guidance, injuries, today, pains)[0];
  if (back) return { title: t("returnTitle", { area: area(back.area) }), text: t("returnText", { week: back.week, weeks: guidance.return.loads.length }), tone: "warn", icon: Bandage };
  return null;
}

const LOAD_TONE: Record<TrainingLoad["zone"], string> = {
  low: "text-sky-700 dark:text-sky-300",
  optimal: "text-success-text",
  caution: "text-amber-700 dark:text-amber-300",
  danger: "text-rose-700 dark:text-rose-300",
};

/**
 * Progress in three figures: the main goal and its bar, the week against the
 * same day last week, the load in a word. The charts and the explanations
 * are in Performance, one tap away.
 */
export function HomeProgress({ goal, data, week, load }: { goal: Goal | undefined; data: GoalData; week: string | null; load: TrainingLoad | null }) {
  const t = useTranslations("homeZones");
  const tl = useTranslations("load");
  const text = useGoalText();
  const status = goal ? goalStatus(goal, data) : null;
  if (!goal && !week && !load) return null;
  return (
    <section className="t-panel space-y-2.5 rounded-xl p-3.5" aria-labelledby="home-progress">
      <div className="flex items-center">
        <h2 id="home-progress" className="text-sm font-semibold">{t("progress")}</h2>
        <Link href="/progress" className="ml-auto flex min-h-10 items-center gap-0.5 text-sm font-medium text-accent-text">
          {t("performance")}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {goal && status && (
        <Link href="/progress#goals" className="block space-y-1">
          <span className="flex items-center gap-2 text-sm">
            <GoalIcon className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-medium">{text.title(goal)} · {text.value(goal, goal.targetValue)}</span>
          </span>
          <span className="block h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={text.title(goal)} aria-valuenow={Math.round(status.share * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span className={cn("block h-full rounded-full", status.achievedOn ? "bg-green-500" : "bg-accent-500")} style={{ width: `${Math.max(3, status.share * 100)}%` }} />
          </span>
          <span className="block truncate text-xs text-muted-foreground">{text.status(goal, status)}</span>
        </Link>
      )}
      {(week || load) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {week && <span className="text-muted-foreground">{week}</span>}
          {load && (
            <Link href="/progress#chart-load" className={cn("flex items-center gap-1 font-semibold", LOAD_TONE[load.zone])}>
              <Activity className="size-3.5" aria-hidden="true" />
              {tl(`zone_${load.zone}`)}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

/** The session card's other ways to train today, behind "⋯". */
export function SessionMenu({ items }: { items: { key: string; icon: LucideIcon; label: string; onClick: () => void }[] }) {
  const t = useTranslations("homeZones");
  const [open, setOpen] = useState(false);
  // Escape closes it, as any menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!items.length) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("moreOptions")}
        className="flex size-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/15"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>
      {open && (
        <>
          <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <ul role="menu" className="absolute right-0 bottom-12 z-50 min-w-60 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg">
            {items.map(({ key, icon: Icon, label, onClick }) => (
              <li key={key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onClick();
                  }}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-muted"
                >
                  <Icon className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
