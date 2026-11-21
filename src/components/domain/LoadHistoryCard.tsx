"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Workout, WorkoutSet } from "@/db";
import { DISCIPLINES, loadSplit, weeklyLoads, type Discipline } from "@/lib/loadHistory";
import { useFormat } from "@/lib/format";
import { Chip, ChipRow } from "@/components/ui/find";

/**
 * One colour per discipline, in a fixed order whatever is shown (the colour
 * follows the discipline, never its rank), stepped for the dark surface.
 * Checked for colour-blind separation in both modes.
 */
const COLORS: Record<Discipline, string> = {
  strength: "var(--load-strength)",
  timed: "var(--load-timed)",
  run: "var(--load-run)",
  swim: "var(--load-swim)",
  bike: "var(--load-bike)",
  hike: "var(--load-hike)",
  vaulting: "var(--load-vaulting)",
  other: "var(--load-other)",
};
const PALETTE =
  "[--load-strength:#2a78d6] [--load-timed:#eb6834] [--load-run:#1baf7a] [--load-swim:#eda100] [--load-bike:#e87ba4] [--load-hike:#008300] [--load-other:#6250d6] [--load-vaulting:#e34948] " +
  "dark:[--load-strength:#3987e5] dark:[--load-timed:#d95926] dark:[--load-run:#199e70] dark:[--load-swim:#c98500] dark:[--load-bike:#d55181] dark:[--load-hike:#0ca30c] dark:[--load-other:#9085e9] dark:[--load-vaulting:#e66767]";

const SPANS = [12, 26] as const;

/**
 * The training load over three or six months, week by week, each bar split by
 * discipline, and each discipline's share of the last four weeks. All in one
 * unit, minutes x effort felt, never kilos and kilometres added together.
 */
export function LoadHistoryCard({ workouts, sets, today }: { workouts: Workout[]; sets: WorkoutSet[]; today: string }) {
  const t = useTranslations("loadHistory");
  const { day, num } = useFormat();
  const [span, setSpan] = useState<(typeof SPANS)[number]>(12);
  const weeks = useMemo(() => weeklyLoads({ today, workouts, sets, weeks: span }), [today, workouts, sets, span]);
  const recent = useMemo(() => loadSplit(weeks.slice(-4)), [weeks]);
  const shown = DISCIPLINES.filter((d) => weeks.some((w) => w.by[d] > 0));
  if (!shown.length) return <p className="px-4 pb-3 text-sm text-muted-foreground">{t("empty")}</p>;
  const data = weeks.map((w) => ({ ...w.by, monday: w.monday, label: day(w.monday).slice(0, 5), total: w.total }));
  const noRpe = workouts.filter((w) => !w.cancelledAt && w.date >= weeks[0].monday && !w.sessionRpe).length;

  return (
    <div className={`space-y-3 px-4 pb-4 ${PALETTE}`}>
      <ChipRow label={t("span")}>
        {SPANS.map((s) => (
          <Chip key={s} on={span === s} onClick={() => setSpan(s)}>{t("weeks", { count: s })}</Chip>
        ))}
      </ChipRow>

      <div className="h-56 w-full" role="img" aria-label={t("chartLabel", { weeks: span })}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="rgba(120,120,120,0.15)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={span === 12 ? 1 : 3} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => (v >= 1000 ? `${num(v / 1000)}k` : String(v))} />
            <Tooltip
              cursor={{ fill: "rgba(120,120,120,0.08)" }}
              content={({ active, payload }) => {
                const row = active && payload?.[0]?.payload;
                // An empty week has nothing to tell.
                if (!row || !row.total) return null;
                return (
                  <div className="rounded-lg border border-border bg-background p-2 text-xs shadow-md">
                    <p className="font-semibold">{t("weekOf", { date: day(row.monday) })} · {num(row.total, 0)}</p>
                    {DISCIPLINES.filter((d) => row[d] > 0).map((d) => (
                      <p key={d} className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: COLORS[d] }} aria-hidden="true" />
                        {t(`d_${d}`)} {num(row[d], 0)}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {shown.map((d, i) => (
              <Bar
                key={d}
                dataKey={d}
                stackId="load"
                fill={COLORS[d]}
                stroke="var(--background, #fff)"
                strokeWidth={1}
                radius={i === shown.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* The legend and the numbers in one: each discipline's share of the last four weeks. */}
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">{t("split")}</p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {shown.map((d) => {
            const r = recent.find((x) => x.discipline === d);
            return (
              <li key={d} className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: COLORS[d] }} aria-hidden="true" />
                <span className="flex-1 truncate">{t(`d_${d}`)}</span>
                <span className="tabular-nums text-muted-foreground">{r ? `${r.share} %` : "—"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">{t("how")}</p>
      {noRpe > 0 && <p className="text-xs text-muted-foreground">{t("estimated", { count: noRpe })}</p>}
    </div>
  );
}
