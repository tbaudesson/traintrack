"use client";

import { useTranslations } from "next-intl";
import { usePainAreaName } from "@/hooks/useReferences";
import { AlertTriangle, ChevronRight, LineChart, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useFormat } from "@/lib/format";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { cn } from "@/lib/utils";
import type { Insight, InsightChart, InsightEvidence, InsightPeriod } from "@/lib/insights";

const ICON = { warn: AlertTriangle, good: TrendingUp, info: Sparkles } as const;

/** The words of an insight, its numbers and dates in the reader's language. */
export function useInsightWords(exerciseName: (id: number) => string | undefined) {
  const t = useTranslations("insights");
  const areaName = usePainAreaName();
  const tc = useTranslations("cardio");
  const { num, day } = useFormat();
  const xl = useExerciseLabel();
  const shown = (values: Record<string, string | number>, exerciseId?: number) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(values)) {
      if (k === "date") out[k] = day(String(v));
      else if (k === "area") out[k] = areaName(String(v));
      else if (k === "sport") out[k] = tc(`sport_${v}`);
      else if (k === "ratio") out[k] = num(Number(v), 2);
      else if (typeof v === "number" && k !== "count" && k !== "needed" && k !== "done") out[k] = num(v, Number.isInteger(v) ? 0 : 1);
      else out[k] = v;
    }
    if (exerciseId !== undefined) out.exercise = xl(exerciseName(exerciseId)) || "—";
    return out;
  };
  return {
    title: (i: Insight) => t(`title_${i.kind}`, shown(i.values)),
    text: (i: Insight) => t(`text_${i.kind}`, shown(i.values)),
    evidence: (e: InsightEvidence) => t(`ev_${e.key}`, shown(e.values, e.exerciseId)),
    action: (i: Insight) => t(i.action.key),
    period: (p: InsightPeriod) => t("period", { from: day(p.from), to: day(p.to), previousFrom: day(p.previousFrom), previousTo: day(p.previousTo) }),
  };
}

/**
 * The main insight of the last four weeks: what stands out, its evidence (each
 * leading to its chart), and one thing to do.
 */
export function InsightCard({
  insight,
  period,
  exerciseName,
  canShow,
  onShowChart,
  children,
}: {
  insight: Insight;
  period: InsightPeriod;
  exerciseName: (id: number) => string | undefined;
  /** Whether a chart is on the page (some need a licence). */
  canShow: (chart: InsightChart) => boolean;
  onShowChart: (chart: InsightChart, exerciseId?: number) => void;
  /** What follows the evidence: the thing to do, the other readings. */
  children?: React.ReactNode;
}) {
  const t = useTranslations("insights");
  const words = useInsightWords(exerciseName);
  const Icon = ICON[insight.tone];
  return (
    <section className="t-hero t-insight-hero space-y-4 rounded-3xl p-5 md:p-7" aria-labelledby="insight-title">
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-accent-text uppercase">{t("heading")}</p>
        <p className="text-xs text-muted-foreground">{words.period(period)}</p>
      </div>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl",
            insight.tone === "warn" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : insight.tone === "good" ? "bg-green-500/15 text-success-text" : "bg-accent-500/15 text-accent-text"
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="insight-title" className="t-display text-3xl leading-none md:text-4xl">{words.title(insight)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{words.text(insight)}</p>
        </div>
      </div>
      <div>
        <h3 className="mb-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("evidenceTitle")}</h3>
        <ul className="space-y-1.5">
          {insight.evidence.map((e, i) => (
            <li key={`${e.key}-${i}`} className="t-surface flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-foreground/5">
              <span className="min-w-0 flex-1">{words.evidence(e)}</span>
              {e.chart && canShow(e.chart) && (
                <button
                  type="button"
                  onClick={() => onShowChart(e.chart!, e.exerciseId)}
                  aria-label={`${t("seeChart")} : ${words.evidence(e)}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-accent-text hover:bg-accent-500/10"
                >
                  <LineChart className="size-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {children}
    </section>
  );
}

/** The thing to do: a sentence, and where to do it. */
export function InsightAction({ insight, exerciseName }: { insight: Insight; exerciseName: (id: number) => string | undefined }) {
  const t = useTranslations("insights");
  const words = useInsightWords(exerciseName);
  return (
    <div className="rounded-2xl bg-accent-500/10 p-3">
      <h3 className="text-xs font-semibold tracking-widest text-accent-text uppercase">{t("actionTitle")}</h3>
      <p className="mt-1 text-sm font-medium">{words.action(insight)}</p>
      {insight.action.href && (
        <Link href={insight.action.href} className="mt-1 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-text">
          {t("go")}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** The other readings of the four weeks, folded: each with its words and the thing to do. */
export function MoreInsights({ items, exerciseName }: { items: Insight[]; exerciseName: (id: number) => string | undefined }) {
  const t = useTranslations("insights");
  const words = useInsightWords(exerciseName);
  if (items.length === 0) return null;
  return (
    <details className="t-surface rounded-2xl px-4 py-1 ring-1 ring-foreground/5">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">{t("more", { count: items.length })}</summary>
      <ul className="space-y-3 pt-1 pb-3">
        {items.map((i) => {
          const Icon = ICON[i.tone];
          return (
            <li key={i.kind} className="flex items-start gap-2.5">
              <Icon className={cn("mt-0.5 size-4 shrink-0", i.tone === "warn" ? "text-amber-600 dark:text-amber-400" : i.tone === "good" ? "text-success-text" : "text-accent-text")} aria-hidden="true" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{words.title(i)}</p>
                <p className="text-muted-foreground">{words.text(i)}</p>
                <p className="mt-0.5 text-xs">
                  {words.action(i)}
                  {i.action.href && (
                    <Link href={i.action.href} className="ml-1 font-semibold text-accent-text">
                      {t("go")}
                    </Link>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/** An insight on the home screen, in short: its words, and the way to Performance for the rest. */
export function HomeInsight({ insight, exerciseName }: { insight: Insight; exerciseName: (id: number) => string | undefined }) {
  const t = useTranslations("insights");
  const words = useInsightWords(exerciseName);
  const Icon = ICON[insight.tone];
  return (
    <section className="t-surface space-y-1.5 rounded-2xl p-4 ring-1 ring-accent-500/30">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className={cn("size-4 shrink-0", insight.tone === "warn" ? "text-amber-600 dark:text-amber-400" : insight.tone === "good" ? "text-success-text" : "text-accent-text")} aria-hidden="true" />
        {words.title(insight)}
      </h2>
      <p className="text-sm text-muted-foreground">{words.text(insight)}</p>
      <Link href="/progress" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-text">
        {t("seeInPerformance")}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
