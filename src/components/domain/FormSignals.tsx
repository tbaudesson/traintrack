"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Activity, HeartPulse } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HealthMetric, ReadinessCheckin } from "@/db";
import { bodySignals, HRV_DROP, RESTING_HR_RISE } from "@/lib/recovery";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The resting heart rate and the variability against one's usual values: a
 * hint beside the check-in, with what it may mean and what it does not.
 */
export function BodySignalsCard({ metrics, today }: { metrics: HealthMetric[]; today: string }) {
  const t = useTranslations("recovery");
  const { num } = useFormat();
  const s = useMemo(() => bodySignals(metrics, today), [metrics, today]);
  if (!s.restingHr && !s.hrv) return null;
  const line = (label: string, icon: React.ReactNode, flagged: boolean, text: string) => (
    <p className={cn("flex items-start gap-2 text-sm", flagged ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
      {icon}
      <span>
        <span className="font-semibold text-foreground">{label}</span> {text}
      </span>
    </p>
  );
  const flagged = !!s.restingHr?.flagged || !!s.hrv?.flagged;
  return (
    <section className="t-surface space-y-2 rounded-2xl p-4 ring-1 ring-foreground/5" aria-labelledby="body-signals">
      <h2 id="body-signals" className="text-sm font-semibold">{t("title")}</h2>
      {s.restingHr &&
        line(
          t("restingHr"),
          <HeartPulse className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
          s.restingHr.flagged,
          t("restingHrLine", { value: s.restingHr.value, baseline: s.restingHr.baseline, delta: `${s.restingHr.delta > 0 ? "+" : ""}${num(s.restingHr.delta)}` })
        )}
      {s.hrv &&
        line(
          t("hrv"),
          <Activity className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
          s.hrv.flagged,
          t("hrvLine", { value: s.hrv.value, baseline: s.hrv.baseline, delta: `${s.hrv.delta > 0 ? "+" : ""}${Math.round(s.hrv.delta * 100)}` })
        )}
      <p className="text-xs text-muted-foreground">{flagged ? t("flaggedHint") : t("calmHint", { beats: RESTING_HR_RISE, share: Math.round(HRV_DROP * 100) })}</p>
    </section>
  );
}

const DIMENSIONS = ["energy", "sleep", "mood", "soreness"] as const;

/**
 * The check-in's dimensions and the body's readings over four weeks, one
 * small chart each on its own scale: never two units on one axis.
 */
export function FormTrends({ checkins, metrics, today }: { checkins: ReadinessCheckin[]; metrics: HealthMetric[]; today: string }) {
  const t = useTranslations("recovery");
  const tr = useTranslations("readiness");
  const { short } = useFormat();
  const from = new Date(Date.parse(`${today}T00:00:00Z`) - 27 * 86_400_000).toISOString().slice(0, 10);
  const recent = checkins.filter((c) => c.date >= from && c.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const body = metrics.filter((m) => m.date >= from && m.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const series = [
    ...DIMENSIONS.map((d) => ({ key: d, label: tr(d), data: recent.filter((c) => c[d]).map((c) => ({ date: c.date, v: c[d]! })), domain: [1, 5] as [number, number] })),
    { key: "restingHr", label: t("restingHr"), data: body.filter((m) => m.restingHr).map((m) => ({ date: m.date, v: m.restingHr! })), domain: ["auto", "auto"] as [string, string] },
    { key: "hrv", label: t("hrv"), data: body.filter((m) => m.hrv).map((m) => ({ date: m.date, v: m.hrv! })), domain: ["auto", "auto"] as [string, string] },
  ].filter((s) => s.data.length >= 3);
  if (!series.length) return null;
  return (
    <section className="space-y-2" aria-labelledby="form-trends">
      <h2 id="form-trends" className="t-section-heading">{t("trendsTitle")}</h2>
      <p className="text-xs text-muted-foreground">{t("trendsHint")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {series.map((s) => (
          <div key={s.key} className="t-surface rounded-xl p-3 ring-1 ring-foreground/5">
            <p className="mb-1 text-xs font-semibold">{s.label}{s.key === "soreness" ? ` · ${t("lowerIsBetter")}` : ""}</p>
            <div className="h-24 w-full" role="img" aria-label={t("trendLabel", { name: s.label, count: s.data.length })}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(120,120,120,0.15)" />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={s.domain} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      const row = active && payload?.[0]?.payload;
                      if (!row) return null;
                      return <div className="rounded-lg border border-border bg-background p-2 text-xs shadow-md">{short(row.date)} · {row.v}</div>;
                    }}
                  />
                  <Line type="monotone" dataKey="v" stroke="var(--accent-500, #6d28d9)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
